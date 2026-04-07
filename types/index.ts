// ─── DB rows (espelham as tabelas do Supabase) ───────────────────────────────

export interface Tenant {
  id: string
  name: string          // nome da família, ex: "Família Silva"
  plan: string | null
  created_at: string
}

export type UserRole = 'pai' | 'mae' | 'filho'

/** Tabela pública `users` — perfil estendido do auth.users */
export interface UserProfile {
  id: string            // mesmo id do auth.users
  name: string
  role: UserRole
  tenant_id: string
  grade: string | null  // série escolar, só para alunos
  age: number | null    // idade, só para alunos
  created_at: string
}

// ─── Alias pai ────────────────────────────────────────────────────────────────

export type ParentProfile = UserProfile & { role: 'pai' | 'mae' }

// ─── Tabela children ─────────────────────────────────────────────────────────

export interface Child {
  id: string
  tenant_id: string
  name: string
  grade: string | null
  age: number | null
  access_token?: string
  created_at: string
}

// ─── Sessions ────────────────────────────────────────────────────────────────

export interface TutorSession {
  id: string
  student_id: string
  subject: string
  started_at: string
  ended_at?: string
  summary?: string
  messages: ChatMessage[]
}

export interface ChatMessage {
  id: string
  session_id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
}

// ─── Progress ────────────────────────────────────────────────────────────────

export interface ProgressReport {
  id: string
  student_id: string
  period: string
  subjects: SubjectProgress[]
  generated_at: string
}

export interface SubjectProgress {
  subject: string
  score: number // 0–100
  sessions_count: number
  highlight?: string
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface AuthSession {
  user: UserProfile
  access_token: string
  expires_at: number
}

// ─── Learning memory ──────────────────────────────────────────────────────────

export interface LearningMemory {
  id: string
  child_id: string
  subject: string
  topic: string
  last_position: string | null
  depth_level: number
  concepts_mastered: string[] | null
  concepts_struggling: string[] | null
  total_sessions: number
  total_minutes: number
  last_session_at: string | null
  created_at: string
  updated_at: string
}

export interface SessionHistory {
  id: string
  child_id: string
  subject: string
  topic: string
  started_at: string
  ended_at: string | null
  duration_minutes: number | null
  was_interrupted: boolean
  interrupted_at_phase: string | null
  depth_reached: number
  concepts_covered: string[] | null
  performance_score: number | null
  conversation_summary: string | null
  raw_messages: unknown
}

export interface EngagementMetric {
  id: string
  child_id: string
  session_id: string
  metric_type: string
  subject: string | null
  topic: string | null
  value: unknown
  occurred_at: string
}
