'use client'

import { useState, useRef } from 'react'

interface VoiceButtonProps {
  /** Called with the recorded audio blob when recording stops */
  onRecorded?: (blob: Blob) => void
  /** Called when recording starts */
  onStart?: () => void
}

type State = 'idle' | 'recording' | 'done'

export function VoiceButton({ onRecorded, onStart }: VoiceButtonProps) {
  const [state, setState] = useState<State>('idle')
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

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
        onRecorded?.(blob)
        stream.getTracks().forEach((t) => t.stop())
        setState('done')
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

  function reset() {
    setState('idle')
  }

  if (state === 'recording') {
    return (
      <button
        type="button"
        onClick={stopRecording}
        aria-label="Stop recording"
        className="w-[38px] h-[38px] rounded-full border border-bad/60 bg-bad/10 flex items-center justify-center flex-shrink-0 animate-pulse"
      >
        {/* Stop square */}
        <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
          <rect x="2" y="2" width="8" height="8" rx="1.5" fill="#f87171"/>
        </svg>
      </button>
    )
  }

  if (state === 'done') {
    return (
      <button
        type="button"
        onClick={reset}
        aria-label="Voice note recorded — tap to re-record"
        className="w-[38px] h-[38px] rounded-full border border-accent/60 bg-accent/10 flex items-center justify-center flex-shrink-0"
      >
        {/* Play triangle */}
        <svg width="11" height="13" viewBox="0 0 11 13" fill="none">
          <polygon points="0,0 11,6.5 0,13" fill="#D4E23A"/>
        </svg>
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={startRecording}
      aria-label="Record voice note"
      className="w-[38px] h-[38px] rounded-full border border-border flex items-center justify-center flex-shrink-0 hover:border-accent transition-colors"
    >
      <svg width="13" height="17" viewBox="0 0 14 18" fill="none" stroke="#777" strokeWidth="1.5" strokeLinecap="round">
        <rect x="4" y="1" width="6" height="10" rx="3"/>
        <path d="M1 10c0 3.31 2.69 6 6 6s6-2.69 6-6"/>
        <line x1="7" y1="16" x2="7" y2="18"/>
      </svg>
    </button>
  )
}
