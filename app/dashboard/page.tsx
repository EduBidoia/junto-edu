import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { ParentDashboard } from '@/components/dashboard/ParentDashboard'
import { LogoutMenu } from '@/components/dashboard/LogoutMenu'
import type { ParentProfile, Child, SessionHistory } from '@/types'

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient()

  // 1. Verificar sessão
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // 2. Buscar perfil do pai
  const { data: parentRow } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .in('role', ['pai', 'mae'])
    .single()

  // Sem perfil = primeiro acesso, ainda não fez onboarding
  if (!parentRow) redirect('/onboarding')

  const parent = parentRow as ParentProfile

  // 3. Buscar filhos da tabela children
  const { data: childrenRows } = await supabase
    .from('children')
    .select('id, name, grade, age, tenant_id, access_token')
    .eq('tenant_id', parent.tenant_id)
    .order('name')

  const children = (childrenRows ?? []) as Child[]

  // 4. Sem filhos = onboarding incompleto
  if (children.length === 0) redirect('/onboarding')

  // 5. Últimas aulas (sessões finalizadas)
  const { data: sessionRows } = children.length > 0
    ? await supabase
        .from('session_history')
        .select('id, child_id, subject, topic, started_at, duration_minutes, was_interrupted, depth_reached, conversation_summary')
        .in('child_id', children.map((c) => c.id))
        .not('ended_at', 'is', null)
        .order('started_at', { ascending: false })
        .limit(10)
    : { data: [] }

  const recentSessions = (sessionRows ?? []) as SessionHistory[]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top nav */}
      <header className="sticky top-0 z-10 border-b border-gray-100 bg-white">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
          <span className="text-base font-bold text-gray-900">
            Junto <span className="text-[#1D9E75]">EDU</span>
          </span>
          <LogoutMenu name={parent.name} email={user.email ?? ''} />
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8">
        <ParentDashboard parent={parent} children={children as Child[]} recentSessions={recentSessions} />
      </main>
    </div>
  )
}
