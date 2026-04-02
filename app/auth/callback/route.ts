import { createSupabaseServerClient } from '@/lib/supabase-server'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Rota de callback do Supabase Auth (fluxo PKCE).
 * O Supabase redireciona para /auth/callback?code=... após login OAuth
 * ou confirmação de e-mail.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = await createSupabaseServerClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Algo deu errado — redirecionar para login com erro
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
}
