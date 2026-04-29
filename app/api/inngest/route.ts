import { serve } from "inngest/next"
import { inngest } from "@/inngest/client"
import { spyRunFunction } from "@/inngest/functions/spy-run"
import { quotaResetFunction } from "@/inngest/functions/quota-reset"

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [spyRunFunction, quotaResetFunction],
})
