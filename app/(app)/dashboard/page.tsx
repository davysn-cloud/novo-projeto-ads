import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import Link from "next/link"
import type { Metadata } from "next"
import type { Run } from "@prisma/client"

export const metadata: Metadata = { title: "Minhas Runs" }

const STATUS_LABEL: Record<Run["status"], string> = {
  QUEUED: "Na fila",
  GENERATING_KEYWORDS: "Gerando keywords…",
  SCRAPING: "Minerando anúncios…",
  ANALYZING: "Analisando com IA…",
  DONE: "Pronto",
  FAILED: "Falhou",
}

const STATUS_COLOR: Record<Run["status"], string> = {
  QUEUED: "bg-zinc-700 text-zinc-300",
  GENERATING_KEYWORDS: "bg-accent-600/20 text-accent-400",
  SCRAPING: "bg-neon-500/20 text-neon-400",
  ANALYZING: "bg-lime-500/20 text-lime-400",
  DONE: "bg-emerald-500/20 text-emerald-400",
  FAILED: "bg-red-500/20 text-red-400",
}

function timeAgo(date: Date) {
  const secs = Math.floor((Date.now() - date.getTime()) / 1000)
  if (secs < 60) return "agora mesmo"
  if (secs < 3600) return `${Math.floor(secs / 60)}min atrás`
  if (secs < 86400) return `${Math.floor(secs / 3600)}h atrás`
  return `${Math.floor(secs / 86400)}d atrás`
}

export default async function DashboardPage() {
  const session = await auth()
  const userId = session!.user!.id

  const [runs, user] = await Promise.all([
    db.run.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    db.user.findUnique({ where: { id: userId }, select: { monthlyUsed: true, monthlyQuota: true, plan: true } }),
  ])

  const quota = user ?? { monthlyUsed: 0, monthlyQuota: 2, plan: "FREE" }

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Minhas Spy Runs</h1>
          <p className="text-sm text-zinc-400 mt-1">
            Histórico de análises de anúncios do Facebook.
          </p>
        </div>
        <Link
          href="/new"
          className="shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-accent-600 hover:bg-accent-500 text-white text-sm font-semibold transition"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Nova Spy Run
        </Link>
      </div>

      {/* Quota banner */}
      <div className="glass ring-card rounded-xl border border-white/5 p-4 mb-6 flex items-center gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-medium text-zinc-400">
              Runs este mês ({quota.plan === "FREE" ? "Free" : "Pro"})
            </span>
            <span className="text-xs font-semibold text-zinc-200">
              {quota.monthlyUsed} / {quota.monthlyQuota}
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-white/5">
            <div
              className="h-full rounded-full bg-gradient-to-r from-accent-500 to-neon-500 transition-all"
              style={{
                width: `${Math.min(100, (quota.monthlyUsed / quota.monthlyQuota) * 100)}%`,
              }}
            />
          </div>
        </div>
        {quota.plan === "FREE" && quota.monthlyUsed >= quota.monthlyQuota && (
          <span className="shrink-0 text-xs text-amber-400 font-medium">
            Quota esgotada — upgrade em breve
          </span>
        )}
      </div>

      {/* Runs list */}
      {runs.length === 0 ? (
        <div className="glass ring-card rounded-2xl border border-white/5 p-16 text-center">
          <div className="w-12 h-12 rounded-2xl bg-accent-500/10 border border-accent-500/20 grid place-items-center mx-auto mb-4">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2">
              <circle cx="11" cy="11" r="7" />
              <path d="m21 21-4.3-4.3" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-zinc-200 mb-2">Nenhuma run ainda</h2>
          <p className="text-sm text-zinc-500 mb-6">
            Crie sua primeira Spy Run para minerar e analisar anúncios do Facebook.
          </p>
          <Link
            href="/new"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent-600 hover:bg-accent-500 text-white text-sm font-semibold transition"
          >
            Criar primeira Spy Run
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {runs.map((run) => (
            <Link
              key={run.id}
              href={`/runs/${run.id}`}
              className="glass ring-card rounded-2xl border border-white/5 hover:border-accent-500/30 transition p-5 flex flex-col gap-3"
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold text-zinc-100 text-sm truncate leading-snug">
                  {run.productName}
                </h3>
                <span
                  className={`badge shrink-0 ${STATUS_COLOR[run.status]}`}
                >
                  {STATUS_LABEL[run.status]}
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs text-zinc-500 flex-wrap">
                <span className="badge bg-white/5 border border-white/10">{run.market}</span>
                {run.ticket && (
                  <span className="badge bg-white/5 border border-white/10">{run.ticket}</span>
                )}
                <span>{run.adsCount} ads · top {run.topN}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-zinc-500 mt-auto pt-1">
                <span>{timeAgo(run.createdAt)}</span>
                {run.status === "DONE" && (
                  <span className="text-accent-400 font-medium">Ver dashboard →</span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
