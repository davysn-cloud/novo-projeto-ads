// Edge-safe auth config (sem Prisma) — usado pelo middleware
import type { NextAuthConfig } from "next-auth"
import Google from "next-auth/providers/google"

export const authConfig = {
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user
      const isOnApp = nextUrl.pathname.startsWith("/dashboard") ||
        nextUrl.pathname.startsWith("/new") ||
        nextUrl.pathname.startsWith("/runs")
      if (isOnApp) return isLoggedIn
      return true
    },
  },
} satisfies NextAuthConfig
