"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

type Step = "spec" | "keywords" | "submitting"

const MARKETS = [
  { value: "BR", label: "Brasil (PT-BR)", lang: "pt-BR" },
  { value: "US", label: "Estados Unidos (EN)", lang: "en" },
  { value: "PT", label: "Portugal (PT-PT)", lang: "pt-PT" },
  { value: "ALL", label: "Global", lang: "en" },
]

const ADS_COUNT_OPTIONS = [
  { value: 50, label: "50 ads", hint: "rápido (~2min)" },
  { value: 100, label: "100 ads", hint: "padrão (~3-5min)" },
  { value: 150, label: "150 ads", hint: "profundo (~5-8min)" },
]

const FOCUS_OPTIONS = [
  "Ângulo de copy / Big Idea",
  "Estrutura de funil / CTA",
  "Avatar / Persona alvo",
  "Criativo visual / Hook visual",
]

interface FormState {
  productName: string
  ticket: string
  market: string
  uniqueSelling: string
  avatarText: string // textarea, será dividido em linhas
  focusAreas: string[]
  adsCount: number
}

const INITIAL: FormState = {
  productName: "",
  ticket: "",
  market: "BR",
  uniqueSelling: "",
  avatarText: "",
  focusAreas: [],
  adsCount: 100,
}

function parseAvatar(text: string): string[] {
  return text
    .split(/[\n,;]/)
    .map((s) => s.trim())
    .filter(Boolean)
}

function buildSpec(form: FormState) {
  const market = MARKETS.find((m) => m.value === form.market) ?? MARKETS[0]
  return {
    productName: form.productName,
    ticket: form.ticket || undefined,
    market: form.market,
    language: market.lang,
    uniqueSelling: form.uniqueSelling || undefined,
    avatar: parseAvatar(form.avatarText),
    focusAreas: form.focusAreas,
    adsCount: form.adsCount,
    topN: Math.min(50, Math.max(5, Math.floor(form.adsCount / 3))),
  }
}

export function NicheForm() {
  const router = useRouter()
  const [step, setStep] = useState<Step>("spec")
  const [form, setForm] = useState<FormState>(INITIAL)
  const [keywords, setKeywords] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [newKeyword, setNewKeyword] = useState("")

  const valid = form.productName.trim().length >= 3

  async function generatePreview() {
    setError(null)
    setLoading(true)
    try {
      const spec = buildSpec(form)
      const res = await fetch("/api/keywords/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(spec),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error ?? `Erro ${res.status}`)
      }
      const data = (await res.json()) as { keywords: string[] }
      setKeywords(data.keywords)
      setStep("keywords")
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  async function submitRun() {
    setError(null)
    setLoading(true)
    setStep("submitting")
    try {
      const spec = buildSpec(form)
      const res = await fetch("/api/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...spec, keywords }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(typeof j.error === "string" ? j.error : `Erro ${res.status}`)
      }
      const run = (await res.json()) as { id: string }
      router.push(`/runs/${run.id}`)
    } catch (err) {
      setError((err as Error).message)
      setStep("keywords")
    } finally {
      setLoading(false)
    }
  }

  function removeKeyword(kw: string) {
    setKeywords((prev) => prev.filter((k) => k !== kw))
  }

  function addKeyword() {
    const v = newKeyword.trim()
    if (v && !keywords.includes(v)) {
      setKeywords((prev) => [...prev, v])
      setNewKeyword("")
    }
  }

  return (
    <div className="glass ring-card rounded-2xl border border-white/5 p-8">
      {/* Step indicator */}
      <div className="flex items-center gap-3 mb-8">
        <StepDot active={step === "spec"} done={step !== "spec"} n={1} label="Spec" />
        <div className="flex-1 h-px bg-white/5" />
        <StepDot
          active={step === "keywords"}
          done={step === "submitting"}
          n={2}
          label="Keywords"
        />
        <div className="flex-1 h-px bg-white/5" />
        <StepDot active={step === "submitting"} done={false} n={3} label="Iniciar" />
      </div>

      {error && (
        <div className="mb-5 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* STEP 1: SPEC */}
      {step === "spec" && (
        <div className="grid gap-5">
          <Field
            label="Nome do produto / serviço"
            required
            value={form.productName}
            onChange={(v) => setForm({ ...form, productName: v })}
            placeholder="Ex: Criação de Landing Pages profissionais"
          />

          <Field
            label="Ticket / preço"
            value={form.ticket}
            onChange={(v) => setForm({ ...form, ticket: v })}
            placeholder="Ex: R$ 900"
          />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Mercado</Label>
              <select
                value={form.market}
                onChange={(e) => setForm({ ...form, market: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-accent-500/40"
              >
                {MARKETS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>Quantidade de anúncios</Label>
              <select
                value={form.adsCount}
                onChange={(e) => setForm({ ...form, adsCount: Number(e.target.value) })}
                className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-accent-500/40"
              >
                {ADS_COUNT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label} — {o.hint}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <Field
            label="Seu maior diferencial"
            value={form.uniqueSelling}
            onChange={(v) => setForm({ ...form, uniqueSelling: v })}
            placeholder="Ex: Entrega em 48-72h, preço imbatível…"
          />

          <div>
            <Label>Avatar / público-alvo</Label>
            <textarea
              rows={3}
              value={form.avatarText}
              onChange={(e) => setForm({ ...form, avatarText: e.target.value })}
              placeholder="Um por linha. Ex:&#10;Infoprodutores que querem mais vendas&#10;Médicos buscando pacientes&#10;E-commerces"
              className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 focus:outline-none focus:ring-2 focus:ring-accent-500/40 placeholder:text-zinc-500 text-sm resize-none"
            />
          </div>

          <div>
            <Label>Foco da análise (opcional)</Label>
            <div className="grid grid-cols-2 gap-2">
              {FOCUS_OPTIONS.map((f) => (
                <label
                  key={f}
                  className="flex items-center gap-2 cursor-pointer rounded-lg p-2 hover:bg-white/5 transition"
                >
                  <input
                    type="checkbox"
                    checked={form.focusAreas.includes(f)}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        focusAreas: e.target.checked
                          ? [...form.focusAreas, f]
                          : form.focusAreas.filter((x) => x !== f),
                      })
                    }
                    className="rounded accent-accent-500"
                  />
                  <span className="text-sm text-zinc-300">{f}</span>
                </label>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={generatePreview}
            disabled={!valid || loading}
            className="w-full py-3 rounded-xl bg-accent-600 hover:bg-accent-500 disabled:bg-accent-600/40 disabled:cursor-not-allowed text-white font-semibold text-sm transition flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Spinner /> Gerando keywords com IA…
              </>
            ) : (
              <>
                Gerar Keywords
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </>
            )}
          </button>
        </div>
      )}

      {/* STEP 2: KEYWORDS */}
      {step === "keywords" && (
        <div>
          <p className="text-sm text-zinc-400 mb-1">
            A IA gerou {keywords.length} palavras-chave estratégicas. Edite, remova ou adicione.
          </p>
          <p className="text-xs text-zinc-500 mb-5">
            Cada keyword vira uma busca na Biblioteca de Anúncios do FB.
          </p>

          <div className="flex flex-wrap gap-2 p-4 rounded-xl bg-black/20 border border-white/5 min-h-[80px] mb-4">
            {keywords.length === 0 && (
              <span className="text-xs text-zinc-500">Nenhuma keyword. Adicione abaixo.</span>
            )}
            {keywords.map((kw) => (
              <span
                key={kw}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-accent-500/10 border border-accent-500/20 text-accent-300 text-sm"
              >
                {kw}
                <button
                  type="button"
                  onClick={() => removeKeyword(kw)}
                  className="text-accent-400 hover:text-white transition"
                  aria-label={`remover ${kw}`}
                >
                  ×
                </button>
              </span>
            ))}
          </div>

          <div className="flex gap-2 mb-6">
            <input
              value={newKeyword}
              onChange={(e) => setNewKeyword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  addKeyword()
                }
              }}
              placeholder="Adicionar keyword manualmente…"
              className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 focus:outline-none focus:ring-2 focus:ring-accent-500/40 placeholder:text-zinc-500 text-sm"
            />
            <button
              type="button"
              onClick={addKeyword}
              className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-sm font-medium transition"
            >
              + Add
            </button>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setStep("spec")}
              className="px-5 py-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-sm font-medium transition"
            >
              ← Voltar
            </button>
            <button
              type="button"
              onClick={generatePreview}
              disabled={loading}
              className="px-5 py-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-sm font-medium transition disabled:opacity-50"
            >
              {loading ? <Spinner /> : "Regerar"}
            </button>
            <button
              type="button"
              onClick={submitRun}
              disabled={keywords.length === 0 || loading}
              className="flex-1 py-3 rounded-xl bg-accent-600 hover:bg-accent-500 disabled:bg-accent-600/40 disabled:cursor-not-allowed text-white font-semibold text-sm transition flex items-center justify-center gap-2"
            >
              Iniciar Spy Run ({form.adsCount} ads)
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: SUBMITTING */}
      {step === "submitting" && (
        <div className="py-12 text-center">
          <div className="w-10 h-10 mx-auto mb-4 rounded-full border-2 border-accent-500/30 border-t-accent-400 animate-spin" />
          <p className="text-sm text-zinc-300">Disparando sua Spy Run…</p>
          <p className="text-xs text-zinc-500 mt-1">Você será redirecionado em segundos.</p>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────
// Subcomponentes
// ─────────────────────────────────────────────

function StepDot({ active, done, n, label }: { active: boolean; done: boolean; n: number; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={`w-7 h-7 rounded-full grid place-items-center text-xs font-bold transition shrink-0 ${
          done
            ? "bg-accent-500 text-white"
            : active
              ? "bg-accent-500/20 text-accent-400 ring-1 ring-accent-500"
              : "bg-white/5 text-zinc-600"
        }`}
      >
        {done ? "✓" : n}
      </div>
      <span className={`text-xs ${active || done ? "text-zinc-300" : "text-zinc-600"}`}>
        {label}
      </span>
    </div>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return <label className="block text-sm font-medium text-zinc-300 mb-1.5">{children}</label>
}

function Field({
  label,
  required,
  value,
  onChange,
  placeholder,
}: {
  label: string
  required?: boolean
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  return (
    <div>
      <Label>
        {label}
        {required && <span className="text-red-400 ml-0.5">*</span>}
      </Label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 focus:outline-none focus:ring-2 focus:ring-accent-500/40 placeholder:text-zinc-500 text-sm"
      />
    </div>
  )
}

function Spinner() {
  return (
    <span className="w-4 h-4 inline-block rounded-full border-2 border-white/30 border-t-white animate-spin" />
  )
}
