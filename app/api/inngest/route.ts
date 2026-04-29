import { serve } from "inngest/next"
import { inngest } from "@/inngest/client"
import { spyRunFunction } from "@/inngest/functions/spy-run"

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [spyRunFunction],
})
