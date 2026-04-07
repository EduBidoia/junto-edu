import { createSupabaseAdminClient } from '@/lib/supabase-admin'
import { type NextRequest } from 'next/server'

/**
 * GET /api/children/token?token=[access_token]
 * Busca filho pelo token permanente sem exigir autenticação.
 * Usa service role para contornar RLS com segurança.
 */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token')
  if (!token) {
    return Response.json({ error: 'Token obrigatório.' }, { status: 400 })
  }

  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from('children')
    .select('id, name, grade, age, tenant_id')
    .eq('access_token', token)
    .single()

  if (error || !data) {
    return Response.json({ error: 'Link inválido.' }, { status: 404 })
  }

  return Response.json(data)
}
