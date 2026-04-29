// Grid + filtros (busca, fit, mídia, sort) — port do <script> client-side de report.html.
"use client"

import { useMemo, useState } from "react"
import type { AnalyzedAd } from "@/lib/analyzer"
import { AdCard } from "./AdCard"

type SortKey = "fit" | "days" | "page"
type MediaFilter = "all" | "video" | "image"

export function AdGrid({ ads }: { ads: AnalyzedAd[] }) {
  const [q, setQ] = useState("")
  const [minFit, setMinFit] = useState(0)
  const [media, setMedia] = useState<MediaFilter>("all")
  const [sort, setSort] = useState<SortKey>("fit")

  const filtered = useMemo(() => {
    let list = ads.filter((a) => (a.ai?.fit ?? 0) >= minFit)
    if (media === "video") list = list.filter((a) => a.videos?.length > 0)
    if (media === "image") list = list.filter((a) => !a.videos?.length && a.images?.length > 0)
    if (q.trim()) {
      const term = q.trim().toLowerCase()
      list = list.filter((a) => {
        const blob = [
          a.pageName,
          a.title,
          a.body,
          a.cta,
          a.ai?.angle,
          a.ai?.bigIdea,
          a.ai?.avatar,
          a.ai?.funnel,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
        return blob.includes(term)
      })
    }
    list = [...list]
    if (sort === "fit") list.sort((a, b) => (b.ai?.fit ?? 0) - (a.ai?.fit ?? 0))
    if (sort === "days") list.sort((a, b) => (b.daysRunning ?? 0) - (a.daysRunning ?? 0))
    if (sort === "page") list.sort((a, b) => (a.pageName ?? "").localeCompare(b.pageName ?? ""))
    return list
  }, [ads, q, minFit, media, sort])

  return (
    <div>
      {/* Filter bar — sticky */}
      <div className="sticky top-14 z-20 -mx-6 px-6 py-4 bg-ink-950/70 backdrop-blur border-y border-white/5 mb-6">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[220px] relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar copy, página, CTA, ângulo…"
              className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white/5 border border-white/10 focus:outline-none focus:ring-2 focus:ring-accent-500/40 placeholder:text-zinc-500 text-sm"
            />
          </div>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="py-2.5 px-3 rounded-xl bg-white/5 border border-white/10 text-sm"
          >
            <option value="fit">Ordenar: Fit ↓</option>
            <option value="days">Ordenar: Dias ↓</option>
            <option value="page">Ordenar: Página A→Z</option>
          </select>
          <select
            value={String(minFit)}
            onChange={(e) => setMinFit(Number(e.target.value))}
            className="py-2.5 px-3 rounded-xl bg-white/5 border border-white/10 text-sm"
          >
            <option value="0">Todos os fits</option>
            <option value="70">Fit ≥ 70</option>
            <option value="80">Fit ≥ 80</option>
            <option value="90">Fit ≥ 90</option>
          </select>
          <select
            value={media}
            onChange={(e) => setMedia(e.target.value as MediaFilter)}
            className="py-2.5 px-3 rounded-xl bg-white/5 border border-white/10 text-sm"
          >
            <option value="all">Mídia: todas</option>
            <option value="video">Apenas vídeo</option>
            <option value="image">Apenas imagem</option>
          </select>
          <span className="text-xs text-zinc-500 ml-auto">
            {filtered.length} de {ads.length}
          </span>
        </div>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="text-center text-zinc-500 py-16">
          Nenhum anúncio bate com seus filtros.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((ad) => (
            <AdCard key={ad.id} ad={ad} />
          ))}
        </div>
      )}
    </div>
  )
}
