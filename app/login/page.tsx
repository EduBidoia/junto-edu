'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Mode = 'login' | 'signup'

export default function LoginPage() {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setInfo(null)
    setLoading(true)

    if (mode === 'login') {
      const result = await supabase!.auth.signInWithPassword({ email, password })
      console.log('[login] signInWithPassword result:', result)
      if (result.error) {
        setError(result.error.message)
      } else {
        // Navegação full-page para o proxy.ts reler os cookies de sessão recém-criados.
        window.location.href = '/dashboard'
      }
    } else {
      const { data, error } = await supabase!.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      })
      if (error) {
        setError(error.message)
      } else if (data.session) {
        // Email confirmation disabled — session created immediately
        window.location.href = '/dashboard'
      } else {
        setInfo('Verifique seu e-mail para confirmar o cadastro.')
        setEmail('')
        setPassword('')
      }
    }

    setLoading(false)
  }

  function toggleMode() {
    setMode((m) => (m === 'login' ? 'signup' : 'login'))
    setError(null)
    setInfo(null)
  }

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
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-gray-900">
            {mode === 'login' ? 'Entrar na conta' : 'Criar conta'}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {mode === 'login'
              ? 'Acompanhe o aprendizado do seu filho'
              : 'Comece a acompanhar o aprendizado'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Email */}
          <div className="flex flex-col gap-1">
            <label htmlFor="email" className="text-sm font-medium text-gray-700">
              E-mail
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              required
              autoComplete="email"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none transition-colors placeholder:text-gray-400 focus:border-[#1D9E75] focus:ring-2 focus:ring-[#1D9E75]/20"
            />
          </div>

          {/* Senha */}
          <div className="flex flex-col gap-1">
            <label htmlFor="password" className="text-sm font-medium text-gray-700">
              Senha
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={6}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none transition-colors placeholder:text-gray-400 focus:border-[#1D9E75] focus:ring-2 focus:ring-[#1D9E75]/20"
            />
            {mode === 'signup' && (
              <p className="text-xs text-gray-400">Mínimo 6 caracteres</p>
            )}
          </div>

          {/* Feedback */}
          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
            </p>
          )}
          {info && (
            <p className="rounded-lg bg-[#1D9E75]/10 px-3 py-2 text-sm text-[#1D9E75]">
              {info}
            </p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="mt-2 flex h-11 w-full items-center justify-center rounded-lg bg-[#1D9E75] text-sm font-semibold text-white transition-colors hover:bg-[#178a64] disabled:opacity-60"
          >
            {loading
              ? 'Aguarde...'
              : mode === 'login'
              ? 'Entrar'
              : 'Criar conta'}
          </button>
        </form>

        {/* Toggle */}
        <p className="mt-6 text-center text-sm text-gray-500">
          {mode === 'login' ? 'Não tem conta?' : 'Já tem conta?'}{' '}
          <button
            type="button"
            onClick={toggleMode}
            className="font-semibold text-[#1D9E75] hover:underline"
          >
            {mode === 'login' ? 'Criar conta' : 'Entrar'}
          </button>
        </p>
      </div>
    </div>
  )
}
