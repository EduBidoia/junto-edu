import OpenAI from 'openai'
import { type NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json()

    if (!text?.trim()) {
      return Response.json({ error: 'Texto vazio.' }, { status: 400 })
    }

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return Response.json({ error: 'OPENAI_API_KEY não configurada.' }, { status: 500 })
    }

    const openai = new OpenAI({ apiKey })

    // OpenAI TTS aceita no máximo 4096 caracteres por chamada
    const input = text.slice(0, 4096)

    const mp3 = await openai.audio.speech.create({
      model: 'tts-1',
      voice: 'nova',
      input,
      response_format: 'mp3',
    })

    // Pipe the stream directly — evita buffering completo no servidor
    return new Response(mp3.body as ReadableStream, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'no-store',
        'Transfer-Encoding': 'chunked',
      },
    })
  } catch (err) {
    console.error('[/api/tts] Erro:', err)
    return Response.json(
      { error: err instanceof Error ? err.message : 'Erro interno.' },
      { status: 500 },
    )
  }
}
