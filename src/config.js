// Config do nicho — calibrada para: Agência de Landing Pages | Ticket R$ 900 | Brasil
// Avatar: Infoprodutores, Médicos/Dentistas/Advogados, E-commerces, Agências/Freelancers de tráfego
// Diferencial: Velocidade de entrega (48-72h)

export const NICHE = {
  productName: 'Serviço de Criação de Landing Pages',
  ticket: 'R$ 900',
  market: 'BR',
  language: 'pt-BR',
  uniqueSelling: 'Velocidade de entrega (48-72h)',
  avatar: [
    'Infoprodutores e coaches',
    'Médicos, dentistas e advogados',
    'E-commerces e lojistas',
    'Agências e gestores de tráfego pago',
  ],
  // Palavras-chave estratégicas — divididas em camadas para diversidade do scrape.
  // Camada 1: concorrência DIRETA (mesma oferta)
  // Camada 2: avatar (quem compra LP)
  // Camada 3: ofertas adjacentes (mesma persona)
  keywords: [
    // CAMADA 1 — concorrência direta
    'criação de landing page',
    'landing page profissional',
    'criação de site',
    'site profissional',
    'página de vendas',
    'página de captura',
    'agência de site',
    'design de landing page',
    // CAMADA 2 — avatar
    'site para médico',
    'site para dentista',
    'site para advogado',
    'site para infoprodutor',
    'site para e-commerce',
    // CAMADA 3 — adjacentes (mesma persona compra)
    'gestor de tráfego',
    'tráfego pago para empresas',
    'funil de vendas',
  ],
};

// URL builder para a Biblioteca de Anúncios do Facebook
// Doc: https://www.facebook.com/ads/library/?...
export function buildAdLibraryUrl(keyword, { country = 'BR', activeStatus = 'active' } = {}) {
  const params = new URLSearchParams({
    active_status: activeStatus,
    ad_type: 'all',
    country,
    q: keyword,
    search_type: 'keyword_unordered',
    media_type: 'all',
  });
  return `https://www.facebook.com/ads/library/?${params.toString()}`;
}

// Distribui o total de ads entre as keywords (para o limitPerSource do actor)
export function planScrape({ totalCount = 100, keywords = NICHE.keywords } = {}) {
  const perKeyword = Math.max(5, Math.ceil(totalCount / keywords.length));
  return {
    urls: keywords.map((q) => ({ url: buildAdLibraryUrl(q) })),
    limitPerSource: perKeyword,
    count: totalCount,
  };
}
