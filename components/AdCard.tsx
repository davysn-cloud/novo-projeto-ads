// Card de anúncio — port do template <article> de report.html para JSX.
// Server-friendly (sem useState). Mantém: ring de fit, no-referrer, insight box.
import type { AnalyzedAd } from "@/lib/analyzer"

function fitClass(fit: number): string {
  if (fit >= 90) return "text-lime-400 ring-fit-90"
  if (fit >= 70) return "text-accent-400 ring-fit-70"
  return "text-zinc-300 ring-fit-low"
}

function fitShadow(fit: number): string {
  if (fit >= 90) return "0 0 0 2px rgba(163,230,53,.45), 0 0 30px rgba(163,230,53,.25)"
  if (fit >= 70) return "0 0 0 2px rgba(167,139,250,.4), 0 0 30px rgba(167,139,250,.18)"
  return "0 0 0 2px rgba(255,255,255,.05)"
}

export function AdCard({ ad }: { ad: AnalyzedAd }) {
  const fit = ad.ai?.fit ?? 0
  const video = ad.videos?.[0]
  const image = ad.images?.[0]
  const initial = (ad.pageName || "?").slice(0, 2).toUpperCase()

  return (
    <article className="group glass ring-card rounded-2xl overflow-hidden border border-white/5 hover:border-accent-500/30 transition flex flex-col">
      {/* Mídia */}
      <div className="relative aspect-[4/5] bg-ink-800 overflow-hidden">
        {video?.url ? (
          <video
            className="absolute inset-0 w-full h-full object-cover"
            controls
            preload="metadata"
            poster={video.poster ?? undefined}
          >
            <source src={video.url} />
          </video>
        ) : image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            referrerPolicy="no-referrer"
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.02] transition"
            src={image}
            alt={ad.pageName}
            loading="lazy"
          />
        ) : (
          <div className="absolute inset-0 grid place-items-center text-zinc-600 text-xs">
            sem mídia
          </div>
        )}
      </div>

      {/* Conteúdo */}
      <div className="p-5 flex flex-col gap-3 flex-1">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent-500/40 to-neon-500/40 grid place-items-center text-xs font-bold uppercase shrink-0">
              {initial}
            </div>
            <div className="min-w-0">
              <div className="font-semibold truncate text-sm">{ad.pageName || "—"}</div>
              <div className="text-xs text-zinc-500">
                {ad.daysRunning ? `${ad.daysRunning} dias rodando` : "data n/a"}
                {ad.isActive ? " · ativo" : " · inativo"}
              </div>
            </div>
          </div>
          <div
            className={`shrink-0 w-12 h-12 rounded-full grid place-items-center bg-ink-800 text-sm font-bold ${fitClass(fit)}`}
            style={{ boxShadow: fitShadow(fit) }}
          >
            {fit}
          </div>
        </div>

        {/* Title + body */}
        {(ad.title || ad.linkDescription) && (
          <h3 className="text-sm font-semibold text-zinc-100 line-clamp-2">
            {ad.title || ad.linkDescription}
          </h3>
        )}
        <p
          className="text-sm text-zinc-300 overflow-hidden"
          style={{ display: "-webkit-box", WebkitLineClamp: 6, WebkitBoxOrient: "vertical" }}
        >
          {ad.body}
        </p>

        {/* Copy completa expandível */}
        <details className="mt-1">
          <summary className="text-xs text-accent-400 hover:text-accent-300 select-none cursor-pointer list-none">
            Ver copy completa
          </summary>
          <pre className="whitespace-pre-wrap break-words text-xs mt-2 p-3 rounded-lg bg-black/30 border border-white/5 max-h-72 overflow-auto scroll-thin font-mono">
            {ad.body || "(copy não disponível)"}
          </pre>
        </details>

        {/* Insight da IA */}
        <div className="rounded-xl p-4 bg-gradient-to-br from-accent-500/10 to-neon-500/5 border border-accent-500/20">
          <div className="flex items-center gap-2 mb-3">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
              <circle cx="12" cy="12" r="4" />
            </svg>
            <span className="text-xs font-semibold uppercase tracking-wider text-accent-400">
              Insight da IA
            </span>
            <span className="ml-auto text-[10px] text-zinc-500">
              {ad.ai?.source === "gemini" ? "Gemini" : "heurística"}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs mb-3">
            <div>
              <div className="text-zinc-500">Ângulo</div>
              <div className="font-medium text-zinc-200">{ad.ai?.angle || "—"}</div>
            </div>
            <div>
              <div className="text-zinc-500">Funil</div>
              <div className="font-medium text-zinc-200">{ad.ai?.funnel || "—"}</div>
            </div>
            <div>
              <div className="text-zinc-500">Avatar</div>
              <div className="font-medium text-zinc-200">{ad.ai?.avatar || "—"}</div>
            </div>
            <div>
              <div className="text-zinc-500">Big Idea</div>
              <div
                className="font-medium text-zinc-200 overflow-hidden"
                style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}
              >
                {ad.ai?.bigIdea || ad.ai?.angle || "—"}
              </div>
            </div>
          </div>
          {ad.ai?.insight && (
            <p className="text-sm text-zinc-300 leading-relaxed">{ad.ai.insight}</p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 mt-auto pt-2">
          <span className="badge bg-white/5 border border-white/10 text-zinc-300">
            {ad.cta || (ad.ai?.swipeReady ? "⭐ swipe-ready" : "CTA n/a")}
          </span>
          <a
            className="text-xs text-neon-400 hover:text-neon-500 inline-flex items-center gap-1"
            href={ad.libraryUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            Ver na Biblioteca
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M7 17 17 7M9 7h8v8" />
            </svg>
          </a>
        </div>
      </div>
    </article>
  )
}
