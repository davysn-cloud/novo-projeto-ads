// Utilitários para construir URLs da Biblioteca de Anúncios do Facebook.
// Preservado de src/config.js — agora paramétrico (sem NICHE hardcoded).

export function buildAdLibraryUrl(
  keyword: string,
  { country = "BR", activeStatus = "active" }: { country?: string; activeStatus?: string } = {}
): string {
  const params = new URLSearchParams({
    active_status: activeStatus,
    ad_type: "all",
    country,
    q: keyword,
    search_type: "keyword_unordered",
    media_type: "all",
  })
  return `https://www.facebook.com/ads/library/?${params.toString()}`
}

export function planScrape({
  totalCount = 100,
  keywords,
  market = "BR",
}: {
  totalCount?: number
  keywords: string[]
  market?: string
}): {
  urls: { url: string }[]
  limitPerSource: number
  count: number
} {
  const perKeyword = Math.max(5, Math.ceil(totalCount / keywords.length))
  return {
    urls: keywords.map((q) => ({ url: buildAdLibraryUrl(q, { country: market }) })),
    limitPerSource: perKeyword,
    count: totalCount,
  }
}
