// Scraper — chama o actor curious_coder/facebook-ads-library-scraper na Apify
// e persiste os dados brutos em data/raw_ads.json.

import 'dotenv/config';
import { ApifyClient } from 'apify-client';
import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { planScrape, NICHE } from './config.js';

const ACTOR_ID = 'curious_coder/facebook-ads-library-scraper';
const RAW_PATH = path.resolve('data/raw_ads.json');

export async function scrape({ totalCount = 100 } = {}) {
  const token = process.env.APIFY_TOKEN;
  if (!token) {
    throw new Error('APIFY_TOKEN ausente. Defina no .env (copie de .env.example).');
  }

  const client = new ApifyClient({ token });
  const plan = planScrape({ totalCount, keywords: NICHE.keywords });

  const input = {
    urls: plan.urls,
    count: plan.count,
    limitPerSource: plan.limitPerSource,
    scrapeAdDetails: true,
    'scrapePageAds.activeStatus': 'active',
    'scrapePageAds.countryCode': 'BR',
    'scrapePageAds.sortBy': 'impressions_desc',
  };

  console.log(`\n[scraper] Disparando actor ${ACTOR_ID}`);
  console.log(`[scraper] ${plan.urls.length} URLs de busca | count=${plan.count} | limit/url=${plan.limitPerSource}`);

  const run = await client.actor(ACTOR_ID).call(input, {
    waitSecs: 60 * 10, // até 10min
  });

  console.log(`[scraper] Run ${run.id} status=${run.status}`);
  const { items } = await client.dataset(run.defaultDatasetId).listItems();
  console.log(`[scraper] ${items.length} anúncios coletados.`);

  await mkdir(path.dirname(RAW_PATH), { recursive: true });
  await writeFile(RAW_PATH, JSON.stringify(items, null, 2), 'utf8');
  console.log(`[scraper] Dados brutos salvos em ${RAW_PATH}`);

  return items;
}

// Permite rodar standalone: `node src/scraper.js`
if (import.meta.url === `file://${process.argv[1]}`) {
  const total = Number(process.env.ADS_COUNT) || 100;
  scrape({ totalCount: total }).catch((err) => {
    console.error('[scraper] erro:', err);
    process.exit(1);
  });
}
