import { auth, signOut } from "@/lib/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import type { Metadata } from "next"

export const metadata: Metadata = { title: "Dashboard" }

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  if (!session?.user) redirect("/login")

  return (
    <div className="relative z-10 min-h-screen flex flex-col">
      {/* Nav */}
      <header className="border-b border-white/5 sticky top-0 z-30 bg-ink-950/70 backdrop-blur">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between gap-4">
          {/* Logo */}
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-accent-500 to-neon-500 grid place-items-center shadow-glow">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="7" />
                <path d="m21 21-4.3-4.3" />
              </svg>
            </div>
            <span className="text-sm font-bold gradient-text">Spy Lab</span>
          </Link>

          {/* Nav links */}
          <nav className="flex items-center gap-1">
            <Link
              href="/dashboard"
              className="px-3 py-1.5 rounded-lg text-sm text-zinc-400 hover:text-zinc-100 hover:bg-white/5 transition"
            >
              Minhas Runs
            </Link>
            <Link
              href="/new"
              className="px-3 py-1.5 rounded-lg text-sm font-medium text-white bg-accent-600 hover:bg-accent-500 transition"
            >
              + Nova Spy Run
            </Link>
          </nav>

          {/* User menu */}
          <div className="flex items-center gap-3">
            <div className="hidden md:block text-right">
              <p className="text-xs font-medium text-zinc-200 truncate max-w-[140px]">
                {session.user.name ?? session.user.email}
              </p>
              <p className="text-[10px] text-zinc-500">Plano Free</p>
            </div>
            <form
              action={async () => {
                "use server"
                await signOut({ redirectTo: "/login" })
              }}
            >
              <button
                type="submit"
                title="Sair"
                className="w-8 h-8 rounded-lg border border-white/10 text-zinc-400 hover:text-zinc-100 hover:bg-white/5 transition grid place-items-center"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8">{children}</main>
    </div>
  )
}
