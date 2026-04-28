// Analyzer — normaliza os ads, filtra os TOP_N rodando há mais tempo (validados)
// e roda análise: score de fit + ângulo de venda + funil + avatar.
// Usa Claude API se ANTHROPIC_API_KEY estiver setado; caso contrário, heurística PT-BR.

import 'dotenv/config';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { NICHE } from './config.js';

const RAW_PATH = path.resolve('data/raw_ads.json');
const OUT_PATH = path.resolve('data/analyzed_ads.json');

// ---------- Normalização (defensiva: campos do actor variam por versão) ----------

function pick(obj, ...paths) {
  for (const p of paths) {
    const val = p.split('.').reduce((acc, k) => (acc == null ? acc : acc[k]), obj);
    if (val != null && val !== '') return val;
  }
  return null;
}

function normalize(raw) {
  const snapshot = raw.snapshot || {};
  const cards = snapshot.cards || [];
  const card = cards[0] || {};

  // Datas: o actor às vezes retorna unix timestamp em segundos, às vezes ISO.
  const startRaw = pick(raw, 'start_date', 'startDate', 'startDateString', 'snapshot.creation_time');
  const endRaw = pick(raw, 'end_date', 'endDate');
  const startDate = parseDate(startRaw);
  const endDate = parseDate(endRaw);

  const isActive =
    pick(raw, 'is_active', 'isActive') ?? (endDate ? endDate > new Date() : true);

  // Mídia
  const images = []
    .concat(snapshot.images || [])
    .concat(cards.flatMap((c) => c.original_image_url ? [{ original_image_url: c.original_image_url, resized_image_url: c.resized_image_url }] : []))
    .map((i) => i.original_image_url || i.resized_image_url || i.url)
    .filter(Boolean);

  const videos = []
    .concat(snapshot.videos || [])
    .concat(cards.flatMap((c) => c.video_hd_url || c.video_sd_url ? [{ video_hd_url: c.video_hd_url, video_sd_url: c.video_sd_url, video_preview_image_url: c.video_preview_image_url }] : []))
    .map((v) => ({
      url: v.video_hd_url || v.video_sd_url || v.url,
      poster: v.video_preview_image_url || v.preview_image_url || null,
    }))
    .filter((v) => v.url);

  // Copy
  const bodyText = pick(snapshot, 'body.text', 'body.markup', 'body') || pick(card, 'body') || '';
  const title = pick(snapshot, 'title') || pick(card, 'title') || '';
  const linkDescription = pick(snapshot, 'link_description') || pick(card, 'link_description') || '';
  const cta = pick(snapshot, 'cta_text') || pick(card, 'cta_text') || '';
  const linkUrl = pick(snapshot, 'link_url') || pick(card, 'link_url') || '';
  const pageName = pick(raw, 'page_name', 'snapshot.page_name', 'pageName') || '';
  const pageId = pick(raw, 'page_id', 'snapshot.page_id', 'pageId') || '';

  // Longevidade em dias
  const now = new Date();
  const daysRunning = startDate ? Math.max(1, Math.round((now - startDate) / 86400000)) : 0;

  return {
    id: pick(raw, 'ad_archive_id', 'adArchiveID', 'id') || cryptoRandomId(),
    pageName,
    pageId,
    startDate: startDate ? startDate.toISOString() : null,
    endDate: endDate ? endDate.toISOString() : null,
    daysRunning,
    isActive: !!isActive,
    title: String(title || '').trim(),
    body: String(bodyText || '').trim(),
    linkDescription: String(linkDescription || '').trim(),
    cta: String(cta || '').trim(),
    linkUrl,
    images,
    videos,
    libraryUrl: `https://www.facebook.com/ads/library/?id=${pick(raw, 'ad_archive_id', 'adArchiveID') || ''}`,
  };
}

function parseDate(v) {
  if (!v) return null;
  if (typeof v === 'number') {
    // unix seconds vs ms
    const ms = v < 1e12 ? v * 1000 : v;
    const d = new Date(ms);
    return isNaN(d) ? null : d;
  }
  const d = new Date(v);
  return isNaN(d) ? null : d;
}

function cryptoRandomId() {
  return 'ad_' + Math.random().toString(36).slice(2, 10);
}

// ---------- Heurística PT-BR (fallback sem Claude) ----------

const ANGLE_LEXICON = [
  { angle: 'Autoridade / Prova social', regex: /\b(\+?\d+\s?(clientes|alunos|pacientes)|cases?|resultado|aprovad[oa]|certificad[oa]|premiad[oa])\b/i },
  { angle: 'Urgência / Escassez', regex: /\b(últim[ao]s? vagas?|hoje|agora|expira|só hoje|por tempo limitado|últim[ao]s? dias?)\b/i },
  { angle: 'Transformação / Antes-Depois', regex: /\b(transform|de \w+ para \w+|antes|depois|virada|mudança)\b/i },
  { angle: 'Curiosidade / Segredo', regex: /\b(segred|método|fórmula|truque|ninguém te conta|descobri)\b/i },
  { angle: 'Dor / Frustração', regex: /\b(cansad[oa]|sofr|prejuízo|fracass|trav|estagnad)\b/i },
  { angle: 'Promessa de resultado', regex: /\b(em \d+ dias?|em \d+ horas?|garantid|sem precisar|do zero|escala|7 dígitos|6 dígitos)\b/i },
  { angle: 'Especificidade numérica', regex: /\b(R\$ ?\d|\d+%|\d+x|\d+ mil)\b/i },
];

const FUNNEL_LEXICON = [
  { funnel: 'WhatsApp direto', regex: /\b(whats|whatsapp|chamar no whats|wa\.me|api\.whatsapp)\b/i },
  { funnel: 'Lead Magnet / Material gratuito', regex: /\b(grátis|gratuit|baix[ae]|ebook|pdf|planilha|checklist)\b/i },
  { funnel: 'Webinar / Aula gratuita', regex: /\b(aula|webinar|live|masterclass|treinamento)\b/i },
  { funnel: 'VSL / Vídeo de vendas', regex: /\b(assista|vídeo|vsl|veja o vídeo)\b/i },
  { funnel: 'Quiz / Diagnóstico', regex: /\b(quiz|diagnóstico|teste|descubra seu)\b/i },
  { funnel: 'Aplicação / Vagas limitadas', regex: /\b(aplica|inscreva-se|preencha|formulário|seleção)\b/i },
];

const AVATAR_LEXICON = [
  { avatar: 'Infoprodutor / Coach', regex: /\b(curso|infoprodut|mentoria|coach|expert|hotmart|kiwify|eduzz)\b/i },
  { avatar: 'Profissional liberal', regex: /\b(médic|dentist|advogad|nutri|psicólog|fisioterapeuta|estética|clínic|consultóri)\b/i },
  { avatar: 'E-commerce / Lojista', regex: /\b(loja|e-?commerce|shopify|nuvemshop|produto físico|drop)\b/i },
  { avatar: 'Agência / Gestor de tráfego', regex: /\b(agência|gestor de tráfego|tráfego pago|mídia paga|social media)\b/i },
  { avatar: 'Pequeno empresário local', regex: /\b(empresa|negócio local|sua empresa|empreendedor)\b/i },
];

function heuristicAnalyze(ad) {
  const text = `${ad.title}\n${ad.body}\n${ad.linkDescription}\n${ad.cta}`.toLowerCase();

  const angles = ANGLE_LEXICON.filter((a) => a.regex.test(text)).map((a) => a.angle);
  const funnels = FUNNEL_LEXICON.filter((f) => f.regex.test(text)).map((f) => f.funnel);
  const avatars = AVATAR_LEXICON.filter((a) => a.regex.test(text)).map((a) => a.avatar);

  // Score de fit: presença de avatar do produto + sinais de "criação de site/LP" + diferencial
  let fit = 30;
  const NICHE_HITS = /\b(landing page|criação de site|site profissional|página de vendas|página de captura|design)\b/i;
  if (NICHE_HITS.test(text)) fit += 25;
  if (avatars.length > 0) fit += 15 * Math.min(avatars.length, 2);
  if (angles.length >= 2) fit += 10;
  if (ad.daysRunning >= 60) fit += 10;
  if (ad.daysRunning >= 180) fit += 5;
  if (funnels.length > 0) fit += 5;
  fit = Math.min(99, fit);

  const angle = angles[0] || 'Direto / Oferta racional';
  const funnel = funnels[0] || 'Tráfego direto para LP';
  const avatar = avatars[0] || 'Não identificado';

  const insight = buildHeuristicInsight({ ad, angle, funnel, avatar, fit });

  return {
    fit,
    angle,
    funnel,
    avatar,
    insight,
    angles,
    funnels,
    avatars,
    source: 'heuristic',
  };
}

function buildHeuristicInsight({ ad, angle, funnel, avatar, fit }) {
  const longevity = ad.daysRunning >= 180 ? 'extremamente validado' : ad.daysRunning >= 60 ? 'validado' : 'em teste';
  return `Anúncio ${longevity} (${ad.daysRunning} dias rodando). Ângulo principal: **${angle}**. Funil: **${funnel}**. Avatar capturado: **${avatar}**. Fit ${fit}/100 com sua oferta de Landing Pages — observe a estrutura da copy e o gancho de abertura para adaptar ao seu diferencial de velocidade (48-72h).`;
}

// ---------- Análise via Gemini (preferida quando disponível) ----------

const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    fit: { type: 'integer', description: '0-100, quanto o anúncio é referência útil para a oferta do usuário' },
    angle: { type: 'string', description: "Ex: 'Autoridade + Prova social', 'Urgência + Escassez'" },
    bigIdea: { type: 'string', description: '1 frase com a Big Idea / promessa central' },
    funnel: { type: 'string', description: "Ex: 'WhatsApp direto', 'VSL', 'Lead Magnet', 'Quiz', 'Aplicação'" },
    avatar: { type: 'string', description: 'A quem este anúncio fala (dor + identidade)' },
    hookVisual: { type: 'string', description: 'Hook visual implícito pela copy/CTA' },
    insight: { type: 'string', description: '2-3 frases: POR QUE funciona e COMO o usuário pode adaptar' },
    swipeReady: { type: 'boolean', description: 'true se a estrutura de copy é digna de swipe file' },
  },
  required: ['fit', 'angle', 'bigIdea', 'funnel', 'avatar', 'insight', 'swipeReady'],
};

function buildGeminiPrompt(ad) {
  return `Você é um estrategista de copy e tráfego pago especialista no mercado brasileiro de infoprodutos e serviços.
Analise UM anúncio do Facebook em relação à oferta do usuário e devolva JSON conforme o schema.

CONTEXTO DA OFERTA DO USUÁRIO:
- Oferta: ${NICHE.productName}
- Ticket: ${NICHE.ticket}
- Mercado: ${NICHE.market} (${NICHE.language})
- Diferencial: ${NICHE.uniqueSelling}
- Avatar do usuário: ${NICHE.avatar.join('; ')}

ANÚNCIO PARA ANALISAR:
Página: ${ad.pageName}
Dias rodando: ${ad.daysRunning}
Título: ${ad.title || '(sem título)'}
CTA: ${ad.cta || '(sem CTA)'}
Copy:
"""
${ad.body || '(sem copy)'}
"""
Descrição do link: ${ad.linkDescription || '(vazia)'}
URL destino: ${ad.linkUrl || '(n/a)'}`;
}

async function geminiAnalyze(ad, model) {
  const result = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: buildGeminiPrompt(ad) }] }],
    generationConfig: {
      temperature: 0.4,
      maxOutputTokens: 800,
      responseMimeType: 'application/json',
      responseSchema: RESPONSE_SCHEMA,
    },
  });
  const text = result.response.text();
  const json = extractJson(text);
  return { ...json, source: 'gemini' };
}

function extractJson(text) {
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) throw new Error('Resposta da IA sem JSON: ' + text.slice(0, 200));
  return JSON.parse(m[0]);
}

// ---------- Pipeline ----------

export async function analyze({ topN = 30 } = {}) {
  const raw = JSON.parse(await readFile(RAW_PATH, 'utf8'));
  console.log(`[analyzer] ${raw.length} anúncios brutos carregados`);

  const normalized = raw.map(normalize).filter((a) => a.body || a.title || a.images.length || a.videos.length);
  console.log(`[analyzer] ${normalized.length} anúncios normalizados (com conteúdo útil)`);

  // Filtra os ATIVOS rodando há mais tempo — anúncios validados.
  const validated = normalized
    .filter((a) => a.isActive)
    .sort((a, b) => b.daysRunning - a.daysRunning)
    .slice(0, topN);

  console.log(`[analyzer] TOP ${validated.length} anúncios validados (mais antigos ainda ativos)`);

  const useGemini = !!process.env.GEMINI_API_KEY;
  const model = useGemini
    ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY).getGenerativeModel({ model: GEMINI_MODEL })
    : null;
  console.log(`[analyzer] Modo: ${useGemini ? `Gemini API (${GEMINI_MODEL})` : 'Heurística PT-BR (sem GEMINI_API_KEY)'}`);

  const results = [];
  for (let i = 0; i < validated.length; i++) {
    const ad = validated[i];
    process.stdout.write(`[analyzer] (${i + 1}/${validated.length}) ${ad.pageName.slice(0, 30)}... `);
    try {
      const ai = useGemini ? await geminiAnalyze(ad, model) : heuristicAnalyze(ad);
      results.push({ ...ad, ai });
      console.log(`fit=${ai.fit}`);
    } catch (err) {
      console.log(`falhou (${err.message.slice(0, 60)}) → fallback heurística`);
      results.push({ ...ad, ai: heuristicAnalyze(ad) });
    }
  }

  // Ordena por fit DESC para o relatório
  results.sort((a, b) => (b.ai?.fit || 0) - (a.ai?.fit || 0));

  await writeFile(OUT_PATH, JSON.stringify(results, null, 2), 'utf8');
  console.log(`[analyzer] Análise salva em ${OUT_PATH}`);
  return results;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const topN = Number(process.env.TOP_N) || 30;
  analyze({ topN }).catch((err) => {
    console.error('[analyzer] erro:', err);
    process.exit(1);
  });
}
