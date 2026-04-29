import { inngest } from "@/inngest/client"
import { db } from "@/lib/db"

export const quotaResetFunction = inngest.createFunction(
  { id: "monthly-quota-reset", name: "Reset mensal de quota" },
  { cron: "0 0 1 * *" }, // 1º dia de cada mês à meia-noite UTC
  async ({ step }) => {
    await step.run("reset-all-quotas", async () => {
      const nextReset = new Date()
      nextReset.setUTCMonth(nextReset.getUTCMonth() + 1)
      nextReset.setUTCDate(1)
      nextReset.setUTCHours(0, 0, 0, 0)

      const result = await db.user.updateMany({
        data: { monthlyUsed: 0, quotaResetAt: nextReset },
      })
      console.log(`[quota-reset] Reset ${result.count} usuários. Próximo reset: ${nextReset.toISOString()}`)
      return { count: result.count }
    })
  }
)
