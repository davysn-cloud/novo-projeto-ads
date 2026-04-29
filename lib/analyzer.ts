// Analyzer — port TS de src/analyzer.js.
// Sem I/O de arquivo: recebe raw ads e spec como parâmetros.
// Exporta: normalizeAd, heuristicAnalyze, analyzeAd (wrapper Claude→Gemini→heurística)
import { GoogleGenerativeAI } from "@google/generative-ai"

// ─────────────────────────────────────────────
// Tipos
// ─────────────────────────────────────────────

export interface RunSpec {
  productName: string
  ticket?: string
  market: string
  language: string
  uniqueSelling?: string
  avatar: string[]
}

export interface NormalizedAd {
  id: string
  pageName: string
  pageId: string
  startDate: string | null
  endDate: string | null
  daysRunning: number
  isActive: boolean
  title: string
  body: string
  linkDescription: string
  cta: string
  linkUrl: string
  images: string[]
  videos: { url: string; poster: string | null }[]
  libraryUrl: string
}

export interface AiAnalysis {
  fit: number
  angle: string
  bigIdea?: string
  funnel: string
  avatar: string
  hookVisual?: string
  insight: string
  swipeReady?: boolean
  angles?: string[]
  funnels?: string[]
  avatars?: string[]
  source: "gemini" | "heuristic"
}

export interface AnalyzedAd extends NormalizedAd {
  ai: AiAnalysis
}

// ─────────────────────────────────────────────
// Normalização (defensiva: campos do actor variam por versão)
// ─────────────────────────────────────────────

function pick(obj: unknown, ...paths: string[]): unknown {
  for (const p of paths) {
    const val = p.split(".").reduce<unknown>((acc, k) => {
      if (acc == null || typeof acc !== "object") return null
      return (acc as Record<string, unknown>)[k] ?? null
    }, obj)
    if (val != null && val !== "") return val
  }
  return null
}

function parseDate(v: unknown): Date | null {
  if (!v) return null
  if (typeof v === "number") {
    const ms = v < 1e12 ? v * 1000 : v
    const d = new Date(ms)
    return isNaN(d.getTime()) ? null : d
  }
  if (typeof v === "string") {
    const d = new Date(v)
    return isNaN(d.getTime()) ? null : d
  }
  return null
}

export function normalizeAd(raw: unknown): NormalizedAd {
  const r = raw as Record<string, unknown>
  const snapshot = (r.snapshot ?? {}) as Record<string, unknown>
  const cards = (snapshot.cards ?? []) as Record<string, unknown>[]
  const card = cards[0] ?? {}

  const startDate = parseDate(
    pick(raw, "start_date", "startDate", "startDateString", "snapshot.creation_time")
  )
  const endDate = parseDate(pick(raw, "end_date", "endDate"))

  const isActive =
    (pick(raw, "is_active", "isActive") as boolean | null) ??
    (endDate ? endDate > new Date() : true)

  const images = ([] as unknown[])
    .concat((snapshot.images ?? []) as unknown[])
    .concat(
      cards.flatMap((c) =>
        c.original_image_url
          ? [{ original_image_url: c.original_image_url, resized_image_url: c.resized_image_url }]
          : []
      )
    )
    .map((i) => {
      const img = i as Record<string, string>
      return img.original_image_url ?? img.resized_image_url ?? img.url ?? null
    })
    .filter((x): x is string => typeof x === "string")

  const videos = ([] as unknown[])
    .concat((snapshot.videos ?? []) as unknown[])
    .concat(
      cards.flatMap((c) =>
        c.video_hd_url || c.video_sd_url
          ? [{ video_hd_url: c.video_hd_url, video_sd_url: c.video_sd_url, video_preview_image_url: c.video_preview_image_url }]
          : []
      )
    )
    .reduce<{ url: string; poster: string | null }[]>((acc, v) => {
      const vid = v as Record<string, string>
      const url = vid.video_hd_url ?? vid.video_sd_url ?? vid.url ?? null
      if (!url) return acc
      acc.push({ url, poster: vid.video_preview_image_url ?? vid.preview_image_url ?? null })
      return acc
    }, [])

  const now = new Date()
  const daysRunning = startDate
    ? Math.max(1, Math.round((now.getTime() - startDate.getTime()) / 86400000))
    : 0

  const adId =
    (pick(raw, "ad_archive_id", "adArchiveID", "id") as string | null) ??
    `ad_${Math.random().toString(36).slice(2, 10)}`

  return {
    id: String(adId),
    pageName: String(pick(raw, "page_name", "snapshot.page_name", "pageName") ?? ""),
    pageId: String(pick(raw, "page_id", "snapshot.page_id", "pageId") ?? ""),
    startDate: startDate ? startDate.toISOString() : null,
    endDate: endDate ? endDate.toISOString() : null,
    daysRunning,
    isActive: Boolean(isActive),
    title: String(pick(snapshot, "title") ?? pick(card, "title") ?? "").trim(),
    body: String(pick(snapshot, "body.text", "body.markup", "body") ?? pick(card, "body") ?? "").trim(),
    linkDescription: String(pick(snapshot, "link_description") ?? pick(card, "link_description") ?? "").trim(),
    cta: String(pick(snapshot, "cta_text") ?? pick(card, "cta_text") ?? "").trim(),
    linkUrl: String(pick(snapshot, "link_url") ?? pick(card, "link_url") ?? ""),
    images,
    videos,
    libraryUrl: `https://www.facebook.com/ads/library/?id=${adId}`,
  }
}

// ─────────────────────────────────────────────
// Heurística PT-BR
// ─────────────────────────────────────────────

const ANGLE_LEXICON = [
  { angle: "Autoridade / Prova social", regex: /\b(\+?\d+\s?(clientes|alunos|pacientes)|cases?|resultado|aprovad[oa]|certificad[oa]|premiad[oa])\b/i },
  { angle: "Urgência / Escassez", regex: /\b(últim[ao]s? vagas?|hoje|agora|expira|só hoje|por tempo limitado|últim[ao]s? dias?)\b/i },
  { angle: "Transformação / Antes-Depois", regex: /\b(transform|de \w+ para \w+|antes|depois|virada|mudança)\b/i },
  { angle: "Curiosidade / Segredo", regex: /\b(segred|método|fórmula|truque|ninguém te conta|descobri)\b/i },
  { angle: "Dor / Frustração", regex: /\b(cansad[oa]|sofr|prejuízo|fracass|trav|estagnad)\b/i },
  { angle: "Promessa de resultado", regex: /\b(em \d+ dias?|em \d+ horas?|garantid|sem precisar|do zero|escala|7 dígitos|6 dígitos)\b/i },
  { angle: "Especificidade numérica", regex: /\b(R\$ ?\d|\d+%|\d+x|\d+ mil)\b/i },
]

const FUNNEL_LEXICON = [
  { funnel: "WhatsApp direto", regex: /\b(whats|whatsapp|wa\.me|api\.whatsapp)\b/i },
  { funnel: "Lead Magnet / Material gratuito", regex: /\b(grátis|gratuit|baix[ae]|ebook|pdf|planilha|checklist)\b/i },
  { funnel: "Webinar / Aula gratuita", regex: /\b(aula|webinar|live|masterclass|treinamento)\b/i },
  { funnel: "VSL / Vídeo de vendas", regex: /\b(assista|vídeo|vsl|veja o vídeo)\b/i },
  { funnel: "Quiz / Diagnóstico", regex: /\b(quiz|diagnóstico|teste|descubra seu)\b/i },
  { funnel: "Aplicação / Vagas limitadas", regex: /\b(aplica|inscreva-se|preencha|formulário|seleção)\b/i },
]

const AVATAR_LEXICON = [
  { avatar: "Infoprodutor / Coach", regex: /\b(curso|infoprodut|mentoria|coach|expert|hotmart|kiwify|eduzz)\b/i },
  { avatar: "Profissional liberal", regex: /\b(médic|dentist|advogad|nutri|psicólog|fisioterapeuta|estética|clínic|consultóri)\b/i },
  { avatar: "E-commerce / Lojista", regex: /\b(loja|e-?commerce|shopify|nuvemshop|produto físico|drop)\b/i },
  { avatar: "Agência / Gestor de tráfego", regex: /\b(agência|gestor de tráfego|tráfego pago|mídia paga|social media)\b/i },
  { avatar: "Pequeno empresário local", regex: /\b(empresa|negócio local|sua empresa|empreendedor)\b/i },
]

export function heuristicAnalyze(ad: NormalizedAd, spec?: RunSpec): AiAnalysis {
  const text = `${ad.title}\n${ad.body}\n${ad.linkDescription}\n${ad.cta}`.toLowerCase()

  const angles = ANGLE_LEXICON.filter((a) => a.regex.test(text)).map((a) => a.angle)
  const funnels = FUNNEL_LEXICON.filter((f) => f.regex.test(text)).map((f) => f.funnel)
  const avatars = AVATAR_LEXICON.filter((a) => a.regex.test(text)).map((a) => a.avatar)

  let fit = 30
  const NICHE_HITS = /\b(landing page|criação de site|site profissional|página de vendas|página de captura|design)\b/i
  if (NICHE_HITS.test(text)) fit += 25
  if (avatars.length > 0) fit += 15 * Math.min(avatars.length, 2)
  if (angles.length >= 2) fit += 10
  if (ad.daysRunning >= 60) fit += 10
  if (ad.daysRunning >= 180) fit += 5
  if (funnels.length > 0) fit += 5
  fit = Math.min(99, fit)

  const angle = angles[0] ?? "Direto / Oferta racional"
  const funnel = funnels[0] ?? "Tráfego direto para LP"
  const avatar = avatars[0] ?? "Não identificado"
  const uniqueSelling = spec?.uniqueSelling ?? "velocidade de entrega (48-72h)"

  const longevity =
    ad.daysRunning >= 180 ? "extremamente validado" : ad.daysRunning >= 60 ? "validado" : "em teste"
  const insight = `Anúncio ${longevity} (${ad.daysRunning} dias rodando). Ângulo: ${angle}. Funil: ${funnel}. Avatar: ${avatar}. Fit ${fit}/100 — observe a estrutura da copy e adapte ao seu diferencial de ${uniqueSelling}.`

  return { fit, angle, funnel, avatar, insight, angles, funnels, avatars, source: "heuristic" }
}

// ─────────────────────────────────────────────
// Análise via Gemini
// ─────────────────────────────────────────────

const GEMINI_RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    fit: { type: "integer" },
    angle: { type: "string" },
    bigIdea: { type: "string" },
    funnel: { type: "string" },
    avatar: { type: "string" },
    hookVisual: { type: "string" },
    insight: { type: "string" },
    swipeReady: { type: "boolean" },
  },
  required: ["fit", "angle", "bigIdea", "funnel", "avatar", "insight", "swipeReady"],
}

async function geminiAnalyze(ad: NormalizedAd, spec: RunSpec): Promise<AiAnalysis> {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
  const model = genAI.getGenerativeModel({
    model: process.env.GEMINI_MODEL ?? "gemini-2.5-flash",
  })

  const prompt = `Você é estrategista de copy e tráfego pago no mercado brasileiro.
Analise UM anúncio do Facebook em relação à oferta do usuário. JSON apenas.

OFERTA DO USUÁRIO:
- Produto: ${spec.productName}
- Ticket: ${spec.ticket ?? "não informado"}
- Mercado: ${spec.market} (${spec.language})
- Diferencial: ${spec.uniqueSelling ?? "não informado"}
- Avatar: ${spec.avatar.join("; ") || "não informado"}

ANÚNCIO:
Página: ${ad.pageName}
Dias rodando: ${ad.daysRunning}
Título: ${ad.title || "(sem título)"}
CTA: ${ad.cta || "(sem CTA)"}
Copy: """${ad.body || "(sem copy)"}"""
Descrição: ${ad.linkDescription || "(vazia)"}
URL: ${ad.linkUrl || "(n/a)"}`

  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.4,
      maxOutputTokens: 800,
      responseMimeType: "application/json",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      responseSchema: GEMINI_RESPONSE_SCHEMA as any,
    },
  })

  const text = result.response.text()
  const m = text.match(/\{[\s\S]*\}/)
  if (!m) throw new Error("Gemini: JSON não encontrado na resposta")
  return { ...JSON.parse(m[0]) as AiAnalysis, source: "gemini" }
}

// ─────────────────────────────────────────────
// Wrapper público
// ─────────────────────────────────────────────

export async function analyzeAd(ad: NormalizedAd, spec: RunSpec): Promise<AnalyzedAd> {
  const useGemini = !!process.env.GEMINI_API_KEY
  try {
    const ai = useGemini ? await geminiAnalyze(ad, spec) : heuristicAnalyze(ad, spec)
    return { ...ad, ai }
  } catch (err) {
    console.warn(`[analyzer] fallback heurística: ${(err as Error).message.slice(0, 60)}`)
    return { ...ad, ai: heuristicAnalyze(ad, spec) }
  }
}
