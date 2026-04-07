import { createClient } from '@supabase/supabase-js'

/**
 * Client Supabase com service role — ignora RLS.
 * Usar APENAS em server-side (API routes, Server Components).
 * Nunca expor ao browser.
 */
export function createSupabaseAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}
