import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { ParentDashboard } from '@/components/dashboard/ParentDashboard'
import type { ParentProfile, Child } from '@/types'

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
    .select('id, name, grade, age, tenant_id')
    .eq('tenant_id', parent.tenant_id)
    .order('name')

  const children = (childrenRows ?? []) as Child[]

  // 4. Sem filhos = onboarding incompleto
  if (children.length === 0) redirect('/onboarding')

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top nav */}
      <header className="sticky top-0 z-10 border-b border-gray-100 bg-white">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
          <span className="text-base font-bold text-gray-900">
            Junto <span className="text-[#1D9E75]">EDU</span>
          </span>
          <nav className="flex items-center gap-4">
            <Link
              href="/tutor"
              className="text-sm font-medium text-gray-600 hover:text-[#1D9E75] transition-colors"
            >
              Tutor IA
            </Link>
            <div
              title={parent.name}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1D9E75]/10 text-sm font-bold text-[#1D9E75]"
            >
              {parent.name[0]}
            </div>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8">
        <ParentDashboard parent={parent} children={children as Child[]} />
      </main>
    </div>
  )
}
