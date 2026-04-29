// KPIs do topo do dashboard — port do <section> de KPIs do report.html.
import type { AnalyzedAd } from "@/lib/analyzer"

function Kpi({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="glass ring-card rounded-2xl border border-white/5 p-4">
      <div className="text-xs uppercase tracking-wider text-zinc-500">{label}</div>
      <div className="mt-1 text-2xl font-bold text-zinc-100">{value}</div>
    </div>
  )
}

export function KpiCards({ ads }: { ads: AnalyzedAd[] }) {
  const total = ads.length
  const avgFit = total
    ? Math.round(ads.reduce((s, a) => s + (a.ai?.fit ?? 0), 0) / total)
    : 0
  const avgDays = total
    ? Math.round(ads.reduce((s, a) => s + (a.daysRunning ?? 0), 0) / total)
    : 0
  const topPageEntry = ads.length
    ? Object.entries(
        ads.reduce<Record<string, number>>((acc, a) => {
          acc[a.pageName] = (acc[a.pageName] ?? 0) + 1
          return acc
        }, {})
      ).sort((a, b) => b[1] - a[1])[0]
    : ["—", 0]
  const topPage = String(topPageEntry[0])

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <Kpi label="Anúncios analisados" value={total} />
      <Kpi
        label="Fit médio"
        value={
          <>
            {avgFit}
            <span className="text-zinc-400 text-base">/100</span>
          </>
        }
      />
      <Kpi
        label="Longevidade média"
        value={
          <>
            {avgDays}
            <span className="text-zinc-400 text-base"> dias</span>
          </>
        }
      />
      <Kpi
        label="Página dominante"
        value={topPage.length > 18 ? topPage.slice(0, 18) + "…" : topPage}
      />
    </div>
  )
}
