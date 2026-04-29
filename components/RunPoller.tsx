"use client"

import { useEffect, useRef } from "react"
import { useRouter } from "next/navigation"

interface Props {
  runId: string
  initialStatus: string
}

const TERMINAL = new Set(["DONE", "FAILED"])

export function RunPoller({ runId, initialStatus }: Props) {
  const router = useRouter()
  const statusRef = useRef(initialStatus)

  useEffect(() => {
    if (TERMINAL.has(initialStatus)) return

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/runs/${runId}`, { cache: "no-store" })
        if (!res.ok) return
        const data = (await res.json()) as { status: string }
        if (data.status !== statusRef.current) {
          statusRef.current = data.status
          router.refresh()
        }
        if (TERMINAL.has(data.status)) {
          clearInterval(interval)
        }
      } catch {
        // silently ignore network hiccups
      }
    }, 3000)

    return () => clearInterval(interval)
  }, [runId, initialStatus, router])

  return null
}
