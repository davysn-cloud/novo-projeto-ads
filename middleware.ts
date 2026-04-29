import NextAuth from "next-auth"
import { authConfig } from "@/auth.config"

// Edge-compatible: usa authConfig sem Prisma
export const { auth: middleware } = NextAuth(authConfig)

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/new/:path*",
    "/runs/:path*",
  ],
}
