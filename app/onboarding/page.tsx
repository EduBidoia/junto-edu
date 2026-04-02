'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

// ─── Tipos locais do formulário ───────────────────────────────────────────────

interface Step1Data {
  familyName: string
  parentName: string
}

interface Step2Data {
  childName: string
  grade: string
  age: string
}

const GRADES = [
  '1º ano EF', '2º ano EF', '3º ano EF', '4º ano EF', '5º ano EF',
  '6º ano EF', '7º ano EF', '8º ano EF', '9º ano EF',
  '1º ano EM', '2º ano EM', '3º ano EM',
]

// ─── Componente principal ─────────────────────────────────────────────────────

export default function OnboardingPage() {
  const [step, setStep] = useState<1 | 2>(1)
  const [step1, setStep1] = useState<Step1Data>({ familyName: '', parentName: '' })
  const [step2, setStep2] = useState<Step2Data>({ childName: '', grade: '', age: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // ─── Salvar no Supabase ─────────────────────────────────────────────────────

  async function handleFinish() {
    setError(null)
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError('Sessão expirada. Faça login novamente.'); setLoading(false); return }

    // 1. Criar tenant (família)
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .insert({ name: step1.familyName })
      .select('id')
      .single()

    if (tenantError || !tenant) {
      setError(tenantError?.message ?? 'Erro ao criar família.')
      setLoading(false)
      return
    }

    // 2. Criar perfil do pai (upsert: cria ou atualiza se já existir)
    const { error: parentError } = await supabase
      .from('users')
      .upsert({
        id: user.id,
        name: step1.parentName,
        role: 'pai',
        tenant_id: tenant.id,
        grade: null,
        age: null,
      })

    if (parentError) {
      setError(parentError.message)
      setLoading(false)
      return
    }

    // 3. Inserir filho na tabela children
    const { error: childError } = await supabase
      .from('children')
      .insert({
        id: crypto.randomUUID(),
        tenant_id: tenant.id,
        name: step2.childName,
        grade: step2.grade || null,
        age: step2.age ? parseInt(step2.age, 10) : null,
      })

    if (childError) {
      setError(childError.message)
      setLoading(false)
      return
    }

    window.location.href = '/dashboard'
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4 py-12">
      {/* Logo */}
      <div className="mb-8 flex flex-col items-center gap-2">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#1D9E75]">
          <span className="text-xl font-bold text-white">J</span>
        </div>
        <span className="text-xl font-bold text-gray-900">
          Junto <span className="text-[#1D9E75]">EDU</span>
        </span>
      </div>

      {/* Card */}
      <div className="w-full max-w-md rounded-2xl border border-gray-100 bg-white p-8 shadow-sm">

        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-500">Etapa {step} de 2</span>
            <span className="text-xs font-medium text-[#1D9E75]">{step === 1 ? '50%' : '100%'}</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-gray-100">
            <div
              className="h-1.5 rounded-full bg-[#1D9E75] transition-all duration-300"
              style={{ width: step === 1 ? '50%' : '100%' }}
            />
          </div>
        </div>

        {step === 1 ? (
          <Step1
            data={step1}
            onChange={setStep1}
            onNext={() => setStep(2)}
          />
        ) : (
          <Step2
            data={step2}
            onChange={setStep2}
            onBack={() => setStep(1)}
            onFinish={handleFinish}
            loading={loading}
            error={error}
          />
        )}
      </div>
    </div>
  )
}

// ─── Etapa 1: Família e pai ───────────────────────────────────────────────────

function Step1({
  data,
  onChange,
  onNext,
}: {
  data: Step1Data
  onChange: (d: Step1Data) => void
  onNext: () => void
}) {
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onNext()
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Vamos começar!</h1>
        <p className="mt-1 text-sm text-gray-500">Nos conte um pouco sobre a sua família.</p>
      </div>

      <Field
        id="familyName"
        label="Nome da família"
        placeholder="Ex: Família Silva"
        value={data.familyName}
        onChange={(v) => onChange({ ...data, familyName: v })}
        required
      />

      <Field
        id="parentName"
        label="Seu nome completo"
        placeholder="Ex: Maria Silva"
        value={data.parentName}
        onChange={(v) => onChange({ ...data, parentName: v })}
        required
      />

      <button
        type="submit"
        className="mt-2 flex h-11 w-full items-center justify-center rounded-lg bg-[#1D9E75] text-sm font-semibold text-white transition-colors hover:bg-[#178a64]"
      >
        Próximo →
      </button>
    </form>
  )
}

// ─── Etapa 2: Primeiro filho ──────────────────────────────────────────────────

function Step2({
  data,
  onChange,
  onBack,
  onFinish,
  loading,
  error,
}: {
  data: Step2Data
  onChange: (d: Step2Data) => void
  onBack: () => void
  onFinish: () => void
  loading: boolean
  error: string | null
}) {
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onFinish()
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Adicionar filho</h1>
        <p className="mt-1 text-sm text-gray-500">Você poderá adicionar mais filhos depois.</p>
      </div>

      <Field
        id="childName"
        label="Nome do filho"
        placeholder="Ex: Ana Silva"
        value={data.childName}
        onChange={(v) => onChange({ ...data, childName: v })}
        required
      />

      {/* Série */}
      <div className="flex flex-col gap-1">
        <label htmlFor="grade" className="text-sm font-medium text-gray-700">
          Série <span className="text-gray-400 font-normal">(opcional)</span>
        </label>
        <select
          id="grade"
          value={data.grade}
          onChange={(e) => onChange({ ...data, grade: e.target.value })}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none transition-colors focus:border-[#1D9E75] focus:ring-2 focus:ring-[#1D9E75]/20 bg-white text-gray-700"
        >
          <option value="">Selecione a série</option>
          {GRADES.map((g) => (
            <option key={g} value={g}>{g}</option>
          ))}
        </select>
      </div>

      {/* Idade */}
      <div className="flex flex-col gap-1">
        <label htmlFor="age" className="text-sm font-medium text-gray-700">
          Idade <span className="text-gray-400 font-normal">(opcional)</span>
        </label>
        <input
          id="age"
          type="number"
          min={4}
          max={20}
          value={data.age}
          onChange={(e) => onChange({ ...data, age: e.target.value })}
          placeholder="Ex: 12"
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none transition-colors placeholder:text-gray-400 focus:border-[#1D9E75] focus:ring-2 focus:ring-[#1D9E75]/20"
        />
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
      )}

      <div className="flex gap-3 mt-2">
        <button
          type="button"
          onClick={onBack}
          className="flex h-11 w-full items-center justify-center rounded-lg border border-gray-200 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50"
        >
          ← Voltar
        </button>
        <button
          type="submit"
          disabled={loading}
          className="flex h-11 w-full items-center justify-center rounded-lg bg-[#1D9E75] text-sm font-semibold text-white transition-colors hover:bg-[#178a64] disabled:opacity-60"
        >
          {loading ? 'Salvando...' : 'Concluir'}
        </button>
      </div>
    </form>
  )
}

// ─── Campo reutilizável ───────────────────────────────────────────────────────

function Field({
  id, label, placeholder, value, onChange, required,
}: {
  id: string
  label: string
  placeholder: string
  value: string
  onChange: (v: string) => void
  required?: boolean
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium text-gray-700">{label}</label>
      <input
        id={id}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none transition-colors placeholder:text-gray-400 focus:border-[#1D9E75] focus:ring-2 focus:ring-[#1D9E75]/20"
      />
    </div>
  )
}
