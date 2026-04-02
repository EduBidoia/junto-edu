'use client'

import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'

export function LoginForm() {
  // TODO: wire up Supabase auth
  return (
    <Card className="w-full max-w-md mx-auto">
      <div className="flex flex-col gap-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Entrar no Junto EDU</h1>
          <p className="mt-1 text-sm text-gray-500">Acompanhe o aprendizado do seu filho</p>
        </div>

        <form className="flex flex-col gap-4">
          <Input
            id="email"
            label="E-mail"
            type="email"
            placeholder="seu@email.com"
            autoComplete="email"
          />
          <Input
            id="password"
            label="Senha"
            type="password"
            placeholder="••••••••"
            autoComplete="current-password"
          />

          <Button type="submit" size="lg" className="w-full mt-2">
            Entrar
          </Button>
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-100" />
          </div>
          <div className="relative flex justify-center text-xs text-gray-400">
            <span className="bg-white px-2">ou continue com</span>
          </div>
        </div>

        <Button variant="outline" size="lg" className="w-full">
          {/* TODO: Google OAuth icon */}
          Entrar com Google
        </Button>

        <p className="text-center text-xs text-gray-500">
          Não tem conta?{' '}
          <a href="#" className="font-medium text-[#1D9E75] hover:underline">
            Fale com a escola
          </a>
        </p>
      </div>
    </Card>
  )
}
