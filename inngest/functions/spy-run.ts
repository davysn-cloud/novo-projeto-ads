// Worker multi-step com retry idempotente, error handling e refund de quota.
import { inngest } from "@/inngest/client"
import { db } from "@/lib/db"
import { generateKeywords } from "@/lib/keywords"
import { scrapeAds } from "@/lib/apify"
import { normalizeAd, analyzeAd } from "@/lib/analyzer"
import type { NormalizedAd, AnalyzedAd, RunSpec } from "@/lib/analyzer"
import { NonRetriableError } from "inngest"

export const spyRunFunction = inngest.createFunction(
  {
    id: "spy-run",
    name: "Spy Run — pipeline completo",
    retries: 2,
    onFailure: async ({ event, error }) => {
      // Marca como FAILED e devolve quota — único lugar onde isso roda após esgotar retries
      const runId = (event.data as { event: { data: { runId: string } } }).event.data.runId
      const run = await db.run.findUnique({ where: { id: runId } })
      if (!run) return

      await db.$transaction([
        db.run.update({
          where: { id: runId },
          data: {
            status: "FAILED",
            errorMessage: String(error?.message ?? error).slice(0, 1000),
            finishedAt: new Date(),
          },
        }),
        // Refund: devolve a quota consumida no POST /api/runs
        db.user.update({
          where: { id: run.userId },
          data: { monthlyUsed: { decrement: 1 } },
        }),
      ])
      console.error(`[spy-run] FAILED runId=${runId}: ${error?.message}`)
    },
  },
  { event: "spy/run.created" },
  async ({ event, step }) => {
    const { runId } = event.data as { runId: string }

    // Marca como iniciado (sem step.run pra não criar side-effect a cada retry)
    await db.run.update({
      where: { id: runId },
      data: { startedAt: new Date() },
    }).catch(() => {})

    // ── Step 1: Keywords (skip se já vieram do form preview) ─────────
    const { keywords, spec } = await step.run("generate-keywords", async () => {
      const run = await db.run.findUnique({ where: { id: runId } })
      if (!run) throw new NonRetriableError(`Run ${runId} não encontrada`)

      const runSpec: RunSpec = {
        productName: run.productName,
        ticket: run.ticket ?? undefined,
        market: run.market,
        language: run.language,
        uniqueSelling: run.uniqueSelling ?? undefined,
        avatar: run.avatar,
      }

      // Se o form já passou keywords (Fase 4), pula a geração
      if (run.keywords.length > 0) {
        await db.run.update({
          where: { id: runId },
          data: { status: "GENERATING_KEYWORDS" },
        })
        return { keywords: run.keywords, spec: runSpec }
      }

      await db.run.update({
        where: { id: runId },
        data: { status: "GENERATING_KEYWORDS" },
      })

      const kw = await generateKeywords(runSpec)
      if (kw.length === 0) {
        throw new NonRetriableError("Falha ao gerar keywords — IA retornou lista vazia")
      }
      await db.run.update({ where: { id: runId }, data: { keywords: kw } })
      return { keywords: kw, spec: runSpec }
    })

    // ── Step 2: Scrape Apify ──────────────────────────────────────────
    const rawAds = (await step.run("scrape-apify", async () => {
      const run = await db.run.findUnique({ where: { id: runId } })
      if (!run) throw new NonRetriableError(`Run ${runId} não encontrada`)

      await db.run.update({ where: { id: runId }, data: { status: "SCRAPING" } })

      const ads = await scrapeAds(keywords, {
        totalCount: run.adsCount,
        market: spec.market,
      })

      // Persiste raw ads no DB (para auditoria e re-análise futura sem novo scrape)
      await db.run.update({
        where: { id: runId },
        // Cast: Prisma Json aceita arrays/objects
        data: { rawAds: ads as unknown as object[] },
      })
      return ads
    })) as unknown[]

    // ── Step 3: Normalizar + analisar (batches de 5 concorrentes) ─────
    const analyzedAds = await step.run("analyze-ads", async () => {
      const run = await db.run.findUnique({ where: { id: runId } })
      if (!run) throw new NonRetriableError(`Run ${runId} não encontrada`)

      await db.run.update({ where: { id: runId }, data: { status: "ANALYZING" } })

      const normalized: NormalizedAd[] = (rawAds as unknown[])
        .map(normalizeAd)
        .filter((a) => a.body || a.title || a.images.length > 0 || a.videos.length > 0)

      const validated = normalized
        .filter((a) => a.isActive)
        .sort((a, b) => b.daysRunning - a.daysRunning)
        .slice(0, run.topN)

      const results: AnalyzedAd[] = []
      for (let i = 0; i < validated.length; i += 5) {
        const batch = validated.slice(i, i + 5)
        const analyzed = await Promise.all(batch.map((ad) => analyzeAd(ad, spec)))
        results.push(...analyzed)
      }

      results.sort((a, b) => (b.ai?.fit ?? 0) - (a.ai?.fit ?? 0))
      return results
    })

    // ── Step 4: Finalizar ────────────────────────────────────────────
    await step.run("finalize", async () => {
      await db.run.update({
        where: { id: runId },
        data: {
          status: "DONE",
          analyzedAds: analyzedAds as unknown as object[],
          finishedAt: new Date(),
        },
      })
    })

    return { runId, adsAnalyzed: analyzedAds.length }
  }
)
