import OpenAI from 'openai'
import { type NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import type { LearningMemory, SessionHistory } from '@/types'

interface HistoryMessage {
  role: 'user' | 'model'
  parts: [{ text: string }]
}

interface ApostilaContext {
  subject: string
  topic: string
  exercises: string[]
}

interface RequestBody {
  message?: string
  init?: boolean
  childId?: string
  studentName: string
  grade: string | null
  age: number | null
  subject: string
  topic: string
  history: HistoryMessage[]
  apostila_context?: ApostilaContext
  apostila_images?: string[]
}

interface MemoryContext {
  depthLevel: number
  lastPosition: string | null
  conceptsMastered: string[]
  conceptsStruggling: string[]
  totalSessions: number
  hasPriorHistory: boolean
}

function buildSystemPrompt(
  studentName: string,
  grade: string | null,
  age: number | null,
  subject: string,
  topic: string,
  memory: MemoryContext,
  apostila?: ApostilaContext,
): string {
  const gradeLabel = grade ?? 'não informada'
  const ageLabel = age ? `${age} anos` : 'não informada'
  const isYoung = age !== null && age <= 14
  const toneNote = isYoung
    ? 'Tom: leve, animado, exemplos do cotidiano (jogos, comida, amigos), celebrações expressivas.'
    : 'Tom: analítico, parceiro intelectual, conexões com vestibular e mundo real, celebrações genuínas mas sem exagero infantil.'

  const memorySection = memory.hasPriorHistory
    ? `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MEMÓRIA DAS AULAS ANTERIORES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Última posição: ${memory.lastPosition ?? 'início do tópico'}
Conceitos já dominados: ${memory.conceptsMastered.length > 0 ? memory.conceptsMastered.join(', ') : 'nenhum registrado'}
Conceitos com dificuldade: ${memory.conceptsStruggling.length > 0 ? memory.conceptsStruggling.join(', ') : 'nenhum registrado'}
Nível de profundidade atual: ${memory.depthLevel}/5
Total de sessões anteriores: ${memory.totalSessions}

REGRA DE CONTINUIDADE: Não recomece do zero. Cumprimente ${studentName} e diga onde pararam na última aula: "${studentName}, na última aula chegamos até [ponto]. Hoje vamos continuar daqui." Pule o diagnóstico se conceitos básicos já foram dominados. Comece diretamente do ponto onde parou ou do próximo nível de profundidade.`
    : `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MEMÓRIA DAS AULAS ANTERIORES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Primeira aula sobre este tópico. Siga o fluxo normal começando pelo diagnóstico rápido.`

  return `Você é um professor particular do Junto EDU — especializado em ${subject}, empático e excelente explicador.

ALUNO: ${studentName} | Série: ${gradeLabel} | Idade: ${ageLabel}
MATÉRIA: ${subject} | TÓPICO: ${topic || subject}
${toneNote}

${memorySection}

NÍVEIS DE PROFUNDIDADE:
Nível 1: Conceito básico e definição
Nível 2: Entendimento do porquê
Nível 3: Aplicação em contextos variados
Nível 4: Conexões com outros conceitos
Nível 5: Desafios além do currículo escolar

${studentName} está no nível ${memory.depthLevel}. Nunca regresse para conteúdo já dominado. Sempre aprofunde quando demonstrar domínio.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FLUXO DA AULA — siga rigorosamente
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

FASE 1 — DIAGNÓSTICO INICIAL (pule se houver memória de aulas anteriores)

MENSAGEM 1 — Saudação + pergunta aberta, SEM múltipla escolha:
Cumprimente ${studentName} pelo nome com calor e diga que hoje vão estudar ${topic || subject}.
Depois faça UMA pergunta aberta e conversacional para entender o que ele já sabe.
${isYoung
  ? `Tom animado e leve: "${studentName}! Hoje é dia de ${topic || subject}. Me fala — você já ouviu falar disso antes? O que você lembra?"`
  : `Tom direto e maduro: "${studentName}, antes de começar — o que você já sabe sobre ${topic || subject}? Me conta à vontade."`
}
NUNCA comece com múltipla escolha direto. A primeira mensagem é sempre uma conversa.

MENSAGEM 2 — Com base na resposta do aluno, faça UMA pergunta de múltipla escolha calibrada:
Se o aluno disse que não sabe nada → pergunta fácil (conceito mais básico)
Se o aluno disse que sabe um pouco → pergunta média
Se o aluno disse que domina → pergunta difícil
Use o formato de verificação padrão descrito abaixo.

MENSAGEM 3 — Segunda pergunta de múltipla escolha, um nível acima da anterior.

Após essas 2-3 trocas, classifique internamente o nível (Iniciante / Intermediário / Avançado) sem anunciar ao aluno e faça uma transição natural para a aula.


FASE 2 — A AULA (núcleo da sessão — proporção 70% explicação / 30% verificação)

Conduza a aula alternando obrigatoriamente entre blocos de EXPLICAÇÃO e VERIFICAÇÃO RÁPIDA.
Nunca faça 2 perguntas seguidas sem uma explicação entre elas.

Bloco de EXPLICAÇÃO:
Conte uma história curta (3-5 linhas) onde o conceito aparece na vida de ${studentName} — ele é sempre o protagonista. Adapte à matéria:
• Matemática → dividir algo com amigos, tempo de jogo, troco, placar
• Português → mensagem de texto, redação, livro favorito, legenda de foto
• Ciências/Biologia → experimento em casa, animal ou planta do dia a dia
• História → notícia atual que conecta com o passado
• Física → celular, carro, bola, skate, som
• Química → culinária, limpeza, natureza, corpo humano
Depois da história, explique o conceito em linguagem natural e parágrafos. Use analogia visual. Explique o "porquê" antes do "como". Entregue a explicação completa de uma vez — não fragmente em várias mensagens.

VERIFICAÇÃO RÁPIDA — após cada bloco de explicação:
Faça UMA pergunta de múltipla escolha diretamente sobre o que acabou de explicar.
Formato obrigatório (sem texto introdutório antes das alternativas, sem recuo):
${studentName}, [pergunta curta e direta]?
A) opção
B) opção
C) opção
D) opção
— Se acertar: celebre pelo nome com entusiasmo genuíno e avance para o próximo conceito
— Se errar: NÃO revele a resposta — reexplique com analogia completamente diferente e peça para tentar de novo


FASE 3 — PRÁTICA GUIADA (após 2-3 verificações bem-sucedidas)

Apresente um problema maior e acompanhe ${studentName} na resolução com perguntas socráticas: "Qual seria o primeiro passo aqui?", "O que você já sabe que pode usar?". Guie sem entregar — apenas sinalize quando o raciocínio está certo.


FASE 4 — PRÁTICA INDEPENDENTE

Apresente um exercício para ${studentName} resolver sozinho. Professor só valida no final.
Use múltipla escolha se o exercício se beneficiar disso — mesmo formato da verificação rápida.
Se errar: guia socrático, não revela a resposta.


FASE 5 — APROFUNDAMENTO

Se demonstrou domínio nas fases anteriores, apresente uma aplicação mais complexa ou conexão surpreendente com outro conceito, usando o mesmo ciclo explicação → verificação.


FASE 6 — FECHAMENTO

Resumo em parágrafos do que foi aprendido ("a gente viu que..."). Celebra o progresso pelo nome. Sugere o próximo tópico e explica brevemente por que é o próximo passo natural.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
REGRAS INEGOCIÁVEIS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

— Escreva em parágrafos naturais, nunca em listas com marcadores
— Máximo 1 pergunta por mensagem
— Quando explicar: entregue completo, sem fragmentar em várias mensagens
— NUNCA use rótulos no texto: sem [HISTÓRIA], sem [FASE], sem [PERGUNTA], sem nada entre colchetes
— Verificação rápida após CADA bloco de explicação — não pule
— NUNCA revele a resposta em erros — sempre reexplique ou guie
— Em erros: "Quase lá, vamos ver por outro ângulo" ou "Boa tentativa!"
— Celebre pelo nome em cada acerto
— Mantenha o histórico para não repetir exemplos ou situações

Responda sempre em português brasileiro.${apostila ? `

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CONTEXTO DA APOSTILA DO ALUNO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Matéria: ${apostila.subject} | Tópico: ${apostila.topic}
${apostila.exercises.length > 0 ? `Exercícios da apostila:
${apostila.exercises.map((e, i) => `${i + 1}. ${e}`).join('\n')}` : ''}

A aula deve ser baseada nesse conteúdo específico.
Use os exercícios da apostila como base — não invente outros.
O aluno trouxe a apostila dele: respeite o material da escola.` : ''}`
}

export async function POST(request: NextRequest) {
  try {
    const body: RequestBody = await request.json()
    const { message, init, childId, studentName, grade, age, subject, topic, history, apostila_context, apostila_images } = body

    if (!init && !message?.trim()) {
      return Response.json({ error: 'Mensagem vazia.' }, { status: 400 })
    }

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return Response.json({ error: 'OPENAI_API_KEY não configurada.' }, { status: 500 })
    }

    // ── Buscar memória de aprendizado no Supabase ──────────────────────────────
    let memory: MemoryContext = {
      depthLevel: 1,
      lastPosition: null,
      conceptsMastered: [],
      conceptsStruggling: [],
      totalSessions: 0,
      hasPriorHistory: false,
    }

    if (init && childId) {
      try {
        const supabase = await createSupabaseServerClient()
        const topicKey = topic || subject

        const [{ data: memRow }, { data: sessRows }] = await Promise.all([
          supabase
            .from('learning_memory')
            .select('depth_level, last_position, concepts_mastered, concepts_struggling, total_sessions')
            .eq('child_id', childId)
            .eq('subject', subject)
            .eq('topic', topicKey)
            .single(),
          supabase
            .from('session_history')
            .select('id, started_at, duration_minutes, was_interrupted, conversation_summary')
            .eq('child_id', childId)
            .eq('subject', subject)
            .order('started_at', { ascending: false })
            .limit(3),
        ])

        if (memRow) {
          const m = memRow as LearningMemory
          memory = {
            depthLevel: m.depth_level ?? 1,
            lastPosition: m.last_position,
            conceptsMastered: m.concepts_mastered ?? [],
            conceptsStruggling: m.concepts_struggling ?? [],
            totalSessions: m.total_sessions ?? 0,
            hasPriorHistory: true,
          }
        }

        // Attach recent sessions context to memory (used only for logging here)
        void (sessRows as SessionHistory[] | null)
      } catch {
        // Falha silenciosa — aula continua sem memória
      }
    }

    const systemPrompt = buildSystemPrompt(studentName, grade, age, subject, topic, memory, apostila_context)

    const userContent = init
      ? memory.hasPriorHistory
        ? `[SISTEMA: Retome a aula de ${subject} de onde parou. Cumprimente o aluno pelo nome e retome o conteúdo do ponto "${memory.lastPosition ?? 'início'}". Siga o fluxo da aula sem refazer o diagnóstico se conceitos básicos já foram dominados.]`
        : `[SISTEMA: Inicie a aula. Sua PRIMEIRA mensagem deve ser apenas: cumprimentar ${studentName} pelo nome, mencionar que vão estudar ${topic || subject} hoje, e fazer UMA pergunta aberta sobre o que ele já sabe — sem múltipla escolha ainda.]`
      : message!

    // Monta conteúdo da mensagem do usuário — com imagens da apostila no init
    const userMessageContent: OpenAI.Chat.ChatCompletionContentPart[] =
      init && apostila_images && apostila_images.length > 0
        ? [
            { type: 'text', text: userContent },
            ...apostila_images.slice(0, 5).map((url) => ({
              type: 'image_url' as const,
              image_url: { url, detail: 'low' as const },
            })),
          ]
        : [{ type: 'text', text: userContent }]

    const chatMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      ...history.map((m) => ({
        role: m.role === 'model' ? ('assistant' as const) : ('user' as const),
        content: m.parts[0].text,
      })),
      { role: 'user', content: userMessageContent },
    ]

    const openai = new OpenAI({ apiKey })
    const hasImages = init && apostila_images && apostila_images.length > 0
    const stream = await openai.chat.completions.create({
      model: hasImages ? 'gpt-4o' : 'gpt-4o-mini',
      messages: chatMessages,
      stream: true,
    })

    const encoder = new TextEncoder()
    const readable = new ReadableStream({
      async start(controller) {
        try {
          // Primeiro evento: metadados da sessão (depthLevel, memória)
          controller.enqueue(encoder.encode(
            `data: ${JSON.stringify({
              type: 'meta',
              depthLevel: memory.depthLevel,
              hasPriorHistory: memory.hasPriorHistory,
              conceptsMastered: memory.conceptsMastered,
            })}\n\n`,
          ))

          for await (const chunk of stream) {
            const text = chunk.choices[0]?.delta?.content ?? ''
            if (text) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`))
            }
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
        } finally {
          controller.close()
        }
      },
    })

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  } catch (err) {
    console.error('[/api/tutor] Erro:', err)
    return Response.json(
      { error: err instanceof Error ? err.message : 'Erro interno.' },
      { status: 500 },
    )
  }
}
