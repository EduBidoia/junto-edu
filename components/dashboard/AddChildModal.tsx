'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const GRADES = [
  '1º ano EF', '2º ano EF', '3º ano EF', '4º ano EF', '5º ano EF',
  '6º ano EF', '7º ano EF', '8º ano EF', '9º ano EF',
  '1º ano EM', '2º ano EM', '3º ano EM',
]

interface Props {
  tenantId: string
}

export function AddChildModal({ tenantId }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [grade, setGrade] = useState('')
  const [age, setAge] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleOpen() {
    setName('')
    setGrade('')
    setAge('')
    setError(null)
    setOpen(true)
  }

  function handleClose() {
    if (loading) return
    setOpen(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { error: insertError } = await supabase.from('children').insert({
      id: crypto.randomUUID(),
      tenant_id: tenantId,
      name: name.trim(),
      grade: grade || null,
      age: age ? parseInt(age, 10) : null,
    })

    setLoading(false)

    if (insertError) {
      setError(insertError.message)
      return
    }

    setOpen(false)
    router.refresh()
  }

  return (
    <>
      <button
        onClick={handleOpen}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[#1D9E75]/30 py-3 text-sm font-medium text-[#1D9E75] transition-colors hover:border-[#1D9E75]/60 hover:bg-[#1D9E75]/5"
      >
        <span className="text-lg leading-none">+</span>
        Adicionar filho
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={(e) => { if (e.target === e.currentTarget) handleClose() }}
        >
          <div className="w-full max-w-md rounded-2xl border border-gray-100 bg-white p-6 shadow-xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Adicionar filho</h2>
              <button
                onClick={handleClose}
                className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                aria-label="Fechar"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {/* Nome */}
              <div className="flex flex-col gap-1">
                <label htmlFor="child-name" className="text-sm font-medium text-gray-700">
                  Nome
                </label>
                <input
                  id="child-name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Ana Silva"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none transition-colors placeholder:text-gray-400 focus:border-[#1D9E75] focus:ring-2 focus:ring-[#1D9E75]/20"
                />
              </div>

              {/* Série */}
              <div className="flex flex-col gap-1">
                <label htmlFor="child-grade" className="text-sm font-medium text-gray-700">
                  Série <span className="font-normal text-gray-400">(opcional)</span>
                </label>
                <select
                  id="child-grade"
                  value={grade}
                  onChange={(e) => setGrade(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none transition-colors focus:border-[#1D9E75] focus:ring-2 focus:ring-[#1D9E75]/20"
                >
                  <option value="">Selecione a série</option>
                  {GRADES.map((g) => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>

              {/* Idade */}
              <div className="flex flex-col gap-1">
                <label htmlFor="child-age" className="text-sm font-medium text-gray-700">
                  Idade <span className="font-normal text-gray-400">(opcional)</span>
                </label>
                <input
                  id="child-age"
                  type="number"
                  min={4}
                  max={20}
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  placeholder="Ex: 12"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none transition-colors placeholder:text-gray-400 focus:border-[#1D9E75] focus:ring-2 focus:ring-[#1D9E75]/20"
                />
              </div>

              {error && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
              )}

              <div className="mt-1 flex gap-3">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={loading}
                  className="flex h-11 w-full items-center justify-center rounded-lg border border-gray-200 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex h-11 w-full items-center justify-center rounded-lg bg-[#1D9E75] text-sm font-semibold text-white transition-colors hover:bg-[#178a64] disabled:opacity-60"
                >
                  {loading ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
