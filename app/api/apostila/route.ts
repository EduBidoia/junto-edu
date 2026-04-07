import OpenAI from 'openai'
import { type NextRequest } from 'next/server'

interface ApostilaResponse {
  subject: string
  topic: string
  exercises: string[]
  level: string
}

export async function POST(request: NextRequest) {
  try {
    const { images } = await request.json() as { images: string[] }

    if (!Array.isArray(images) || images.length === 0) {
      return Response.json({ error: 'Nenhuma imagem recebida.' }, { status: 400 })
    }

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return Response.json({ error: 'OPENAI_API_KEY não configurada.' }, { status: 500 })
    }

    const openai = new OpenAI({ apiKey })

    // Monta array de conteúdo: texto + imagens (max 5)
    const imageContent: OpenAI.Chat.ChatCompletionContentPart[] = images
      .slice(0, 5)
      .map((dataUrl) => ({
        type: 'image_url' as const,
        image_url: { url: dataUrl, detail: 'low' as const },
      }))

    const res = await openai.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 500,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Analise estas páginas de apostila escolar. Identifique:
1. Matéria (ex: Matemática, Português, Ciências, História, Geografia, Física, Química, Biologia, Inglês, Literatura, Redação, Filosofia, Sociologia)
2. Tópico específico (ex: Frações mistas, Análise sintática, Segunda Guerra Mundial)
3. Liste os exercícios encontrados (máximo 5, resumidos em 1 linha cada — diga o que o aluno deve fazer)
4. Nível aparente do conteúdo: "fundamental 1", "fundamental 2" ou "ensino médio"

Retorne SOMENTE um JSON válido, sem markdown, sem explicações adicionais:
{"subject":"...", "topic":"...", "exercises":["...","..."], "level":"..."}`,
            },
            ...imageContent,
          ],
        },
      ],
    })

    const raw = res.choices[0]?.message?.content?.trim() ?? ''

    // Remove possíveis blocos de código markdown que o modelo pode incluir
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()

    let parsed: ApostilaResponse
    try {
      parsed = JSON.parse(cleaned)
    } catch {
      console.error('[/api/apostila] JSON inválido do modelo:', raw)
      return Response.json({ error: 'Não consegui identificar o conteúdo da apostila.' }, { status: 422 })
    }

    // Garante campos obrigatórios
    if (!parsed.subject || !parsed.topic) {
      return Response.json({ error: 'Apostila não identificada. Tente uma foto mais nítida.' }, { status: 422 })
    }

    return Response.json({
      subject: parsed.subject,
      topic: parsed.topic,
      exercises: Array.isArray(parsed.exercises) ? parsed.exercises.slice(0, 5) : [],
      level: parsed.level ?? '',
    } satisfies ApostilaResponse)
  } catch (err) {
    console.error('[/api/apostila] Erro:', err)
    return Response.json(
      { error: err instanceof Error ? err.message : 'Erro interno.' },
      { status: 500 },
    )
  }
}
