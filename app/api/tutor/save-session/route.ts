import OpenAI from 'openai'
import { type NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import type { LearningMemory } from '@/types'

interface SaveSessionBody {
  session_id: string
  child_id: string
  subject: string
  topic: string
  messages: Array<{ role: string; content: string }>
  duration_minutes: number
  was_interrupted: boolean
  interrupted_at_phase: string | null
  depth_reached: number
  concepts_covered: string[]
  performance_score: number | null
}

export async function POST(request: NextRequest) {
  try {
    const body: SaveSessionBody = await request.json()
    const {
      session_id, child_id, subject, topic,
      messages, duration_minutes, was_interrupted,
      interrupted_at_phase, depth_reached,
      concepts_covered, performance_score,
    } = body

    const supabase = await createSupabaseServerClient()
    const now = new Date().toISOString()
    const topicKey = topic || subject

    // ── 1. Gerar resumo via IA ─────────────────────────────────────────────────
    let conversationSummary: string | null = null
    if (messages.length > 2) {
      try {
        const apiKey = process.env.OPENAI_API_KEY
        if (apiKey) {
          const openai = new OpenAI({ apiKey })
          const transcript = messages
            .slice(-20)
            .map((m) => `${m.role === 'model' ? 'Professor' : 'Aluno'}: ${m.content}`)
            .join('\n')

          const res = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
              {
                role: 'system',
                content: 'Você escreve resumos curtos de aulas de tutoria para os pais verem no app. Seja direto, positivo e em português brasileiro.',
              },
              {
                role: 'user',
                content: `Resuma esta aula de ${subject} sobre "${topicKey}" em 2-3 frases para o pai do aluno. Mencione o que foi aprendido e qualquer progresso notável.\n\n${transcript}`,
              },
            ],
            max_tokens: 160,
          })
          conversationSummary = res.choices[0]?.message?.content?.trim() ?? null
        }
      } catch {
        // Resumo é opcional — falha silenciosa
      }
    }

    // ── 2. Finalizar registro da sessão ───────────────────────────────────────
    await supabase
      .from('session_history')
      .update({
        ended_at: now,
        duration_minutes,
        was_interrupted,
        interrupted_at_phase,
        depth_reached,
        concepts_covered: concepts_covered.length > 0 ? concepts_covered : null,
        performance_score,
        conversation_summary: conversationSummary,
        raw_messages: messages,
      })
      .eq('id', session_id)

    // ── 3. Upsert learning_memory ─────────────────────────────────────────────
    const { data: existing } = await supabase
      .from('learning_memory')
      .select('depth_level, concepts_mastered, total_sessions, total_minutes')
      .eq('child_id', child_id)
      .eq('subject', subject)
      .eq('topic', topicKey)
      .single()

    const prev = existing as LearningMemory | null
    const newDepthLevel = Math.max(prev?.depth_level ?? 1, depth_reached)
    const mergedMastered = [
      ...new Set([...(prev?.concepts_mastered ?? []), ...concepts_covered]),
    ]

    const lastPosition = interrupted_at_phase
      ?? (depth_reached >= 4 ? 'aprofundamento' : depth_reached >= 3 ? 'prática' : 'explicação')

    await supabase
      .from('learning_memory')
      .upsert(
        {
          child_id,
          subject,
          topic: topicKey,
          last_position: lastPosition,
          depth_level: newDepthLevel,
          concepts_mastered: mergedMastered.length > 0 ? mergedMastered : null,
          total_sessions: (prev?.total_sessions ?? 0) + 1,
          total_minutes: (prev?.total_minutes ?? 0) + duration_minutes,
          last_session_at: now,
          updated_at: now,
        },
        { onConflict: 'child_id,subject,topic' },
      )

    // ── 4. Registrar métrica de engajamento ───────────────────────────────────
    await supabase
      .from('engagement_metrics')
      .insert({
        child_id,
        session_id,
        metric_type: 'session_completed',
        subject,
        topic: topicKey,
        value: {
          duration_minutes,
          depth_reached,
          was_interrupted,
          performance_score,
          concepts_count: concepts_covered.length,
        },
        occurred_at: now,
      })

    return Response.json({ ok: true, summary: conversationSummary })
  } catch (err) {
    console.error('[/api/tutor/save-session] Erro:', err)
    return Response.json(
      { error: err instanceof Error ? err.message : 'Erro interno.' },
      { status: 500 },
    )
  }
}
