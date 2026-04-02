import Link from 'next/link'
import { Card } from '@/components/ui/Card'
import { AddChildModal } from '@/components/dashboard/AddChildModal'
import type { ParentProfile, Child } from '@/types'

interface Props {
  parent: ParentProfile
  children: Child[]
}

export function ParentDashboard({ parent, children }: Props) {
  const firstName = parent.name.split(' ')[0]

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Olá, {firstName}!</h1>
        <p className="text-sm text-gray-500 mt-1">Acompanhe o progresso dos seus filhos</p>
      </div>

      {/* Children cards */}
      <section>
        <h2 className="text-base font-semibold text-gray-700 mb-3">Seus filhos</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {children.map((child) => (
            <Link
              key={child.id}
              href={`/tutor/${child.id}`}
              className="block rounded-2xl border border-gray-100 bg-white shadow-sm p-6 hover:border-[#1D9E75]/40 hover:shadow-md transition-all"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#1D9E75]/10 text-lg font-bold text-[#1D9E75]">
                  {child.name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{child.name}</p>
                  <p className="text-xs text-gray-500">
                    {[child.grade, child.age ? `${child.age} anos` : null]
                      .filter(Boolean)
                      .join(' · ') || 'Sem informações'}
                  </p>
                </div>
                <span className="shrink-0 rounded-lg bg-[#1D9E75]/10 px-3 py-1.5 text-xs font-medium text-[#1D9E75]">
                  Tutor →
                </span>
              </div>
            </Link>
          ))}
        </div>

        <AddChildModal tenantId={parent.tenant_id} />
      </section>

      {/* Empty state for activity */}
      <section>
        <h2 className="text-base font-semibold text-gray-700 mb-3">Atividade recente</h2>
        <Card padding="sm">
          <p className="py-6 text-center text-sm text-gray-400">
            As sessões de tutoria aparecerão aqui.
          </p>
        </Card>
      </section>
    </div>
  )
}
