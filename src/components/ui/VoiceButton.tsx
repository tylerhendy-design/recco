'use client'

import { useState, useRef, useEffect } from 'react'

interface VoiceButtonProps {
  /** Called with the recorded audio blob when recording stops */
  onRecorded?: (blob: Blob) => void
  /** Called when recording starts */
  onStart?: () => void
}

type State = 'idle' | 'recording' | 'recorded' | 'playing'

export function VoiceButton({ onRecorded, onStart }: VoiceButtonProps) {
  const [state, setState] = useState<State>('idle')
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl)
    }
  }, [audioUrl])

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      chunksRef.current = []

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' })
        const url = URL.createObjectURL(blob)
        setAudioUrl(url)
        onRecorded?.(blob)
        stream.getTracks().forEach((t) => t.stop())
        setState('recorded')
      }

      recorder.start()
      recorderRef.current = recorder
      setState('recording')
      onStart?.()
    } catch {
      // Permission denied or not supported — silently fail
    }
  }

  function stopRecording() {
    recorderRef.current?.stop()
  }

  function play() {
    if (!audioUrl) return
    if (!audioRef.current) {
      audioRef.current = new Audio(audioUrl)
      audioRef.current.onended = () => setState('recorded')
    }
    audioRef.current.currentTime = 0
    audioRef.current.play()
    setState('playing')
  }

  function pause() {
    audioRef.current?.pause()
    setState('recorded')
  }

  function reset() {
    audioRef.current?.pause()
    audioRef.current = null
    if (audioUrl) URL.revokeObjectURL(audioUrl)
    setAudioUrl(null)
    setState('idle')
  }

  if (state === 'recording') {
    return (
      <button
        type="button"
        onClick={stopRecording}
        aria-label="Stop recording"
        className="h-[34px] px-3 rounded-full border border-bad/50 bg-bad/10 flex items-center gap-[3px] flex-shrink-0"
        style={{ minWidth: 80 }}
      >
        {[0.3, 1, 0.6, 1, 0.4].map((base, i) => (
          <span
            key={i}
            className="w-[3px] rounded-full bg-[#f87171] inline-block origin-bottom"
            style={{
              height: 14,
              animation: `voiceBar ${0.5 + i * 0.07}s ease-in-out ${i * 0.1}s infinite alternate`,
              transform: `scaleY(${base})`,
            }}
          />
        ))}
        <span className="text-[11px] text-[#f87171] font-medium ml-1.5">Stop</span>
      </button>
    )
  }

  if (state === 'playing') {
    return (
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          type="button"
          onClick={pause}
          aria-label="Pause voice note"
          className="h-[34px] px-3 rounded-full border border-accent/60 bg-accent/10 flex items-center gap-1.5 text-[11px] font-medium text-accent"
        >
          <svg width="10" height="12" viewBox="0 0 10 12" fill="none">
            <rect x="1" y="0" width="3" height="12" rx="1" fill="#D4E23A"/>
            <rect x="6" y="0" width="3" height="12" rx="1" fill="#D4E23A"/>
          </svg>
          Playing…
        </button>
        <button type="button" onClick={reset} aria-label="Remove voice note" className="w-5 h-5 flex items-center justify-center text-text-faint hover:text-white transition-colors">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
    )
  }

  if (state === 'recorded') {
    return (
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          type="button"
          onClick={play}
          aria-label="Play voice note"
          className="h-[34px] px-3 rounded-full border border-accent/60 bg-accent/10 flex items-center gap-1.5 text-[11px] font-medium text-accent"
        >
          <svg width="9" height="11" viewBox="0 0 9 11" fill="none">
            <polygon points="0,0 9,5.5 0,11" fill="#D4E23A"/>
          </svg>
          Voice note
        </button>
        <button type="button" onClick={reset} aria-label="Remove voice note" className="w-5 h-5 flex items-center justify-center text-text-faint hover:text-white transition-colors">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
    )
  }

  // Idle
  return (
    <button
      type="button"
      onClick={startRecording}
      aria-label="Record voice note"
      className="h-[34px] px-3 rounded-full border border-border flex items-center gap-1.5 text-[11px] text-text-faint hover:border-accent hover:text-accent transition-colors flex-shrink-0"
    >
      <svg width="11" height="14" viewBox="0 0 14 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        <rect x="4" y="1" width="6" height="10" rx="3"/>
        <path d="M1 10c0 3.31 2.69 6 6 6s6-2.69 6-6"/>
        <line x1="7" y1="16" x2="7" y2="18"/>
      </svg>
      Yap
    </button>
  )
}
