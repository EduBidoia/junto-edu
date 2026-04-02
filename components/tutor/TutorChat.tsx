'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { MATERIAS, TOPICOS } from '@/lib/materias'
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

/** Limpa o texto para TTS: remove marcadores visuais que soam estranhos em áudio */
function stripForTTS(text: string): string {
  return text
    .replace(/\[HISTÓRIA\]/gi, 'História.')
    .replace(/\[PERGUNTA\]/gi, 'Pergunta.')
    .replace(/^[A-D]\)\s*/gm, '')
    .replace(/[═─]+/g, '')
    .replace(/[\u2705\u2b1c\u{1F680}\u{1F4DA}]/gu, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

// ─── Ícones inline ────────────────────────────────────────────────────────────

function SpeakerIcon({ playing }: { playing: boolean }) {
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

function MicIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
      <path d="M7 4a3 3 0 0 1 6 0v6a3 3 0 1 1-6 0V4Z" />
      <path d="M5.5 9.643a.75.75 0 0 0-1.5 0V10c0 3.06 2.29 5.585 5.25 5.954V17.5h-1.5a.75.75 0 0 0 0 1.5h4.5a.75.75 0 0 0 0-1.5h-1.5v-1.546A6.001 6.001 0 0 0 16 10v-.357a.75.75 0 0 0-1.5 0V10a4.5 4.5 0 0 1-9 0v-.357Z" />
    </svg>
  )
}

// ─── Tipos Web Speech API (não incluídos no lib.dom por padrão) ───────────────
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

interface Props {
  child: Child
}

export function TutorChat({ child }: Props) {
  const [subjectValue, setSubjectValue] = useState('')
  const [subject, setSubject] = useState('')
  const [topic, setTopic] = useState('')
  const [started, setStarted] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Áudio TTS
  const [audioUrls, setAudioUrls] = useState<Record<number, string>>({})
  const [playingIndex, setPlayingIndex] = useState<number | null>(null)
  const currentAudioRef = useRef<HTMLAudioElement | null>(null)
  const prevMsgLenRef = useRef(0)

  // Microfone
  const [isRecording, setIsRecording] = useState(false)
  const [hasMic, setHasMic] = useState(false)
  const recognitionRef = useRef<ISpeechRecognition | null>(null)

  const bottomRef = useRef<HTMLDivElement>(null)

  // Detecta suporte a Web Speech API no cliente
  useEffect(() => {
    const win = window as unknown as Record<string, unknown>
    setHasMic(typeof win['SpeechRecognition'] !== 'undefined' || typeof win['webkitSpeechRecognition'] !== 'undefined')
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  // Limpa URLs de áudio ao desmontar
  useEffect(() => {
    const urls = audioUrls
    return () => {
      Object.values(urls).forEach((url) => URL.revokeObjectURL(url))
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ─── TTS: dispara quando nova mensagem do tutor chega ──────────────────────

  const playAudio = useCallback((url: string, index: number) => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause()
      currentAudioRef.current.onended = null
    }
    const audio = new Audio(url)
    currentAudioRef.current = audio
    setPlayingIndex(index)
    audio.play().catch(() => setPlayingIndex(null))
    audio.onended = () => setPlayingIndex(null)
  }, [])

  const fetchAndPlayTTS = useCallback(async (text: string, msgIndex: number) => {
    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: stripForTTS(text) }),
      })
      if (!res.ok) return
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      setAudioUrls((prev) => ({ ...prev, [msgIndex]: url }))
      playAudio(url, msgIndex)
    } catch {
      // TTS é opcional — não bloqueia o chat
    }
  }, [playAudio])

  useEffect(() => {
    const last = messages[messages.length - 1]
    if (messages.length > prevMsgLenRef.current && last?.role === 'model') {
      fetchAndPlayTTS(last.text, messages.length - 1)
    }
    prevMsgLenRef.current = messages.length
  }, [messages, fetchAndPlayTTS])

  function toggleAudio(url: string, index: number) {
    if (playingIndex === index && currentAudioRef.current) {
      currentAudioRef.current.pause()
      setPlayingIndex(null)
    } else {
      playAudio(url, index)
    }
  }

  // ─── Microfone ─────────────────────────────────────────────────────────────

  function toggleRecording() {
    if (isRecording) {
      recognitionRef.current?.stop()
      setIsRecording(false)
      return
    }

    const win = window as unknown as Record<string, unknown>
    const SpeechRecognitionCtor = (win['SpeechRecognition'] ?? win['webkitSpeechRecognition']) as (new () => ISpeechRecognition) | undefined
    if (!SpeechRecognitionCtor) return

    const recognition = new SpeechRecognitionCtor()
    recognition.lang = 'pt-BR'
    recognition.continuous = false
    recognition.interimResults = false

    recognition.onresult = (e: SpeechRecognitionEvent) => {
      const transcript = e.results[0][0].transcript
      setInput((prev) => (prev ? `${prev} ${transcript}` : transcript))
    }
    recognition.onend = () => setIsRecording(false)
    recognition.onerror = () => setIsRecording(false)

    recognitionRef.current = recognition
    recognition.start()
    setIsRecording(true)
  }

  // ─── API calls ─────────────────────────────────────────────────────────────

  function handleSubjectChange(value: string) {
    setSubjectValue(value)
    const materia = MATERIAS.find((m) => m.value === value)
    setSubject(materia?.label ?? value)
    setTopic('')
  }

  async function sendMessage(text: string, currentMessages: Message[]) {
    const newMessages: Message[] = [...currentMessages, { role: 'user', text }]
    setMessages(newMessages)
    setLoading(true)
    setError(null)

    const history: HistoryItem[] = newMessages.slice(0, -1).map((m) => ({
      role: m.role,
      parts: [{ text: m.text }],
    }))

    try {
      const res = await fetch('/api/tutor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          studentName: child.name,
          grade: child.grade,
          age: child.age,
          subject,
          topic,
          history,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Erro ao contactar o tutor.')
      } else {
        setMessages((prev) => [...prev, { role: 'model', text: data.response }])
      }
    } catch {
      setError('Falha na conexão. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  async function handleStart(e: React.FormEvent) {
    e.preventDefault()
    if (!subjectValue) return
    setStarted(true)
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/tutor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          init: true,
          studentName: child.name,
          grade: child.grade,
          age: child.age,
          subject,
          topic,
          history: [],
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Erro ao iniciar sessão.')
      } else {
        setMessages([{ role: 'model', text: data.response }])
      }
    } catch {
      setError('Falha na conexão. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    const text = input.trim()
    if (!text || loading) return
    setInput('')
    await sendMessage(text, messages)
  }

  // ─── Tela de configuração ──────────────────────────────────────────────────

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

  // ─── Tela de chat ──────────────────────────────────────────────────────────

  const lastModelIndex = messages.reduce((acc, m, i) => m.role === 'model' ? i : acc, -1)

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
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

          const parsed = i === lastModelIndex && !loading ? parseChoices(msg.text) : null
          const audioUrl = audioUrls[i]
          const isPlaying = playingIndex === i

          return (
            <div key={i} className="flex gap-2.5 justify-start">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#1D9E75] text-xs font-bold text-white mt-0.5">
                IA
              </div>
              <div className="max-w-[78%] flex flex-col gap-2">
                <div className="rounded-2xl rounded-tl-sm bg-white border border-gray-100 px-4 py-2.5 text-sm leading-relaxed text-gray-800 shadow-sm whitespace-pre-wrap">
                  {parsed ? parsed.preamble : msg.text}
                  {/* Botão de áudio */}
                  {audioUrl && (
                    <button
                      onClick={() => toggleAudio(audioUrl, i)}
                      title={isPlaying ? 'Pausar áudio' : 'Ouvir novamente'}
                      className={`ml-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium transition-colors ${
                        isPlaying
                          ? 'bg-[#1D9E75]/15 text-[#1D9E75]'
                          : 'bg-gray-100 text-gray-400 hover:bg-[#1D9E75]/10 hover:text-[#1D9E75]'
                      }`}
                    >
                      <SpeakerIcon playing={isPlaying} />
                      {isPlaying ? 'pausar' : 'ouvir'}
                    </button>
                  )}
                </div>

                {parsed && (
                  <div className="flex flex-col gap-2">
                    {parsed.choices.map((choice) => (
                      <button
                        key={choice.letter}
                        onClick={() => sendMessage(`${choice.letter}) ${choice.text}`, messages)}
                        disabled={loading}
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
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Digite sua resposta ou dúvida…"
            disabled={loading}
            className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none transition-colors focus:border-[#1D9E75] focus:ring-2 focus:ring-[#1D9E75]/20 disabled:opacity-50"
          />

          {/* Botão de microfone */}
          {hasMic && (
            <button
              type="button"
              onClick={toggleRecording}
              disabled={loading}
              title={isRecording ? 'Parar gravação' : 'Responder por voz'}
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors disabled:opacity-40 ${
                isRecording
                  ? 'bg-red-500 text-white animate-pulse'
                  : 'border border-gray-200 bg-white text-gray-400 hover:border-[#1D9E75] hover:text-[#1D9E75]'
              }`}
            >
              <MicIcon />
            </button>
          )}

          <button
            type="submit"
            disabled={loading || !input.trim()}
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
