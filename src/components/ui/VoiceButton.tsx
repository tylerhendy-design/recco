'use client'

import { useState, useRef, useEffect, useCallback } from 'react'

export interface VoiceResult {
  blob: Blob
  durationSec: number
  waveform: number[] // normalised 0–1 amplitudes
  transcript: string
}

interface VoiceButtonProps {
  onRecorded?: (result: VoiceResult) => void
  onStart?: () => void
  onClear?: () => void
}

type State = 'idle' | 'recording' | 'recorded' | 'playing'

export function VoiceButton({ onRecorded, onStart, onClear }: VoiceButtonProps) {
  const [state, setState] = useState<State>('idle')
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [duration, setDuration] = useState(0)
  const [waveform, setWaveform] = useState<number[]>([])
  const [transcript, setTranscript] = useState('')
  const [playProgress, setPlayProgress] = useState(0)

  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const startTimeRef = useRef(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const waveformRef = useRef<number[]>([])
  const animRef = useRef<number>(0)
  const recognitionRef = useRef<any>(null)
  const transcriptRef = useRef('')
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl)
      if (timerRef.current) clearInterval(timerRef.current)
      if (progressRef.current) clearInterval(progressRef.current)
      if (animRef.current) cancelAnimationFrame(animRef.current)
    }
  }, [audioUrl])

  const captureWaveform = useCallback(() => {
    if (!analyserRef.current) return
    const data = new Uint8Array(analyserRef.current.fftSize)
    analyserRef.current.getByteTimeDomainData(data)
    // Calculate RMS amplitude 0–1
    let sum = 0
    for (let i = 0; i < data.length; i++) {
      const v = (data[i] - 128) / 128
      sum += v * v
    }
    const rms = Math.min(1, Math.sqrt(sum / data.length) * 3) // boost for visibility
    waveformRef.current.push(rms)
    animRef.current = requestAnimationFrame(captureWaveform)
  }, [])

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })

      // Set up analyser for waveform
      const audioCtx = new AudioContext()
      const source = audioCtx.createMediaStreamSource(stream)
      const analyser = audioCtx.createAnalyser()
      analyser.fftSize = 256
      source.connect(analyser)
      analyserRef.current = analyser
      waveformRef.current = []

      const recorder = new MediaRecorder(stream)
      chunksRef.current = []

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' })
        const url = URL.createObjectURL(blob)
        setAudioUrl(url)
        stream.getTracks().forEach((t) => t.stop())
        audioCtx.close()
        if (timerRef.current) clearInterval(timerRef.current)
        if (animRef.current) cancelAnimationFrame(animRef.current)

        // Stop speech recognition
        try { recognitionRef.current?.stop() } catch {}

        // Downsample waveform to ~40 bars
        const raw = waveformRef.current
        const bars = 40
        const sampled: number[] = []
        const step = Math.max(1, Math.floor(raw.length / bars))
        for (let i = 0; i < bars && i * step < raw.length; i++) {
          const slice = raw.slice(i * step, (i + 1) * step)
          const avg = slice.reduce((a, b) => a + b, 0) / slice.length
          sampled.push(avg)
        }
        // Normalise
        const max = Math.max(...sampled, 0.01)
        const normalised = sampled.map((v) => Math.max(0.08, v / max))
        setWaveform(normalised)

        const finalDuration = (Date.now() - startTimeRef.current) / 1000
        setDuration(finalDuration)
        setState('recorded')

        onRecorded?.({
          blob,
          durationSec: finalDuration,
          waveform: normalised,
          transcript: transcriptRef.current,
        })
      }

      recorder.start(100)
      recorderRef.current = recorder
      startTimeRef.current = Date.now()
      transcriptRef.current = ''
      setTranscript('')
      setDuration(0)

      // Duration timer
      timerRef.current = setInterval(() => {
        setDuration((Date.now() - startTimeRef.current) / 1000)
      }, 200)

      // Start waveform capture
      captureWaveform()

      // Start speech recognition for live transcription
      try {
        const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
        if (SR) {
          const recognition = new SR()
          recognition.continuous = true
          recognition.interimResults = true
          recognition.lang = 'en-GB'
          recognition.onresult = (event: any) => {
            let finalText = ''
            for (let i = 0; i < event.results.length; i++) {
              finalText += event.results[i][0].transcript
            }
            transcriptRef.current = finalText
            setTranscript(finalText)
          }
          recognition.onerror = () => {} // silently ignore
          recognition.start()
          recognitionRef.current = recognition
        }
      } catch {} // Speech API not available

      setState('recording')
      onStart?.()
    } catch {
      // Permission denied or not supported
    }
  }

  function stopRecording() {
    recorderRef.current?.stop()
  }

  function play() {
    if (!audioUrl) return
    if (!audioRef.current) {
      audioRef.current = new Audio(audioUrl)
      audioRef.current.onended = () => {
        setState('recorded')
        setPlayProgress(0)
        if (progressRef.current) clearInterval(progressRef.current)
      }
    }
    audioRef.current.currentTime = 0
    audioRef.current.play()
    setState('playing')
    // Track progress
    progressRef.current = setInterval(() => {
      if (audioRef.current && duration > 0) {
        setPlayProgress(audioRef.current.currentTime / duration)
      }
    }, 50)
  }

  function pause() {
    audioRef.current?.pause()
    if (progressRef.current) clearInterval(progressRef.current)
    setState('recorded')
  }

  function reset() {
    audioRef.current?.pause()
    audioRef.current = null
    if (audioUrl) URL.revokeObjectURL(audioUrl)
    if (progressRef.current) clearInterval(progressRef.current)
    setAudioUrl(null)
    setWaveform([])
    setDuration(0)
    setTranscript('')
    setPlayProgress(0)
    setState('idle')
    onClear?.()
  }

  function fmtTime(sec: number): string {
    const m = Math.floor(sec / 60)
    const s = Math.floor(sec % 60)
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  // ─── Recording state ──────────────────────────────────────────────────────────
  if (state === 'recording') {
    return (
      <div className="w-full">
        <div className="flex items-center gap-3 px-3 py-2.5 bg-bad/5 border border-bad/30 rounded-xl">
          {/* Live bars */}
          <div className="flex items-center gap-[2px] h-[24px]">
            {[0.3, 1, 0.6, 1, 0.4, 0.8, 0.5].map((base, i) => (
              <span
                key={i}
                className="w-[3px] rounded-full bg-[#f87171] inline-block origin-bottom"
                style={{
                  height: 18,
                  animation: `voiceBar ${0.5 + i * 0.07}s ease-in-out ${i * 0.1}s infinite alternate`,
                  transform: `scaleY(${base})`,
                }}
              />
            ))}
          </div>
          <span className="text-[13px] font-medium text-[#f87171] tabular-nums flex-1">{fmtTime(duration)}</span>
          <button
            type="button"
            onClick={stopRecording}
            className="h-[30px] px-3 rounded-full bg-[#f87171] text-white text-[11px] font-semibold flex items-center gap-1.5"
          >
            <svg width="8" height="8" viewBox="0 0 10 10" fill="none">
              <rect width="10" height="10" rx="2" fill="white" />
            </svg>
            Stop
          </button>
        </div>
        {transcript && (
          <div className="mt-1.5 text-[11px] text-text-faint leading-[1.5] px-1">{transcript}…</div>
        )}
      </div>
    )
  }

  // ─── Recorded / Playing state ─────────────────────────────────────────────────
  if (state === 'recorded' || state === 'playing') {
    return (
      <div className="w-full">
        <div className="px-3 py-2.5 bg-accent/5 border border-accent/20 rounded-xl">
          {/* Controls + waveform */}
          <div className="flex items-center gap-2.5">
            {/* Play / pause */}
            <button
              type="button"
              onClick={state === 'playing' ? pause : play}
              className="w-[30px] h-[30px] rounded-full bg-accent flex items-center justify-center flex-shrink-0"
            >
              {state === 'playing' ? (
                <svg width="10" height="12" viewBox="0 0 10 12" fill="none">
                  <rect x="1" y="0" width="3" height="12" rx="1" fill="#111" />
                  <rect x="6" y="0" width="3" height="12" rx="1" fill="#111" />
                </svg>
              ) : (
                <svg width="10" height="12" viewBox="0 0 10 12" fill="none">
                  <polygon points="1,0 10,6 1,12" fill="#111" />
                </svg>
              )}
            </button>

            {/* Waveform */}
            <div className="flex-1 flex items-center gap-[1.5px] h-[28px]">
              {waveform.map((v, i) => {
                const progress = state === 'playing' ? playProgress : 0
                const filled = i / waveform.length < progress
                return (
                  <div
                    key={i}
                    className="flex-1 rounded-full transition-colors"
                    style={{
                      height: `${Math.max(3, v * 24)}px`,
                      backgroundColor: filled ? '#D4E23A' : 'rgba(212,226,58,0.25)',
                    }}
                  />
                )
              })}
            </div>

            {/* Duration */}
            <span className="text-[11px] font-medium text-accent tabular-nums flex-shrink-0">{fmtTime(duration)}</span>

            {/* Delete */}
            <button
              type="button"
              onClick={reset}
              className="w-5 h-5 flex items-center justify-center text-text-faint hover:text-white transition-colors flex-shrink-0"
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* Transcript */}
          {transcript && (
            <div className="mt-2 pt-2 border-t border-accent/10">
              <div className="text-[10px] font-semibold text-accent/60 uppercase tracking-[0.5px] mb-1">Transcript</div>
              <div className="text-[12px] text-text-secondary leading-[1.5]">{transcript}</div>
            </div>
          )}
        </div>
      </div>
    )
  }

  // ─── Idle ─────────────────────────────────────────────────────────────────────
  return (
    <button
      type="button"
      onClick={startRecording}
      aria-label="Record voice note"
      className="h-[36px] px-3.5 rounded-full border border-border flex items-center gap-2 text-[12px] text-text-faint hover:border-accent hover:text-accent transition-colors flex-shrink-0"
    >
      <svg width="11" height="14" viewBox="0 0 14 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        <rect x="4" y="1" width="6" height="10" rx="3" />
        <path d="M1 10c0 3.31 2.69 6 6 6s6-2.69 6-6" />
        <line x1="7" y1="16" x2="7" y2="18" />
      </svg>
      CBF typing? Yap instead.
    </button>
  )
}
