// Pipeline completo: scrape → analyze → report
import 'dotenv/config';
import { scrape } from './scraper.js';
import { analyze } from './analyzer.js';
import { report } from './reporter.js';

const totalCount = Number(process.env.ADS_COUNT) || 100;
const topN = Number(process.env.TOP_N) || 30;

(async () => {
  const t0 = Date.now();
  console.log(`\n🟣 Spy Lab — Inteligência Competitiva FB Ads`);
  console.log(`   ▸ count=${totalCount} | top-N validados=${topN}\n`);

  await scrape({ totalCount });
  await analyze({ topN });
  const out = await report();

  console.log(`\n✅ Pronto em ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  console.log(`   Abra: file://${out}`);
})().catch((err) => {
  console.error('\n❌ Pipeline falhou:', err);
  process.exit(1);
});
