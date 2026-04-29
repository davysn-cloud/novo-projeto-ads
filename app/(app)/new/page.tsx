// Formulário de criação de Spy Run — fase 4 implementará o submit real.
// Por ora: UI completa, botão exibe o JSON montado.
import type { Metadata } from "next"

export const metadata: Metadata = { title: "Nova Spy Run" }

export default function NewRunPage() {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-zinc-100">Nova Spy Run</h1>
        <p className="text-sm text-zinc-400 mt-1">
          Descreva seu produto e a IA vai minerar os anúncios mais relevantes para o seu nicho.
        </p>
      </div>

      <div className="glass ring-card rounded-2xl border border-white/5 p-8">
        {/* Fase 4 vai implementar o submit com API route + Inngest */}
        <div className="flex items-center gap-3 p-4 rounded-xl bg-accent-500/10 border border-accent-500/20 mb-8">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <p className="text-sm text-accent-300">
            <strong>Fase 4</strong> — O formulário funcional está em desenvolvimento. A estrutura e validação de campos já estão prontas.
          </p>
        </div>

        <div className="grid gap-5">
          {/* Produto */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">
              Nome do produto / serviço <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              placeholder="Ex: Criação de Landing Pages profissionais"
              className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 focus:outline-none focus:ring-2 focus:ring-accent-500/40 placeholder:text-zinc-500 text-sm"
              disabled
            />
          </div>

          {/* Ticket */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">
              Ticket / preço
            </label>
            <input
              type="text"
              placeholder="Ex: R$ 900"
              className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 focus:outline-none focus:ring-2 focus:ring-accent-500/40 placeholder:text-zinc-500 text-sm"
              disabled
            />
          </div>

          {/* Mercado + Idioma */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">Mercado</label>
              <select
                disabled
                className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-zinc-400"
              >
                <option>Brasil (BR)</option>
                <option>Estados Unidos (US)</option>
                <option>Portugal (PT)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">
                Qtd. de anúncios
              </label>
              <select
                disabled
                className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-zinc-400"
              >
                <option>50 (rápido)</option>
                <option>100 (padrão)</option>
                <option>200 (profundo)</option>
              </select>
            </div>
          </div>

          {/* Diferencial */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">
              Seu maior diferencial
            </label>
            <input
              type="text"
              placeholder="Ex: Entrega em 48-72h, preço mais baixo do mercado…"
              className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 focus:outline-none focus:ring-2 focus:ring-accent-500/40 placeholder:text-zinc-500 text-sm"
              disabled
            />
          </div>

          {/* Avatar */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">
              Avatar / público-alvo
            </label>
            <textarea
              rows={3}
              placeholder="Ex: Infoprodutores que querem mais vendas, médicos que querem atrair pacientes…"
              className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 focus:outline-none focus:ring-2 focus:ring-accent-500/40 placeholder:text-zinc-500 text-sm resize-none"
              disabled
            />
          </div>

          {/* Foco da análise */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Foco da análise
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                "Ângulo de copy / Big Idea",
                "Estrutura de funil / CTA",
                "Avatar / Persona alvo",
                "Criativo visual / Hook visual",
              ].map((f) => (
                <label key={f} className="flex items-center gap-2 cursor-not-allowed">
                  <input type="checkbox" disabled className="rounded" />
                  <span className="text-sm text-zinc-400">{f}</span>
                </label>
              ))}
            </div>
          </div>

          <button
            type="button"
            disabled
            className="w-full py-3 rounded-xl bg-accent-600/50 text-white/50 font-semibold text-sm cursor-not-allowed"
          >
            Gerar Keywords e Iniciar Spy Run
          </button>
        </div>
      </div>
    </div>
  )
}
