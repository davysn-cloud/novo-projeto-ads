import type { Metadata } from "next"
import { NicheForm } from "@/components/NicheForm"

export const metadata: Metadata = { title: "Nova Spy Run" }

export default function NewRunPage() {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-zinc-100">Nova Spy Run</h1>
        <p className="text-sm text-zinc-400 mt-1">
          Descreva seu produto e a IA gera as keywords + dispara o pipeline de mineração.
        </p>
      </div>

      <NicheForm />

      <p className="text-center text-xs text-zinc-500 mt-6">
        Plano Free: 2 spy runs por mês. Sua quota só é consumida ao iniciar a run.
      </p>
    </div>
  )
}
