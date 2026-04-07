import Link from 'next/link'
import { Card } from '@/components/ui/Card'
import { AddChildModal } from '@/components/dashboard/AddChildModal'
import { ShareChildButton } from '@/components/dashboard/ShareChildButton'
import type { ParentProfile, Child, SessionHistory } from '@/types'

interface Props {
  parent: ParentProfile
  children: Child[]
  recentSessions: SessionHistory[]
}

function formatDuration(minutes: number | null): string {
  if (!minutes) return '< 1 min'
  if (minutes < 60) return `${minutes} min`
  return `${Math.floor(minutes / 60)}h ${minutes % 60}min`
}

function depthLabel(level: number): string {
  return ['', 'Básico', 'Intermediário', 'Avançado', 'Aprofundado', 'Expert'][level] ?? `Nível ${level}`
}

export function ParentDashboard({ parent, children, recentSessions }: Props) {
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
            <div key={child.id} className="flex flex-col gap-3 rounded-2xl border border-gray-100 bg-white shadow-sm p-5 hover:border-[#1D9E75]/40 hover:shadow-md transition-all">
              <Link href={`/tutor/${child.id}`} className="flex items-center gap-4">
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
              </Link>

              {child.access_token && (
                <div className="flex items-center justify-between border-t border-gray-50 pt-3">
                  <p className="text-xs text-gray-400">
                    Mande o link para {child.name.split(' ')[0]} acessar pelo celular
                  </p>
                  <ShareChildButton
                    childName={child.name.split(' ')[0]}
                    accessToken={child.access_token}
                  />
                </div>
              )}
            </div>
          ))}
        </div>

        <AddChildModal tenantId={parent.tenant_id} />
      </section>

      {/* Últimas aulas */}
      <section>
        <h2 className="text-base font-semibold text-gray-700 mb-3">Últimas aulas</h2>
        {recentSessions.length === 0 ? (
          <Card padding="sm">
            <p className="py-6 text-center text-sm text-gray-400">
              As sessões de tutoria aparecerão aqui após a primeira aula.
            </p>
          </Card>
        ) : (
          <div className="flex flex-col gap-3">
            {recentSessions.map((session) => {
              const child = children.find((c) => c.id === session.child_id)
              return (
                <Card key={session.id} padding="sm">
                  <div className="flex items-start gap-3">
                    {/* Avatar do filho */}
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#1D9E75]/10 text-sm font-bold text-[#1D9E75]">
                      {child?.name[0] ?? '?'}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-gray-900 truncate">
                          {session.subject}
                          {session.topic && session.topic !== session.subject && (
                            <span className="font-normal text-gray-500"> · {session.topic}</span>
                          )}
                        </span>
                        {session.was_interrupted && (
                          <span title="Aula interrompida" className="flex items-center gap-1 rounded-full bg-orange-50 px-2 py-0.5 text-[10px] font-medium text-orange-500">
                            ⚠ interrompida
                          </span>
                        )}
                      </div>

                      <div className="mt-0.5 flex items-center gap-3 text-xs text-gray-400">
                        {child && <span>{child.name}</span>}
                        <span>{formatDuration(session.duration_minutes)}</span>
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-gray-500">
                          {depthLabel(session.depth_reached)}
                        </span>
                        <span>
                          {new Date(session.started_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                        </span>
                      </div>

                      {session.conversation_summary && (
                        <p className="mt-1.5 text-xs text-gray-500 leading-relaxed line-clamp-2">
                          {session.conversation_summary}
                        </p>
                      )}
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
