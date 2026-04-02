import { createBrowserClient } from '@supabase/ssr'

/**
 * Client Supabase para uso em Client Components ('use client').
 * Usa createBrowserClient do @supabase/ssr para armazenar a sessão
 * em cookies (não localStorage), tornando-a visível ao proxy.ts no servidor.
 */
export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)
