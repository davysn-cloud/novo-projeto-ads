// Worker multi-step — fase 5 implementa a lógica completa.
// Estrutura dos steps já definida; cada step atualiza o status no DB.
import { inngest } from "@/inngest/client"
import { db } from "@/lib/db"
import { generateKeywords } from "@/lib/keywords"
import { scrapeAds } from "@/lib/apify"
import { normalizeAd, analyzeAd } from "@/lib/analyzer"
import type { NormalizedAd } from "@/lib/analyzer"

export const spyRunFunction = inngest.createFunction(
  {
    id: "spy-run",
    name: "Spy Run — pipeline completo",
    retries: 2,
  },
  { event: "spy/run.created" },
  async ({ event, step }) => {
    const { runId } = event.data as { runId: string }

    // ── Step 1: Gerar keywords ──────────────────────────────────────────────
    const { keywords, spec } = await step.run("generate-keywords", async () => {
      await db.run.update({ where: { id: runId }, data: { status: "GENERATING_KEYWORDS", startedAt: new Date() } })

      const run = await db.run.findUniqueOrThrow({ where: { id: runId } })
      const runSpec = {
        productName: run.productName,
        ticket: run.ticket ?? undefined,
        market: run.market,
        language: run.language,
        uniqueSelling: run.uniqueSelling ?? undefined,
        avatar: run.avatar,
      }

      const kw = await generateKeywords(runSpec)
      await db.run.update({ where: { id: runId }, data: { keywords: kw } })
      return { keywords: kw, spec: runSpec }
    })

    // ── Step 2: Scrape Apify ────────────────────────────────────────────────
    const rawAds = await step.run("scrape-apify", async () => {
      const run = await db.run.findUniqueOrThrow({ where: { id: runId } })
      await db.run.update({ where: { id: runId }, data: { status: "SCRAPING" } })
      const ads = await scrapeAds(keywords, { totalCount: run.adsCount, market: spec.market })
      await db.run.update({ where: { id: runId }, data: { rawAds: ads as object[] } })
      return ads
    })

    // ── Step 3: Normalizar + analisar com IA ────────────────────────────────
    const analyzedAds = await step.run("analyze-ads", async () => {
      const run = await db.run.findUniqueOrThrow({ where: { id: runId } })
      await db.run.update({ where: { id: runId }, data: { status: "ANALYZING" } })

      const normalized: NormalizedAd[] = (rawAds as unknown[])
        .map(normalizeAd)
        .filter((a) => a.body || a.title || a.images.length > 0 || a.videos.length > 0)

      // Filtra ativos mais antigos (validados)
      const validated = normalized
        .filter((a) => a.isActive)
        .sort((a, b) => b.daysRunning - a.daysRunning)
        .slice(0, run.topN)

      // Analisa em batches de 5 (não sobrecarregar Gemini)
      const results = []
      for (let i = 0; i < validated.length; i += 5) {
        const batch = validated.slice(i, i + 5)
        const analyzed = await Promise.all(batch.map((ad) => analyzeAd(ad, spec)))
        results.push(...analyzed)
      }

      results.sort((a, b) => (b.ai?.fit ?? 0) - (a.ai?.fit ?? 0))
      return results
    })

    // ── Step 4: Finalizar ────────────────────────────────────────────────────
    await step.run("finalize", async () => {
      await db.run.update({
        where: { id: runId },
        data: {
          status: "DONE",
          analyzedAds: analyzedAds as object[],
          finishedAt: new Date(),
        },
      })
    })

    return { runId, adsAnalyzed: analyzedAds.length }
  }
)
