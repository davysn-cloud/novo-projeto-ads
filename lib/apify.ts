// Scraper Apify — port TS de src/scraper.js.
// Sem I/O de arquivo: retorna os items em memória para o worker persistir no DB.
import { ApifyClient } from "apify-client"
import { planScrape } from "@/lib/adlibrary-url"

const ACTOR_ID = "curious_coder/facebook-ads-library-scraper"

export async function scrapeAds(
  keywords: string[],
  {
    totalCount = 100,
    market = "BR",
  }: { totalCount?: number; market?: string } = {}
): Promise<unknown[]> {
  const token = process.env.APIFY_TOKEN
  if (!token) throw new Error("APIFY_TOKEN não definido")

  const client = new ApifyClient({ token })
  const plan = planScrape({ totalCount, keywords, market })

  const input = {
    urls: plan.urls,
    count: plan.count,
    limitPerSource: plan.limitPerSource,
    scrapeAdDetails: true,
    "scrapePageAds.activeStatus": "active",
    "scrapePageAds.countryCode": market,
    "scrapePageAds.sortBy": "impressions_desc",
  }

  console.log(`[apify] Disparando actor ${ACTOR_ID} — ${plan.urls.length} URLs | count=${plan.count}`)

  const run = await client.actor(ACTOR_ID).call(input, {
    waitSecs: 60 * 12, // até 12 min
  })

  console.log(`[apify] Run ${run.id} status=${run.status}`)

  const { items } = await client.dataset(run.defaultDatasetId).listItems()
  console.log(`[apify] ${items.length} anúncios coletados`)

  return items
}
