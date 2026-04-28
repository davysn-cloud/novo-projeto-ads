// Reporter — gera report.html (dark mode, SaaS premium, Tailwind via CDN)
// Lê data/analyzed_ads.json e injeta o estado como JSON para a UI dinâmica.

import 'dotenv/config';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { NICHE } from './config.js';

const IN_PATH = path.resolve('data/analyzed_ads.json');
const OUT_PATH = path.resolve('report.html');

function escapeHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildHtml(ads) {
  // Stats
  const total = ads.length;
  const avgFit = total ? Math.round(ads.reduce((s, a) => s + (a.ai?.fit || 0), 0) / total) : 0;
  const avgDays = total ? Math.round(ads.reduce((s, a) => s + (a.daysRunning || 0), 0) / total) : 0;
  const topPage = total
    ? Object.entries(
        ads.reduce((acc, a) => ((acc[a.pageName] = (acc[a.pageName] || 0) + 1), acc), {})
      ).sort((a, b) => b[1] - a[1])[0]
    : ['—', 0];
  const generatedAt = new Date().toLocaleString('pt-BR', { dateStyle: 'long', timeStyle: 'short' });

  // Embute o dataset como JSON seguro
  const adsJson = JSON.stringify(ads).replace(/</g, '\\u003c');

  return `<!doctype html>
<html lang="pt-BR" class="dark">
<head>
<meta charset="utf-8" />
<meta name="referrer" content="no-referrer" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Spy Lab — Inteligência Competitiva | ${escapeHtml(NICHE.productName)}</title>
<script src="https://cdn.tailwindcss.com"></script>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500&display=swap" rel="stylesheet">
<script>
  tailwind.config = {
    darkMode: 'class',
    theme: {
      extend: {
        fontFamily: {
          sans: ['Inter', 'ui-sans-serif', 'system-ui'],
          mono: ['JetBrains Mono', 'ui-monospace'],
        },
        colors: {
          ink: { 950: '#07070b', 900: '#0b0b13', 800: '#11111c', 700: '#181826', 600: '#22223a' },
          accent: { 400: '#a78bfa', 500: '#8b5cf6', 600: '#7c3aed' },
          neon:   { 400: '#22d3ee', 500: '#06b6d4' },
          lime:   { 400: '#a3e635', 500: '#84cc16' },
        },
        boxShadow: {
          glow: '0 0 0 1px rgba(139,92,246,.25), 0 8px 40px -10px rgba(139,92,246,.45)',
          card: '0 1px 0 0 rgba(255,255,255,.04) inset, 0 30px 80px -30px rgba(0,0,0,.6)',
        },
      }
    }
  }
</script>
<style>
  html, body { background: radial-gradient(1200px 600px at 10% -10%, rgba(139,92,246,.18), transparent 60%),
                          radial-gradient(900px 500px at 100% 0%, rgba(34,211,238,.10), transparent 60%),
                          #07070b; }
  .grain::before {
    content:""; position:fixed; inset:0; pointer-events:none; z-index:0;
    background-image: radial-gradient(rgba(255,255,255,.035) 1px, transparent 1px);
    background-size: 3px 3px; opacity:.5;
  }
  .glass { background: linear-gradient(180deg, rgba(255,255,255,.04), rgba(255,255,255,.01)); backdrop-filter: blur(8px); }
  .ring-card { box-shadow: 0 1px 0 0 rgba(255,255,255,.05) inset, 0 30px 80px -30px rgba(0,0,0,.6); }
  .scroll-thin::-webkit-scrollbar { width: 8px; height: 8px; }
  .scroll-thin::-webkit-scrollbar-thumb { background: #2a2a40; border-radius: 8px; }
  .clamp-6 { display:-webkit-box; -webkit-line-clamp:6; -webkit-box-orient:vertical; overflow:hidden; }
  .badge { display:inline-flex; align-items:center; gap:.35rem; padding:.2rem .55rem; border-radius:9999px; font-size:.7rem; font-weight:600; }
  .ring-fit-90 { box-shadow: 0 0 0 2px rgba(163,230,53,.45), 0 0 30px rgba(163,230,53,.25); }
  .ring-fit-70 { box-shadow: 0 0 0 2px rgba(167,139,250,.4),  0 0 30px rgba(167,139,250,.18); }
  .ring-fit-low{ box-shadow: 0 0 0 2px rgba(255,255,255,.05); }
  .gradient-text { background: linear-gradient(90deg,#a78bfa,#22d3ee); -webkit-background-clip:text; background-clip:text; color:transparent; }
  details > summary { list-style:none; cursor:pointer; }
  details > summary::-webkit-details-marker { display:none; }
</style>
</head>
<body class="grain font-sans text-zinc-200 antialiased">

<header class="relative z-10 border-b border-white/5">
  <div class="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
    <div class="flex items-center gap-3">
      <div class="w-9 h-9 rounded-xl bg-gradient-to-br from-accent-500 to-neon-500 grid place-items-center shadow-glow">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>
      </div>
      <div>
        <div class="text-sm uppercase tracking-[.18em] text-zinc-400">Spy Lab</div>
        <div class="text-lg font-bold gradient-text">Facebook Ads Intelligence Engine</div>
      </div>
    </div>
    <div class="hidden md:flex items-center gap-2 text-xs text-zinc-400">
      <span class="badge bg-white/5 border border-white/10">${escapeHtml(NICHE.market)} · ${escapeHtml(NICHE.language)}</span>
      <span class="badge bg-white/5 border border-white/10">Ticket ${escapeHtml(NICHE.ticket)}</span>
      <span class="badge bg-white/5 border border-white/10">Diferencial: ${escapeHtml(NICHE.uniqueSelling)}</span>
    </div>
  </div>
</header>

<main class="relative z-10 max-w-7xl mx-auto px-6 py-10">

  <section class="mb-10">
    <h1 class="text-3xl md:text-5xl font-extrabold tracking-tight">
      Anúncios <span class="gradient-text">validados</span> que rodam no seu nicho.
    </h1>
    <p class="mt-3 text-zinc-400 max-w-3xl">
      Os ${total} anúncios abaixo estão <strong class="text-zinc-200">ativos há mais tempo</strong> (= validados pelo mercado),
      curados e analisados pela IA com foco em <strong class="text-zinc-200">${escapeHtml(NICHE.productName)}</strong>.
      Use como swipe file e adapte ao seu diferencial.
    </p>

    <div class="mt-7 grid grid-cols-2 md:grid-cols-4 gap-3">
      ${kpi('Anúncios analisados', total)}
      ${kpi('Fit médio', `${avgFit}<span class="text-zinc-400 text-base">/100</span>`)}
      ${kpi('Longevidade média', `${avgDays}<span class="text-zinc-400 text-base"> dias</span>`)}
      ${kpi('Página dominante', escapeHtml(String(topPage[0]).slice(0, 20)) + (String(topPage[0]).length > 20 ? '…' : ''))}
    </div>
  </section>

  <section class="mb-6 sticky top-0 z-20 -mx-6 px-6 py-4 bg-ink-950/70 backdrop-blur border-b border-white/5">
    <div class="flex flex-wrap items-center gap-3">
      <div class="flex-1 min-w-[220px] relative">
        <svg class="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>
        <input id="q" placeholder="Buscar copy, página, CTA, ângulo..." class="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white/5 border border-white/10 focus:outline-none focus:ring-2 focus:ring-accent-500/40 placeholder:text-zinc-500" />
      </div>
      <select id="sort" class="py-2.5 px-3 rounded-xl bg-white/5 border border-white/10 text-sm">
        <option value="fit">Ordenar por: Fit ↓</option>
        <option value="days">Ordenar por: Dias rodando ↓</option>
        <option value="page">Ordenar por: Página A→Z</option>
      </select>
      <select id="filter-fit" class="py-2.5 px-3 rounded-xl bg-white/5 border border-white/10 text-sm">
        <option value="0">Todos os fits</option>
        <option value="70">Fit ≥ 70</option>
        <option value="80">Fit ≥ 80</option>
        <option value="90">Fit ≥ 90</option>
      </select>
      <select id="filter-media" class="py-2.5 px-3 rounded-xl bg-white/5 border border-white/10 text-sm">
        <option value="all">Mídia: todas</option>
        <option value="video">Apenas vídeo</option>
        <option value="image">Apenas imagem</option>
      </select>
    </div>
  </section>

  <section id="grid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"></section>

  <footer class="mt-16 text-center text-xs text-zinc-500">
    Gerado em ${escapeHtml(generatedAt)} · Dados coletados via <span class="font-mono">curious_coder/facebook-ads-library-scraper</span> ·
    Análise por IA · <span class="text-zinc-400">Spy Lab</span>
  </footer>
</main>

<template id="card-tpl">
  <article class="card group glass ring-card rounded-2xl overflow-hidden border border-white/5 hover:border-accent-500/30 transition flex flex-col">
    <div class="media relative aspect-[4/5] bg-ink-800 overflow-hidden"></div>
    <div class="p-5 flex flex-col gap-3 flex-1">
      <div class="flex items-center justify-between gap-3">
        <div class="flex items-center gap-2 min-w-0">
          <div class="w-8 h-8 rounded-full bg-gradient-to-br from-accent-500/40 to-neon-500/40 grid place-items-center text-xs font-bold uppercase shrink-0 page-initial"></div>
          <div class="min-w-0">
            <div class="page-name font-semibold truncate"></div>
            <div class="days-running text-xs text-zinc-500"></div>
          </div>
        </div>
        <div class="fit-ring shrink-0 w-12 h-12 rounded-full grid place-items-center bg-ink-800 text-sm font-bold"></div>
      </div>

      <h3 class="ad-title text-sm font-semibold text-zinc-100 line-clamp-2"></h3>
      <p class="ad-body text-sm text-zinc-300 clamp-6"></p>

      <details class="mt-1">
        <summary class="text-xs text-accent-400 hover:text-accent-300 select-none">Ver copy completa</summary>
        <pre class="ad-body-full whitespace-pre-wrap break-words text-xs mt-2 p-3 rounded-lg bg-black/30 border border-white/5 max-h-72 overflow-auto scroll-thin"></pre>
      </details>

      <div class="insight rounded-xl p-4 bg-gradient-to-br from-accent-500/10 to-neon-500/5 border border-accent-500/20">
        <div class="flex items-center gap-2 mb-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/><circle cx="12" cy="12" r="4"/></svg>
          <span class="text-xs font-semibold uppercase tracking-wider text-accent-400">Insight da IA</span>
          <span class="ai-source ml-auto text-[10px] text-zinc-500"></span>
        </div>
        <div class="grid grid-cols-2 gap-2 text-xs mb-2">
          <div><div class="text-zinc-500">Ângulo</div><div class="ai-angle font-medium text-zinc-200"></div></div>
          <div><div class="text-zinc-500">Funil</div><div class="ai-funnel font-medium text-zinc-200"></div></div>
          <div><div class="text-zinc-500">Avatar</div><div class="ai-avatar font-medium text-zinc-200"></div></div>
          <div><div class="text-zinc-500">Big Idea</div><div class="ai-bigidea font-medium text-zinc-200 line-clamp-2"></div></div>
        </div>
        <p class="ai-insight text-sm text-zinc-300 leading-relaxed"></p>
      </div>

      <div class="flex items-center justify-between gap-2 mt-auto pt-2">
        <div class="flex items-center gap-1 flex-wrap">
          <span class="cta-badge badge bg-white/5 border border-white/10"></span>
        </div>
        <a class="library-link text-xs text-neon-400 hover:text-neon-500 inline-flex items-center gap-1" target="_blank" rel="noopener">
          Ver na Biblioteca
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M7 17 17 7M9 7h8v8"/></svg>
        </a>
      </div>
    </div>
  </article>
</template>

<script id="ads-data" type="application/json">${adsJson}</script>
<script>
(() => {
  const ADS = JSON.parse(document.getElementById('ads-data').textContent);
  const grid = document.getElementById('grid');
  const tpl = document.getElementById('card-tpl');
  const q = document.getElementById('q');
  const sortEl = document.getElementById('sort');
  const fitEl = document.getElementById('filter-fit');
  const mediaEl = document.getElementById('filter-media');

  function fitClass(fit) {
    if (fit >= 90) return 'ring-fit-90 text-lime-400';
    if (fit >= 70) return 'ring-fit-70 text-accent-400';
    return 'ring-fit-low text-zinc-300';
  }

  function mediaHtml(ad) {
    const v = ad.videos?.[0];
    if (v?.url) {
      return \`<video class="absolute inset-0 w-full h-full object-cover" controls preload="metadata" \${v.poster ? 'poster="'+v.poster+'"' : ''}>
                <source src="\${v.url}" />
              </video>\`;
    }
    const img = ad.images?.[0];
    if (img) {
      return \`<img referrerpolicy="no-referrer" class="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.02] transition" src="\${img}" alt="" loading="lazy" />\`;
    }
    return \`<div class="absolute inset-0 grid place-items-center text-zinc-600 text-xs">sem mídia</div>\`;
  }

  function render(list) {
    grid.innerHTML = '';
    if (!list.length) {
      grid.innerHTML = '<div class="col-span-full text-center text-zinc-500 py-16">Nenhum anúncio bate com seus filtros.</div>';
      return;
    }
    const frag = document.createDocumentFragment();
    for (const ad of list) {
      const node = tpl.content.cloneNode(true);
      node.querySelector('.media').innerHTML = mediaHtml(ad);
      node.querySelector('.page-name').textContent = ad.pageName || '—';
      node.querySelector('.page-initial').textContent = (ad.pageName || '?').slice(0,2);
      node.querySelector('.days-running').textContent =
        (ad.daysRunning ? ad.daysRunning+' dias rodando' : 'data n/a') + (ad.isActive ? ' · ativo' : ' · inativo');

      const fit = ad.ai?.fit ?? 0;
      const ring = node.querySelector('.fit-ring');
      ring.textContent = fit;
      ring.classList.add(...fitClass(fit).split(' '));

      node.querySelector('.ad-title').textContent = ad.title || ad.linkDescription || '';
      node.querySelector('.ad-body').textContent = ad.body || '';
      node.querySelector('.ad-body-full').textContent = ad.body || '(copy não disponível)';

      node.querySelector('.ai-angle').textContent = ad.ai?.angle || '—';
      node.querySelector('.ai-funnel').textContent = ad.ai?.funnel || '—';
      node.querySelector('.ai-avatar').textContent = ad.ai?.avatar || '—';
      node.querySelector('.ai-bigidea').textContent = ad.ai?.bigIdea || ad.ai?.angle || '—';
      node.querySelector('.ai-insight').textContent = ad.ai?.insight || '';
      node.querySelector('.ai-source').textContent = ad.ai?.source === 'gemini' ? 'Gemini' : 'heurística';

      const cta = node.querySelector('.cta-badge');
      cta.textContent = ad.cta || (ad.ai?.swipeReady ? '⭐ swipe-ready' : 'CTA n/a');

      const link = node.querySelector('.library-link');
      link.href = ad.libraryUrl || '#';

      frag.appendChild(node);
    }
    grid.appendChild(frag);
  }

  function applyFilters() {
    const term = q.value.trim().toLowerCase();
    const minFit = Number(fitEl.value);
    const media = mediaEl.value;
    const sortBy = sortEl.value;
    let list = ADS.filter(a => (a.ai?.fit ?? 0) >= minFit);
    if (media === 'video') list = list.filter(a => a.videos?.length);
    if (media === 'image') list = list.filter(a => !a.videos?.length && a.images?.length);
    if (term) {
      list = list.filter(a => {
        const blob = [a.pageName, a.title, a.body, a.cta, a.ai?.angle, a.ai?.bigIdea, a.ai?.avatar, a.ai?.funnel].join(' ').toLowerCase();
        return blob.includes(term);
      });
    }
    if (sortBy === 'fit') list.sort((a,b) => (b.ai?.fit||0) - (a.ai?.fit||0));
    if (sortBy === 'days') list.sort((a,b) => (b.daysRunning||0) - (a.daysRunning||0));
    if (sortBy === 'page') list.sort((a,b) => (a.pageName||'').localeCompare(b.pageName||''));
    render(list);
  }
  [q, sortEl, fitEl, mediaEl].forEach(el => el.addEventListener('input', applyFilters));
  applyFilters();
})();
</script>
</body>
</html>`;
}

function kpi(label, value) {
  return `
    <div class="glass ring-card rounded-2xl border border-white/5 p-4">
      <div class="text-xs uppercase tracking-wider text-zinc-500">${label}</div>
      <div class="mt-1 text-2xl font-bold text-zinc-100">${value}</div>
    </div>`;
}

export async function report() {
  const ads = JSON.parse(await readFile(IN_PATH, 'utf8'));
  const html = buildHtml(ads);
  await writeFile(OUT_PATH, html, 'utf8');
  console.log(`[reporter] Dashboard gerado em ${OUT_PATH} (${ads.length} cards)`);
  return OUT_PATH;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  report().catch((err) => {
    console.error('[reporter] erro:', err);
    process.exit(1);
  });
}
