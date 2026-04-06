'use client'

import { useState, useRef, useEffect } from 'react'
import { MATERIAS, TOPICOS } from '@/lib/materias'
import { supabase } from '@/lib/supabase'
import type { Child } from '@/types'

interface Message {
  role: 'user' | 'model'
  text: string
}

interface HistoryItem {
  role: 'user' | 'model'
  parts: [{ text: string }]
}

interface Choice {
  letter: string
  text: string
}

interface ParsedMessage {
  preamble: string
  choices: Choice[]
}

/** Detecta alternativas no formato "A) texto", uma por linha */
function parseChoices(text: string): ParsedMessage | null {
  const lines = text.split('\n')
  const choiceLines: Choice[] = []
  const preambleLines: string[] = []
  let inChoices = false

  for (const line of lines) {
    const match = line.match(/^([A-D])\)\s*(.+)$/)
    if (match) {
      inChoices = true
      choiceLines.push({ letter: match[1], text: match[2].trim() })
    } else {
      if (!inChoices) preambleLines.push(line)
    }
  }

  if (choiceLines.length < 2) return null
  return { preamble: preambleLines.join('\n').trim(), choices: choiceLines }
}

/**
 * Limpa texto antes de enviar ao TTS:
 * - Remove marcadores visuais ([HISTÓRIA], [PERGUNTA])
 * - Remove linhas de alternativas (A) B) C) D))
 * - Remove markdown (**bold**, *italic*, ## header)
 * - Remove caracteres decorativos
 */
function stripForTTS(text: string): string {
  return text
    .replace(/\[HISTÓRIA\]/gi, '')
    .replace(/\[PERGUNTA\]/gi, '')
    .replace(/^[A-D]\)\s*.+$/gm, '')        // linhas de alternativas
    .replace(/\*\*(.+?)\*\*/g, '$1')         // bold
    .replace(/\*(.+?)\*/g, '$1')             // italic
    .replace(/^#{1,6}\s+/gm, '')             // headers
    .replace(/[═─]+/g, '')                   // separadores
    .replace(/[\u2705\u2b1c\u{1F680}\u{1F4DA}]/gu, '') // emojis decorativos
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

// ─── Ícones ───────────────────────────────────────────────────────────────────

function IconSpeaker({ playing }: { playing: boolean }) {
  if (playing) {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
        <path d="M10 3.75a.75.75 0 0 0-1.264-.546L4.703 7H3.167a.75.75 0 0 0-.7.48A6.985 6.985 0 0 0 2 10c0 .887.165 1.737.468 2.52.111.29.39.48.7.48h1.535l4.033 3.796A.75.75 0 0 0 10 16.25V3.75ZM15.95 5.05a.75.75 0 0 0-1.06 1.061 5.5 5.5 0 0 1 0 7.778.75.75 0 0 0 1.06 1.06 7 7 0 0 0 0-9.899Z" />
        <path d="M13.829 7.172a.75.75 0 0 0-1.061 1.06 2.5 2.5 0 0 1 0 3.536.75.75 0 0 0 1.06 1.06 4 4 0 0 0 0-5.656Z" />
      </svg>
    )
  }
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
      <path d="M10 3.75a.75.75 0 0 0-1.264-.546L4.703 7H3.167a.75.75 0 0 0-.7.48A6.985 6.985 0 0 0 2 10c0 .887.165 1.737.468 2.52.111.29.39.48.7.48h1.535l4.033 3.796A.75.75 0 0 0 10 16.25V3.75ZM13.829 7.172a.75.75 0 0 0-1.061 1.06 2.5 2.5 0 0 1 0 3.536.75.75 0 0 0 1.06 1.06 4 4 0 0 0 0-5.656ZM15.95 5.05a.75.75 0 0 0-1.06 1.061 5.5 5.5 0 0 1 0 7.778.75.75 0 0 0 1.06 1.06 7 7 0 0 0 0-9.899Z" />
    </svg>
  )
}

function IconMic() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
      <path d="M7 4a3 3 0 0 1 6 0v6a3 3 0 1 1-6 0V4Z" />
      <path d="M5.5 9.643a.75.75 0 0 0-1.5 0V10c0 3.06 2.29 5.585 5.25 5.954V17.5h-1.5a.75.75 0 0 0 0 1.5h4.5a.75.75 0 0 0 0-1.5h-1.5v-1.546A6.001 6.001 0 0 0 16 10v-.357a.75.75 0 0 0-1.5 0V10a4.5 4.5 0 0 1-9 0v-.357Z" />
    </svg>
  )
}

// ─── Web Speech API types ─────────────────────────────────────────────────────

interface ISpeechRecognition extends EventTarget {
  lang: string
  continuous: boolean
  interimResults: boolean
  start(): void
  stop(): void
  onresult: ((e: SpeechRecognitionEvent) => void) | null
  onend: (() => void) | null
  onerror: (() => void) | null
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  child: Child
}

export function TutorChat({ child }: Props) {
  // Setup
  const [subjectValue, setSubjectValue] = useState('')
  const [subject, setSubject] = useState('')
  const [topic, setTopic] = useState('')
  const [started, setStarted] = useState(false)

  // Sessão
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [depthLevel, setDepthLevel] = useState(1)

  // Chat
  const [messages, setMessages] = useState<Message[]>([])
  const [streamingIndex, setStreamingIndex] = useState<number | null>(null)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)   // aguardando primeiro chunk
  const [error, setError] = useState<string | null>(null)

  // Áudio — fila de chunks TTS durante streaming
  const [ttsActive, setTtsActive] = useState(false)       // TTS em andamento (streaming)
  const [audioLoading, setAudioLoading] = useState(false) // primeiro chunk ainda carregando
  const [replayLoading, setReplayLoading] = useState<number | null>(null)
  const [replayPlaying, setReplayPlaying] = useState<number | null>(null)

  // Microfone
  const [isRecording, setIsRecording] = useState(false)
  const [hasMic, setHasMic] = useState(false)

  // Refs
  const bottomRef = useRef<HTMLDivElement>(null)
  // Timer da sessão
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  // Refs para beforeunload (valores sempre atuais sem re-registrar o listener)
  const elapsedRef = useRef(0)
  const depthLevelRef = useRef(1)
  const messagesRef = useRef<Message[]>([])
  const sessionIdRef = useRef<string | null>(null)
  // Fila de chunks de áudio ordenados por seq
  const audioChunksRef = useRef<Array<{ seq: number; url?: string }>>([])
  const nextToPlayRef = useRef(0)
  const isPlayingChunkRef = useRef(false)
  // Áudio de streaming (separado do replay)
  const streamingAudioRef = useRef<HTMLAudioElement | null>(null)
  // Áudio de replay manual
  const replayAudioRef = useRef<HTMLAudioElement | null>(null)
  // Input de texto (foco após transcrição de voz)
  const inputRef = useRef<HTMLInputElement | null>(null)
  // Cache de frases curtas comuns (blob reutilizável)
  const audioCacheRef = useRef<Map<string, Blob>>(new Map())
  const recognitionRef = useRef<ISpeechRecognition | null>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  useEffect(() => {
    const win = window as unknown as Record<string, unknown>
    setHasMic(
      typeof win['SpeechRecognition'] !== 'undefined' ||
      typeof win['webkitSpeechRecognition'] !== 'undefined',
    )
  }, [])

  // ─── Sincroniza refs para beforeunload ────────────────────────────────────
  useEffect(() => { messagesRef.current = messages }, [messages])
  useEffect(() => { depthLevelRef.current = depthLevel }, [depthLevel])

  // ─── Cleanup do timer ao desmontar ───────────────────────────────────────
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  // ─── beforeunload: salva sessão se sair sem encerrar ─────────────────────
  useEffect(() => {
    function handleUnload() {
      const sid = sessionIdRef.current
      if (!sid) return
      const elapsed = elapsedRef.current
      const msgs = messagesRef.current
      navigator.sendBeacon(
        '/api/tutor/save-session',
        JSON.stringify({
          session_id: sid,
          child_id: child.id,
          subject,
          topic,
          messages: msgs.map((m) => ({ role: m.role, content: m.text })),
          duration_minutes: Math.floor(elapsed / 60),
          was_interrupted: elapsed < 15 * 60,
          interrupted_at_phase: inferPhase(msgs.length),
          depth_reached: depthLevelRef.current,
          concepts_covered: [],
          performance_score: null,
        }),
      )
    }
    window.addEventListener('beforeunload', handleUnload)
    return () => window.removeEventListener('beforeunload', handleUnload)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [child.id])  // registra uma vez — lê valores via refs

  // ─── Fila de áudio TTS ─────────────────────────────────────────────────────

  function resetAudioQueue() {
    // Cancela reprodução de streaming em curso
    if (streamingAudioRef.current) {
      streamingAudioRef.current.pause()
      streamingAudioRef.current = null
    }
    // Cancela reprodução de replay em curso
    if (replayAudioRef.current) {
      replayAudioRef.current.pause()
      replayAudioRef.current = null
    }
    // Revoga URLs pendentes
    for (const c of audioChunksRef.current) {
      if (c.url) URL.revokeObjectURL(c.url)
    }
    audioChunksRef.current = []
    nextToPlayRef.current = 0
    isPlayingChunkRef.current = false
    setTtsActive(false)
    setAudioLoading(false)
    setReplayPlaying(null)
  }

  function tryPlayNextChunk() {
    if (isPlayingChunkRef.current) return
    const chunk = audioChunksRef.current[nextToPlayRef.current]
    if (!chunk?.url) return   // ainda não chegou

    isPlayingChunkRef.current = true
    nextToPlayRef.current++
    setAudioLoading(false)   // áudio começou — remove indicador de loading

    const audio = new Audio(chunk.url)
    streamingAudioRef.current = audio
    audio.play().catch(() => {
      streamingAudioRef.current = null
      isPlayingChunkRef.current = false
      tryPlayNextChunk()
    })
    audio.onended = () => {
      URL.revokeObjectURL(chunk.url!)
      streamingAudioRef.current = null
      isPlayingChunkRef.current = false
      if (nextToPlayRef.current >= audioChunksRef.current.length) {
        setTtsActive(false)
      }
      tryPlayNextChunk()
    }
  }

  function enqueueChunk(rawText: string) {
    const clean = stripForTTS(rawText)
    if (!clean.trim()) return

    const seq = audioChunksRef.current.length
    audioChunksRef.current.push({ seq })
    setTtsActive(true)

    // Primeiro chunk: ativa indicador de loading até o áudio começar
    if (seq === 0) setAudioLoading(true)

    // Verifica cache de frases curtas comuns
    const cacheKey = clean.trim().toLowerCase()
    const cachedBlob = audioCacheRef.current.get(cacheKey)
    if (cachedBlob) {
      const url = URL.createObjectURL(cachedBlob)
      audioChunksRef.current[seq].url = url
      tryPlayNextChunk()
      return
    }

    fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: clean }),
    })
      .then((r) => (r.ok ? r.blob() : null))
      .then((blob) => {
        if (!blob) return
        // Armazena no cache se for frase curta
        if (clean.length <= 60) audioCacheRef.current.set(cacheKey, blob)
        const url = URL.createObjectURL(blob)
        audioChunksRef.current[seq].url = url
        tryPlayNextChunk()
      })
      .catch(() => {})
  }

  // ─── Sessão ───────────────────────────────────────────────────────────────

  function formatTimer(seconds: number): string {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0')
    const s = (seconds % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  function inferPhase(msgCount: number): string {
    if (msgCount <= 4) return 'diagnostico'
    if (msgCount <= 10) return 'explicacao'
    if (msgCount <= 18) return 'pratica'
    return 'avancado'
  }

  async function createSession(): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from('session_history')
        .insert({ child_id: child.id, subject, topic: topic || subject, started_at: new Date().toISOString() })
        .select('id')
        .single()
      if (error || !data) return null
      return (data as { id: string }).id
    } catch {
      return null
    }
  }

  async function saveSession(wasInterrupted: boolean) {
    const sid = sessionIdRef.current
    if (!sid) return
    const elapsed = elapsedRef.current
    const msgs = messagesRef.current
    try {
      await fetch('/api/tutor/save-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sid,
          child_id: child.id,
          subject,
          topic,
          messages: msgs.map((m) => ({ role: m.role, content: m.text })),
          duration_minutes: Math.floor(elapsed / 60),
          was_interrupted: wasInterrupted,
          interrupted_at_phase: wasInterrupted ? inferPhase(msgs.length) : null,
          depth_reached: depthLevelRef.current,
          concepts_covered: [],
          performance_score: null,
        }),
      })
    } catch {
      // silencioso
    }
  }

  async function handleEndSession() {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    await saveSession(false)
    // Reset para nova sessão
    sessionIdRef.current = null
    setSessionId(null)
    setStarted(false)
    setMessages([])
    setElapsedSeconds(0)
    elapsedRef.current = 0
    setDepthLevel(1)
    depthLevelRef.current = 1
    resetAudioQueue()
  }

  async function prefetchCommonPhrases() {
    const phrases = [
      'Muito bem!', 'Ótimo!', 'Quase lá!', 'Vamos lá!',
      'Excelente!', 'Perfeito!', 'Boa tentativa!', 'Correto!',
    ]
    await Promise.all(
      phrases.map(async (phrase) => {
        const key = phrase.trim().toLowerCase()
        if (audioCacheRef.current.has(key)) return
        try {
          const res = await fetch('/api/tts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: phrase }),
          })
          if (!res.ok) return
          audioCacheRef.current.set(key, await res.blob())
        } catch { /* silencioso */ }
      }),
    )
  }

  // ─── Consumir stream SSE do tutor ─────────────────────────────────────────

  async function consumeStream(res: Response, msgIndex: number) {
    const reader = res.body!.getReader()
    const decoder = new TextDecoder()
    let sseBuffer = ''
    let fullText = ''
    let ttsBuffer = ''
    let firstChunkSent = false   // pré-fetch: controla envio do 1º chunk

    function flushTTS(force = false) {
      const clean = stripForTTS(ttsBuffer)
      if (force ? clean.length > 0 : clean.length > 20) {
        enqueueChunk(ttsBuffer)
        ttsBuffer = ''
      }
    }

    function maybeSplitTTS() {
      // Pré-fetch: envia primeiro chunk assim que temos ~40 chars (fronteira de palavra)
      if (!firstChunkSent && ttsBuffer.length >= 40) {
        const spaceIdx = ttsBuffer.lastIndexOf(' ', 60)
        if (spaceIdx > 15) {
          firstChunkSent = true
          enqueueChunk(ttsBuffer.slice(0, spaceIdx + 1))
          ttsBuffer = ttsBuffer.slice(spaceIdx + 1)
          return
        }
      }

      // Quebra no primeiro parágrafo encontrado
      const paraIdx = ttsBuffer.indexOf('\n\n')
      if (paraIdx !== -1 && paraIdx > 15) {
        firstChunkSent = true
        enqueueChunk(ttsBuffer.slice(0, paraIdx + 2))
        ttsBuffer = ttsBuffer.slice(paraIdx + 2)
        return
      }
      // Ou na última fronteira de frase se buffer ficou longo (60 chars)
      if (ttsBuffer.length > 60) {
        const last = Math.max(
          ttsBuffer.lastIndexOf('. '),
          ttsBuffer.lastIndexOf('! '),
          ttsBuffer.lastIndexOf('? '),
        )
        if (last > 10) {
          firstChunkSent = true
          enqueueChunk(ttsBuffer.slice(0, last + 2))
          ttsBuffer = ttsBuffer.slice(last + 2)
        }
      }
    }

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        sseBuffer += decoder.decode(value, { stream: true })
        const lines = sseBuffer.split('\n')
        sseBuffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const payload = line.slice(6).trim()
          if (payload === '[DONE]') {
            flushTTS(true)
            continue
          }
          try {
            const parsed = JSON.parse(payload)
            // Evento de metadados — não é texto
            if (parsed.type === 'meta') {
              if (typeof parsed.depthLevel === 'number') {
                setDepthLevel(parsed.depthLevel)
                depthLevelRef.current = parsed.depthLevel
              }
              continue
            }
            const { text } = parsed
            fullText += text
            ttsBuffer += text

            setMessages((prev) => {
              const updated = [...prev]
              updated[msgIndex] = { role: 'model', text: fullText }
              return updated
            })

            maybeSplitTTS()
          } catch { /* chunk malformado — ignorar */ }
        }
      }
    } finally {
      setStreamingIndex(null)
      setLoading(false)
    }
  }

  // ─── Chamadas à API ────────────────────────────────────────────────────────

  async function callTutor(body: object, msgIndex: number) {
    resetAudioQueue()
    setLoading(true)
    setStreamingIndex(msgIndex)
    setError(null)

    try {
      const res = await fetch('/api/tutor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError((data as { error?: string }).error ?? 'Erro ao contactar o tutor.')
        setLoading(false)
        setStreamingIndex(null)
        // Remove placeholder vazio
        setMessages((prev) => prev.filter((_, i) => i !== msgIndex || prev[i].text !== ''))
        return
      }

      setLoading(false)
      await consumeStream(res, msgIndex)
    } catch {
      setError('Falha na conexão. Tente novamente.')
      setLoading(false)
      setStreamingIndex(null)
    }
  }

  async function sendMessage(text: string, currentMessages: Message[]) {
    const withUser: Message[] = [...currentMessages, { role: 'user', text }]
    const msgIndex = withUser.length   // posição do placeholder do tutor
    setMessages([...withUser, { role: 'model', text: '' }])

    const history: HistoryItem[] = withUser.slice(0, -1).map((m) => ({
      role: m.role,
      parts: [{ text: m.text }],
    }))

    await callTutor(
      { message: text, childId: child.id, studentName: child.name, grade: child.grade, age: child.age, subject, topic, history },
      msgIndex,
    )
  }

  async function handleStart(e: React.FormEvent) {
    e.preventDefault()
    if (!subjectValue) return
    setStarted(true)
    setMessages([{ role: 'model', text: '' }])

    // Cria registro da sessão e inicia timer
    const newSessionId = await createSession()
    sessionIdRef.current = newSessionId
    setSessionId(newSessionId)
    const interval = setInterval(() => {
      setElapsedSeconds((s) => {
        const next = s + 1
        elapsedRef.current = next
        return next
      })
    }, 1000)
    timerRef.current = interval

    // Pré-aquece cache de frases comuns em background
    prefetchCommonPhrases()
    await callTutor(
      { init: true, childId: child.id, studentName: child.name, grade: child.grade, age: child.age, subject, topic, history: [] },
      0,
    )
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    const text = input.trim()
    if (!text || loading || streamingIndex !== null) return
    setInput('')
    await sendMessage(text, messages)
  }

  // ─── Replay por mensagem completa ─────────────────────────────────────────

  async function handleReplay(msg: Message, index: number) {
    if (replayPlaying === index) {
      replayAudioRef.current?.pause()
      setReplayPlaying(null)
      return
    }
    if (replayAudioRef.current) {
      replayAudioRef.current.pause()
      setReplayPlaying(null)
    }

    setReplayLoading(index)
    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: stripForTTS(msg.text) }),
      })
      if (!res.ok) return
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const audio = new Audio(url)
      replayAudioRef.current = audio
      setReplayPlaying(index)
      audio.play().catch(() => setReplayPlaying(null))
      audio.onended = () => {
        URL.revokeObjectURL(url)
        setReplayPlaying(null)
      }
    } catch {
      // silencioso
    } finally {
      setReplayLoading(null)
    }
  }

  // ─── Microfone ────────────────────────────────────────────────────────────

  function toggleRecording() {
    if (isRecording) {
      recognitionRef.current?.stop()
      setIsRecording(false)
      return
    }
    const win = window as unknown as Record<string, unknown>
    const Ctor = (win['SpeechRecognition'] ?? win['webkitSpeechRecognition']) as
      | (new () => ISpeechRecognition)
      | undefined
    if (!Ctor) return

    const recognition = new Ctor()
    recognition.lang = 'pt-BR'
    recognition.continuous = false
    recognition.interimResults = false
    recognition.onresult = (e: SpeechRecognitionEvent) => {
      const t = e.results[0][0].transcript
      setInput((prev) => (prev ? `${prev} ${t}` : t))
    }
    recognition.onend = () => {
      setIsRecording(false)
      inputRef.current?.focus()
    }
    recognition.onerror = () => setIsRecording(false)
    recognitionRef.current = recognition
    recognition.start()
    setIsRecording(true)
  }

  function handleSubjectChange(value: string) {
    setSubjectValue(value)
    setSubject(MATERIAS.find((m) => m.value === value)?.label ?? value)
    setTopic('')
  }

  // ─── Tela de configuração ─────────────────────────────────────────────────

  if (!started) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <form onSubmit={handleStart} className="w-full max-w-sm flex flex-col gap-5">
          <div className="text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#1D9E75]/10">
              <span className="text-2xl">📚</span>
            </div>
            <h2 className="text-base font-semibold text-gray-900">Nova sessão de tutoria</h2>
            <p className="mt-1 text-sm text-gray-500">Para {child.name}</p>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Matéria *</label>
            <select
              value={subjectValue}
              onChange={(e) => handleSubjectChange(e.target.value)}
              required
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#1D9E75] focus:ring-2 focus:ring-[#1D9E75]/20"
            >
              <option value="">Selecione a matéria</option>
              {MATERIAS.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>

          {subjectValue && (
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">
                Tópico <span className="font-normal text-gray-400">(opcional)</span>
              </label>
              {TOPICOS[subjectValue] ? (
                <select
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#1D9E75] focus:ring-2 focus:ring-[#1D9E75]/20"
                >
                  <option value="">Selecione o tópico</option>
                  {TOPICOS[subjectValue].map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              ) : (
                <input
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="Ex: Digite o tópico…"
                  className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#1D9E75] focus:ring-2 focus:ring-[#1D9E75]/20"
                />
              )}
            </div>
          )}

          <button
            type="submit"
            className="flex h-11 w-full items-center justify-center rounded-lg bg-[#1D9E75] text-sm font-semibold text-white transition-colors hover:bg-[#178a64]"
          >
            Iniciar sessão →
          </button>
        </form>
      </div>
    )
  }

  // ─── Tela de chat ─────────────────────────────────────────────────────────

  const lastModelIndex = messages.reduce((acc, m, i) => (m.role === 'model' ? i : acc), -1)
  const isCurrentlyStreaming = streamingIndex !== null

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Barra de sessão — timer e encerrar */}
      <div className="shrink-0 flex items-center justify-between border-b border-gray-100 bg-gray-50 px-4 py-2">
        <span className="flex items-center gap-1.5 text-xs text-gray-500">
          <span className="h-1.5 w-1.5 rounded-full bg-[#1D9E75] animate-pulse" />
          Aula em andamento: {formatTimer(elapsedSeconds)}
          {depthLevel > 1 && (
            <span className="ml-2 rounded-full bg-[#1D9E75]/10 px-2 py-0.5 text-[10px] font-medium text-[#1D9E75]">
              Nível {depthLevel}/5
            </span>
          )}
        </span>
        <button
          onClick={handleEndSession}
          className="rounded-lg px-3 py-1 text-xs font-medium text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
        >
          Encerrar aula
        </button>
      </div>

      {/* Mensagens */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.map((msg, i) => {
          if (msg.role === 'user') {
            return (
              <div key={i} className="flex gap-2.5 justify-end">
                <div className="max-w-[78%] rounded-2xl rounded-tr-sm bg-[#1D9E75] px-4 py-2.5 text-sm leading-relaxed text-white whitespace-pre-wrap">
                  {msg.text}
                </div>
              </div>
            )
          }

          // Mensagem do tutor
          const isThisStreaming = streamingIndex === i
          // Só parseia choices quando a mensagem estiver completa
          const parsed =
            i === lastModelIndex && !isCurrentlyStreaming && msg.text
              ? parseChoices(msg.text)
              : null
          const isReplaying = replayPlaying === i
          const isReplayLoading = replayLoading === i
          const showReplayBtn = !isThisStreaming && msg.text.length > 0

          return (
            <div key={i} className="flex gap-2.5 justify-start">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#1D9E75] text-xs font-bold text-white mt-0.5">
                IA
              </div>
              <div className="max-w-[78%] flex flex-col gap-2">
                <div className="rounded-2xl rounded-tl-sm bg-white border border-gray-100 px-4 py-2.5 text-sm leading-relaxed text-gray-800 shadow-sm whitespace-pre-wrap">
                  {/* Texto em tempo real (streaming ou completo) */}
                  {parsed ? parsed.preamble : msg.text}

                  {/* Cursor piscando durante streaming */}
                  {isThisStreaming && (
                    <span className="inline-block w-0.5 h-3.5 bg-gray-400 ml-0.5 animate-pulse align-middle" />
                  )}

                  {/* Indicador de áudio — loading ou reprodução */}
                  {(ttsActive || audioLoading) && i === lastModelIndex && (
                    <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-[#1D9E75]/10 px-2 py-0.5 text-[10px] font-medium text-[#1D9E75]">
                      {audioLoading ? (
                        <>
                          <span className="h-3 w-3 rounded-full border-2 border-[#1D9E75] border-t-transparent animate-spin" />
                          professor falando...
                        </>
                      ) : (
                        <>
                          <span className="h-1.5 w-1.5 rounded-full bg-[#1D9E75] animate-pulse" />
                          professor falando...
                        </>
                      )}
                    </span>
                  )}

                  {/* Botão replay para mensagens completas */}
                  {showReplayBtn && (
                    <button
                      onClick={() => handleReplay(msg, i)}
                      disabled={isReplayLoading}
                      title={isReplaying ? 'Pausar' : 'Ouvir novamente'}
                      className={`ml-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium transition-colors disabled:opacity-50 ${
                        isReplaying
                          ? 'bg-[#1D9E75]/15 text-[#1D9E75]'
                          : 'bg-gray-100 text-gray-400 hover:bg-[#1D9E75]/10 hover:text-[#1D9E75]'
                      }`}
                    >
                      {isReplayLoading ? (
                        <span className="h-3 w-3 rounded-full border-2 border-current border-t-transparent animate-spin" />
                      ) : (
                        <IconSpeaker playing={isReplaying} />
                      )}
                      {isReplaying ? 'pausar' : 'ouvir'}
                    </button>
                  )}
                </div>

                {/* Alternativas — só quando mensagem completa */}
                {parsed && (
                  <div className="flex flex-col gap-2">
                    {parsed.choices.map((choice) => (
                      <button
                        key={choice.letter}
                        onClick={() => sendMessage(`${choice.letter}) ${choice.text}`, messages)}
                        disabled={loading || isCurrentlyStreaming}
                        className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-left text-sm text-gray-700 shadow-sm transition-all hover:border-[#1D9E75] hover:bg-[#1D9E75]/5 hover:text-[#1D9E75] disabled:opacity-50"
                      >
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-gray-300 text-xs font-bold">
                          {choice.letter}
                        </span>
                        {choice.text}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )
        })}

        {/* Dots de loading — só antes do primeiro chunk chegar */}
        {loading && (
          <div className="flex gap-2.5 justify-start">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#1D9E75] text-xs font-bold text-white">
              IA
            </div>
            <div className="rounded-2xl rounded-tl-sm bg-white border border-gray-100 px-4 py-3 shadow-sm">
              <span className="flex gap-1">
                <span className="h-2 w-2 rounded-full bg-[#1D9E75] animate-bounce [animation-delay:0ms]" />
                <span className="h-2 w-2 rounded-full bg-[#1D9E75] animate-bounce [animation-delay:150ms]" />
                <span className="h-2 w-2 rounded-full bg-[#1D9E75] animate-bounce [animation-delay:300ms]" />
              </span>
            </div>
          </div>
        )}

        {error && (
          <p className="text-center text-xs text-red-500">{error}</p>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="shrink-0 border-t border-gray-100 bg-white p-4">
        <form onSubmit={handleSend} className="flex gap-2">
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={isRecording ? 'Ouvindo...' : 'Digite sua resposta ou dúvida…'}
            disabled={loading || isCurrentlyStreaming}
            className={`flex-1 rounded-xl border px-4 py-2.5 text-sm outline-none transition-colors disabled:opacity-50 ${
              isRecording
                ? 'border-red-400 ring-2 ring-red-400/20 animate-pulse placeholder:text-red-400'
                : 'border-gray-200 focus:border-[#1D9E75] focus:ring-2 focus:ring-[#1D9E75]/20'
            }`}
          />

          {/* Microfone */}
          {hasMic && (
            <button
              type="button"
              onClick={toggleRecording}
              disabled={loading || isCurrentlyStreaming}
              title={isRecording ? 'Parar gravação' : 'Responder por voz'}
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors disabled:opacity-40 ${
                isRecording
                  ? 'bg-red-500 text-white animate-pulse'
                  : 'border border-gray-200 bg-white text-gray-400 hover:border-[#1D9E75] hover:text-[#1D9E75]'
              }`}
            >
              <IconMic />
            </button>
          )}

          <button
            type="submit"
            disabled={loading || isCurrentlyStreaming || !input.trim()}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#1D9E75] text-white transition-colors hover:bg-[#178a64] disabled:opacity-40"
            aria-label="Enviar"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
              <path d="M3.105 2.288a.75.75 0 0 0-.826.95l1.654 5.25H12a.75.75 0 0 1 0 1.5H3.933l-1.654 5.25a.75.75 0 0 0 .826.95 28.896 28.896 0 0 0 15.293-7.154.75.75 0 0 0 0-1.115A28.897 28.897 0 0 0 3.105 2.288Z" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  )
}
