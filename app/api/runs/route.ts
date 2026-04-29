import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { z } from "zod"
import { inngest } from "@/inngest/client"
import { checkQuota, consumeQuota, QuotaExceededError } from "@/lib/quota"

const CreateRunSchema = z.object({
  productName: z.string().min(3).max(120),
  ticket: z.string().max(30).optional(),
  market: z.string().default("BR"),
  language: z.string().default("pt-BR"),
  uniqueSelling: z.string().max(200).optional(),
  avatar: z.array(z.string()).default([]),
  focusAreas: z.array(z.string()).default([]),
  adsCount: z.number().int().min(10).max(200).default(100),
  topN: z.number().int().min(5).max(50).default(30),
  // Keywords podem vir do preview do form (Fase 4) ou serem geradas pelo worker.
  keywords: z.array(z.string()).default([]),
})

// GET /api/runs — lista runs do usuário autenticado
export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const runs = await db.run.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      status: true,
      productName: true,
      ticket: true,
      market: true,
      adsCount: true,
      topN: true,
      createdAt: true,
      finishedAt: true,
    },
  })

  return NextResponse.json(runs)
}

// POST /api/runs — cria uma nova spy run
export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await req.json()
  const parsed = CreateRunSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
  }

  try {
    await checkQuota(session.user.id)
  } catch (err) {
    if (err instanceof QuotaExceededError) {
      return NextResponse.json({ error: err.message }, { status: 429 })
    }
    throw err
  }

  const run = await db.run.create({
    data: {
      ...parsed.data,
      userId: session.user.id,
      status: "QUEUED",
    },
  })

  await consumeQuota(session.user.id)
  await inngest.send({ name: "spy/run.created", data: { runId: run.id } })

  return NextResponse.json(run, { status: 201 })
}
