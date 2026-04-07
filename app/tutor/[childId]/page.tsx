import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'
import { TutorChat } from '@/components/tutor/TutorChat'
import type { Child } from '@/types'

export default async function TutorPage({
  params,
  searchParams,
}: {
  params: Promise<{ childId: string }>
  searchParams: Promise<{ t?: string }>
}) {
  const [{ childId }, { t: accessToken }] = await Promise.all([params, searchParams])

  // ── Caminho 1: acesso via token permanente (?t=uuid) ─────────────────────────
  if (accessToken) {
    const admin = createSupabaseAdminClient()
    const { data: tokenChild } = await admin
      .from('children')
      .select('*')
      .eq('id', childId)
      .eq('access_token', accessToken)
      .single()

    if (tokenChild) {
      return <TutorPageUI child={tokenChild as Child} backHref={null} />
    }
    // Token inválido para este childId → redireciona ao login
    redirect('/login')
  }

  // ── Caminho 2: acesso autenticado (pai) ───────────────────────────────────────
  const supabase = await createSupabaseServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: parentRow } = await supabase
    .from('users')
    .select('tenant_id')
    .eq('id', user.id)
    .in('role', ['pai', 'mae'])
    .single()

  if (!parentRow) redirect('/onboarding')

  const { data: child } = await supabase
    .from('children')
    .select('*')
    .eq('id', childId)
    .eq('tenant_id', parentRow.tenant_id)
    .single()

  if (!child) redirect('/dashboard')

  return <TutorPageUI child={child as Child} backHref="/dashboard" />
}

// ── UI compartilhada ──────────────────────────────────────────────────────────

function TutorPageUI({ child, backHref }: { child: Child; backHref: string | null }) {
  return (
    <div className="flex h-screen flex-col bg-gray-50">
      <header className="shrink-0 border-b border-gray-100 bg-white">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
          <div className="flex items-center gap-3">
            {backHref ? (
              <Link
                href={backHref}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
                aria-label="Voltar ao dashboard"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                  <path fillRule="evenodd" d="M11.78 5.22a.75.75 0 0 1 0 1.06L8.06 10l3.72 3.72a.75.75 0 1 1-1.06 1.06l-4.25-4.25a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 0Z" clipRule="evenodd" />
                </svg>
              </Link>
            ) : (
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#1D9E75]/10 text-sm font-bold text-[#1D9E75]">
                {child.name[0]}
              </div>
            )}
            <div>
              <p className="text-sm font-semibold text-gray-900">{child.name}</p>
              <p className="text-xs text-gray-400">
                {[child.grade, child.age ? `${child.age} anos` : null]
                  .filter(Boolean)
                  .join(' · ') || 'Tutor IA'}
              </p>
            </div>
          </div>

          <span className="flex items-center gap-1.5 rounded-full bg-[#1D9E75]/10 px-3 py-1 text-xs font-medium text-[#1D9E75]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#1D9E75] animate-pulse" />
            Tutor IA
          </span>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col overflow-hidden">
        <TutorChat child={child} />
      </div>
    </div>
  )
}
