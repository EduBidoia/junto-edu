import Link from 'next/link'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'
import { TutorChat } from '@/components/tutor/TutorChat'
import type { Child } from '@/types'

export default async function AcessoPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params

  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from('children')
    .select('id, name, grade, age, tenant_id')
    .eq('access_token', token)
    .single()

  if (error || !data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-100 mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-7 w-7 text-red-500">
            <path fillRule="evenodd" d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003ZM12 8.25a.75.75 0 0 1 .75.75v3.75a.75.75 0 0 1-1.5 0V9a.75.75 0 0 1 .75-.75Zm0 8.25a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z" clipRule="evenodd" />
          </svg>
        </div>
        <h1 className="text-lg font-bold text-gray-900 mb-1">Link inválido</h1>
        <p className="text-sm text-gray-500 text-center max-w-xs">
          Este link de acesso não existe ou foi desativado. Peça ao responsável um novo link.
        </p>
      </div>
    )
  }

  const child = data as Child

  return (
    <div className="flex h-screen flex-col bg-gray-50">
      {/* Header */}
      <header className="shrink-0 border-b border-gray-100 bg-white">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#1D9E75]/10 text-sm font-bold text-[#1D9E75]">
              {child.name[0]}
            </div>
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

      {/* Chat */}
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col overflow-hidden">
        <TutorChat child={child} />
      </div>
    </div>
  )
}
