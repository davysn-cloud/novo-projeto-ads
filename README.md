# Spy Lab — Facebook Ads Intelligence Engine

Motor de Inteligência Competitiva que minera a **Biblioteca de Anúncios do Facebook** via Apify, filtra os anúncios validados pelo mercado (rodando há mais tempo) e gera um **dashboard premium dark-mode** com análise de IA por anúncio.

Pré-calibrado para o nicho:

- **Oferta:** Serviço de Criação de Landing Pages (R$ 900)
- **Mercado:** Brasil (PT-BR)
- **Avatar:** Infoprodutores · Médicos/Dentistas/Advogados · E-commerces · Agências
- **Diferencial:** Velocidade de entrega (48-72h)

> Edite `src/config.js` para mudar o nicho, palavras-chave ou avatar.

## Stack

- **Apify** — actor `curious_coder/facebook-ads-library-scraper` (paginação + extração de criativos).
- **Node.js 18+** (ESM).
- **Anthropic Claude API** (opcional) — análise de copy / ângulo / funil / avatar / fit.
  - Sem a chave, o analyzer cai num **fallback heurístico PT-BR** que entrega resultado decente.
- **Tailwind via CDN** — dashboard `report.html` autossuficiente (abre no navegador, sem servidor).

## Setup

```bash
cp .env.example .env
# edite .env com sua APIFY_TOKEN (e ANTHROPIC_API_KEY se quiser análise turbinada)

npm install
```

## Uso

```bash
# Pipeline completo: scrape → analyze → report
npm start

# Ou cada etapa separadamente:
npm run scrape    # → data/raw_ads.json
npm run analyze   # → data/analyzed_ads.json
npm run report    # → report.html
```

Abra `report.html` no navegador.

## Variáveis de ambiente

| Var | Default | Descrição |
|---|---|---|
| `APIFY_TOKEN` | — (obrig.) | Token da sua conta Apify |
| `ANTHROPIC_API_KEY` | — (opcional) | Ativa análise via Claude (`claude-sonnet-4-6`) |
| `ADS_COUNT` | `100` | Total de anúncios a coletar |
| `TOP_N` | `30` | Top-N validados (mais antigos ainda ativos) que entram no relatório |

## Como funciona

1. **Scrape** — `src/scraper.js` monta uma URL da Biblioteca por palavra-chave estratégica (ver `src/config.js`), distribui o `count` entre as URLs, e dispara o actor com `scrapeAdDetails: true`. Salva o dump em `data/raw_ads.json`.
2. **Analyze** — `src/analyzer.js`:
   - Normaliza campos (datas, mídias, copy) — defensivo a variações do schema do actor.
   - Filtra apenas anúncios **ativos** e pega os `TOP_N` com maior `daysRunning` (= validados).
   - Para cada um, chama Claude (ou heurística) para devolver: `fit (0-100)`, `angle`, `bigIdea`, `funnel`, `avatar`, `hookVisual`, `insight`, `swipeReady`.
   - Salva em `data/analyzed_ads.json`.
3. **Report** — `src/reporter.js` gera `report.html`:
   - Dark mode SaaS premium (Tailwind, Inter + JetBrains Mono).
   - Cards com mídia (img/video, `referrerpolicy="no-referrer"` para não bloquear CDN do FB).
   - Box "Insight da IA" com score, ângulo, funil, avatar e estratégia explicada.
   - Filtros dinâmicos: busca, fit mínimo, tipo de mídia, ordenação.

## Estrutura

```
.
├── src/
│   ├── config.js     # Nicho + palavras-chave + URL builder
│   ├── scraper.js    # Apify actor → raw_ads.json
│   ├── analyzer.js   # Curadoria + IA (Claude ou heurística)
│   ├── reporter.js   # report.html dark-mode premium
│   └── index.js      # Orquestrador (scrape → analyze → report)
├── data/             # JSONs gerados (gitignored)
└── report.html       # Dashboard final (gitignored)
```

## Custos aproximados

- Apify: actor cobra ~US$ 0.75 por 1000 resultados ou plano flat US$ 30/mês.
- Anthropic: ~30 chamadas com Sonnet 4.6 por execução. Centavos de dólar.

## Notas legais

Os dados públicos da Biblioteca de Anúncios do Facebook são livres para consulta. Use o output como **referência estratégica** (swipe file), nunca para clonar literalmente copy/criativo de terceiros.
