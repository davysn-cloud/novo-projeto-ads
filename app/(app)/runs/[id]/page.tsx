import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { notFound } from "next/navigation"
import Link from "next/link"
import type { Metadata } from "next"
import type { Run } from "@prisma/client"

type Props = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const session = await auth()
  const run = await db.run.findFirst({ where: { id, userId: session?.user?.id ?? "" } })
  return { title: run ? `Run: ${run.productName}` : "Run não encontrada" }
}

const STEPS = [
  { key: "GENERATING_KEYWORDS", label: "Keywords" },
  { key: "SCRAPING", label: "Minerando" },
  { key: "ANALYZING", label: "Analisando" },
  { key: "DONE", label: "Pronto" },
] as const

type StepKey = (typeof STEPS)[number]["key"] | "QUEUED" | "FAILED"

function currentStep(status: Run["status"]): number {
  const idx = STEPS.findIndex((s) => s.key === status)
  return idx === -1 ? (status === "DONE" ? STEPS.length : 0) : idx
}

export default async function RunPage({ params }: Props) {
  const { id } = await params
  const session = await auth()
  const run = await db.run.findFirst({
    where: { id, userId: session?.user?.id ?? "" },
  })

  if (!run) notFound()

  const isDone = run.status === "DONE"
  const isFailed = run.status === "FAILED"
  const isProcessing = !isDone && !isFailed
  const step = currentStep(run.status)

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Link href="/dashboard" className="text-xs text-zinc-500 hover:text-zinc-300 inline-flex items-center gap-1 mb-3">
          ← Minhas Runs
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-zinc-100">{run.productName}</h1>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="badge bg-white/5 border border-white/10 text-zinc-400">{run.market}</span>
              {run.ticket && (
                <span className="badge bg-white/5 border border-white/10 text-zinc-400">{run.ticket}</span>
              )}
              <span className="text-xs text-zinc-500">
                {run.adsCount} ads · top {run.topN} validados
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Status card */}
      {isProcessing && (
        <div className="glass ring-card rounded-2xl border border-white/5 p-6 mb-8">
          <div className="flex items-center gap-3 mb-6">
            {/* Spinner */}
            <div className="w-5 h-5 rounded-full border-2 border-accent-500/30 border-t-accent-400 animate-spin" />
            <p className="text-sm font-medium text-zinc-200">
              Processando sua Spy Run…
            </p>
            <p className="text-xs text-zinc-500 ml-auto">
              Atualiza automaticamente a cada 3s — fase 6
            </p>
          </div>

          {/* Progress steps */}
          <div className="flex items-center gap-2">
            {STEPS.map((s, i) => (
              <div key={s.key} className="flex items-center gap-2 flex-1 last:flex-none">
                <div
                  className={`w-7 h-7 rounded-full grid place-items-center text-xs font-bold transition
                    ${i < step ? "bg-accent-500 text-white" : i === step ? "bg-accent-500/20 text-accent-400 ring-1 ring-accent-500" : "bg-white/5 text-zinc-600"}`}
                >
                  {i < step ? "✓" : i + 1}
                </div>
                <span className={`text-xs ${i <= step ? "text-zinc-300" : "text-zinc-600"}`}>
                  {s.label}
                </span>
                {i < STEPS.length - 1 && (
                  <div className={`flex-1 h-px ${i < step ? "bg-accent-500/40" : "bg-white/5"}`} />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Failed state */}
      {isFailed && (
        <div className="glass ring-card rounded-2xl border border-red-500/20 p-6 mb-8">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-red-500/10 grid place-items-center shrink-0">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-red-400">Run falhou</p>
              {run.errorMessage && (
                <p className="text-xs text-zinc-500 mt-1 font-mono">{run.errorMessage}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Done — dashboard (Phase 3 vai adicionar AdGrid aqui) */}
      {isDone && (
        <div className="glass ring-card rounded-2xl border border-white/5 p-8 text-center">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 grid place-items-center mx-auto mb-4">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-zinc-100 mb-2">Análise concluída!</h2>
          <p className="text-sm text-zinc-400">
            O dashboard com os cards de anúncios vai aparecer aqui na <strong className="text-zinc-200">Fase 3</strong>.
          </p>
        </div>
      )}

      {/* Run spec summary */}
      <div className="mt-8 glass ring-card rounded-xl border border-white/5 p-5">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-4">Spec da Run</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
          {run.uniqueSelling && (
            <div>
              <div className="text-xs text-zinc-500 mb-0.5">Diferencial</div>
              <div className="text-zinc-300">{run.uniqueSelling}</div>
            </div>
          )}
          {run.avatar.length > 0 && (
            <div>
              <div className="text-xs text-zinc-500 mb-0.5">Avatar</div>
              <div className="text-zinc-300">{run.avatar.join(", ")}</div>
            </div>
          )}
          {run.keywords.length > 0 && (
            <div className="col-span-full">
              <div className="text-xs text-zinc-500 mb-1.5">Keywords usadas</div>
              <div className="flex flex-wrap gap-1.5">
                {run.keywords.map((kw) => (
                  <span key={kw} className="badge bg-accent-500/10 border border-accent-500/20 text-accent-400">
                    {kw}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
