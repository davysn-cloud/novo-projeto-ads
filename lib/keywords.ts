// Gerador dinâmico de keywords via Gemini — substitui o array hardcoded do config.js.
import { GoogleGenerativeAI } from "@google/generative-ai"
import type { RunSpec } from "@/lib/analyzer"

const KEYWORDS_RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    keywords: {
      type: "array",
      items: { type: "string" },
      description: "12-18 palavras-chave estratégicas divididas em 3 camadas",
    },
    rationale: {
      type: "string",
      description: "Breve justificativa das camadas escolhidas (1-2 frases)",
    },
  },
  required: ["keywords"],
}

export async function generateKeywords(spec: RunSpec): Promise<string[]> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    console.warn("[keywords] GEMINI_API_KEY ausente — usando keywords de fallback")
    return buildFallbackKeywords(spec)
  }

  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({
    model: process.env.GEMINI_MODEL ?? "gemini-2.5-flash",
  })

  const prompt = `Você é um especialista em marketing digital e espionagem de anúncios.
Gere 12-18 palavras-chave para buscar anúncios relevantes na Biblioteca de Anúncios do Facebook.

PRODUTO/SERVIÇO: ${spec.productName}
MERCADO: ${spec.market} (${spec.language})
DIFERENCIAL: ${spec.uniqueSelling ?? "não informado"}
AVATAR: ${spec.avatar.join("; ") || "geral"}
TICKET: ${spec.ticket ?? "não informado"}

ESTRUTURA OBRIGATÓRIA:
- Camada 1 (4-6 keywords): concorrência direta — mesma oferta
- Camada 2 (4-6 keywords): avatar — quem compra o produto (pelo que eles pesquisam/problema)
- Camada 3 (3-6 keywords): adjacentes — serviços/produtos que a mesma persona consome

Retorne as keywords em ${spec.language}, otimizadas para o mercado ${spec.market}.
Não use # nem prefixos de camada no texto das keywords.`

  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 600,
      responseMimeType: "application/json",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      responseSchema: KEYWORDS_RESPONSE_SCHEMA as any,
    },
  })

  const text = result.response.text()
  const m = text.match(/\{[\s\S]*\}/)
  if (!m) {
    console.warn("[keywords] JSON não encontrado — usando fallback")
    return buildFallbackKeywords(spec)
  }

  const parsed = JSON.parse(m[0]) as { keywords: string[] }
  const kws = parsed.keywords?.filter((k) => typeof k === "string" && k.trim()) ?? []
  return kws.length >= 5 ? kws : buildFallbackKeywords(spec)
}

// Fallback determinístico quando não há Gemini
function buildFallbackKeywords(spec: RunSpec): string[] {
  const name = spec.productName.toLowerCase()
  const base: string[] = [name]

  if (/landing page|lp/i.test(name))
    base.push("criação de landing page", "landing page profissional", "página de vendas", "página de captura")
  if (/site|website/i.test(name))
    base.push("criação de site", "site profissional", "site para empresa")
  if (/marketing|tráfego/i.test(name))
    base.push("tráfego pago", "gestão de tráfego", "marketing digital")
  if (/design/i.test(name))
    base.push("design gráfico", "identidade visual", "branding")

  // Genéricos de negócio digital
  base.push("vendas online", "marketing digital", "crescimento de negócio")

  return [...new Set(base)].slice(0, 15)
}
