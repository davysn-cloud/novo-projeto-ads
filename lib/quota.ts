// Gerenciamento de quota freemium por usuário.
// Free: 2 runs/mês | Pro: configurável (implementar junto com billing).
import { db } from "@/lib/db"

export class QuotaExceededError extends Error {
  constructor(used: number, quota: number) {
    super(`Quota mensal esgotada (${used}/${quota}). Aguarde o próximo ciclo ou faça upgrade.`)
    this.name = "QuotaExceededError"
  }
}

export async function checkQuota(userId: string): Promise<void> {
  const user = await db.user.findUniqueOrThrow({
    where: { id: userId },
    select: { monthlyUsed: true, monthlyQuota: true, quotaResetAt: true },
  })

  // Reset automático se o mês virou
  const now = new Date()
  if (now >= user.quotaResetAt) {
    await resetQuota(userId)
    return // após reset sempre tem quota
  }

  if (user.monthlyUsed >= user.monthlyQuota) {
    throw new QuotaExceededError(user.monthlyUsed, user.monthlyQuota)
  }
}

export async function consumeQuota(userId: string): Promise<void> {
  await db.user.update({
    where: { id: userId },
    data: { monthlyUsed: { increment: 1 } },
  })
}

export async function resetQuota(userId: string): Promise<void> {
  const nextReset = new Date()
  nextReset.setMonth(nextReset.getMonth() + 1)
  nextReset.setDate(1)
  nextReset.setHours(0, 0, 0, 0)

  await db.user.update({
    where: { id: userId },
    data: { monthlyUsed: 0, quotaResetAt: nextReset },
  })
}

export async function getQuotaStatus(userId: string) {
  const user = await db.user.findUniqueOrThrow({
    where: { id: userId },
    select: { monthlyUsed: true, monthlyQuota: true, quotaResetAt: true, plan: true },
  })
  return {
    used: user.monthlyUsed,
    quota: user.monthlyQuota,
    remaining: Math.max(0, user.monthlyQuota - user.monthlyUsed),
    resetAt: user.quotaResetAt,
    plan: user.plan,
  }
}
