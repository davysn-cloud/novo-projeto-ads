import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { z } from "zod"
import { generateKeywords } from "@/lib/keywords"

const PreviewSchema = z.object({
  productName: z.string().min(3).max(120),
  ticket: z.string().max(30).optional(),
  market: z.string().default("BR"),
  language: z.string().default("pt-BR"),
  uniqueSelling: z.string().max(200).optional(),
  avatar: z.array(z.string()).default([]),
})

// POST /api/keywords/preview — gera keywords sem criar run, para preview no form
export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await req.json()
  const parsed = PreviewSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
  }

  try {
    const keywords = await generateKeywords(parsed.data)
    return NextResponse.json({ keywords })
  } catch (err) {
    console.error("[keywords/preview] erro:", err)
    return NextResponse.json(
      { error: (err as Error).message ?? "Falha ao gerar keywords" },
      { status: 500 }
    )
  }
}
