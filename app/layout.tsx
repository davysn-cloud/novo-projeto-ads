import type { Metadata } from "next"
import { Inter, JetBrains_Mono } from "next/font/google"
import "./globals.css"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
})

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["500", "600"],
  display: "swap",
})

export const metadata: Metadata = {
  title: {
    default: "Spy Lab — Facebook Ads Intelligence",
    template: "%s | Spy Lab",
  },
  description:
    "Minere a Biblioteca de Anúncios do Facebook e descubra anúncios validados para o seu nicho em minutos.",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR" className="dark">
      <body
        className={`${inter.variable} ${mono.variable} font-sans antialiased relative`}
      >
        {children}
      </body>
    </html>
  )
}
