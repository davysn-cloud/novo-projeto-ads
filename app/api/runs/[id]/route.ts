import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

type Params = { params: Promise<{ id: string }> }

// GET /api/runs/[id] — status polling + dados finais
export async function GET(_req: Request, { params }: Params) {
  const { id } = await params
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const run = await db.run.findFirst({
    where: { id, userId: session.user.id },
  })

  if (!run) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  // Só retorna analyzedAds quando done (evita payload gigante no polling)
  const { rawAds: _, ...runWithoutRaw } = run
  const payload =
    run.status === "DONE"
      ? runWithoutRaw
      : { ...runWithoutRaw, analyzedAds: null }

  return NextResponse.json(payload)
}
