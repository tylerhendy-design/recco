'use client'

import { cn } from '@/lib/utils'

interface ScoreSliderProps {
  value?: number
  onChange?: (value: number) => void
  className?: string
}

const LABELS: Record<number, string> = {
  0:   "You have shit taste",
  10:  "I don't understand how you like this",
  20:  "This isn't for me, and I suspect that's not the problem",
  30:  "I can see what it's going for, I just don't think it gets there",
  40:  "Not great, not quite awful, just a bit regrettable",
  50:  "Better luck next time, something wasn't right",
  60:  "There's something here, and it mostly works",
  70:  "Solid, easy enough to recommend",
  80:  "Very good, I'd happily point people towards it",
  90:  "Excellent, and worth making a bit of noise about",
  100: "Life changing. I will recommend this to everyone",
}

// poo brown (#5C3310) → brand yellow (#D4E23A)
function getScoreColor(score: number): string {
  const t = score / 100
  const r = Math.round(92  + (212 - 92)  * t)
  const g = Math.round(51  + (226 - 51)  * t)
  const b = Math.round(16  + (58  - 16)  * t)
  return `rgb(${r},${g},${b})`
}

export function ScoreSlider({ value: controlled, onChange, className }: ScoreSliderProps) {
  const value = controlled ?? 50

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    onChange?.(parseInt(e.target.value))
  }

  const color = getScoreColor(value)
  const bucket = Math.min(100, Math.round(value / 10) * 10)
  const label = LABELS[bucket]
  const isMax = value === 100

  const glowStyle = isMax
    ? { color, textShadow: `0 0 12px #D4E23A, 0 0 28px #D4E23A88` }
    : { color }

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <style>{`
        .score-slider { -webkit-appearance: none; appearance: none; width: 100%; height: 4px; border-radius: 2px; outline: none; cursor: pointer; }
        .score-slider::-webkit-slider-thumb { -webkit-appearance: none; width: 22px; height: 22px; border-radius: 50%; background: #fff; box-shadow: 0 1px 6px rgba(0,0,0,0.5); cursor: pointer; }
        .score-slider::-moz-range-thumb { width: 22px; height: 22px; border-radius: 50%; background: #fff; border: none; box-shadow: 0 1px 6px rgba(0,0,0,0.5); cursor: pointer; }
      `}</style>

      {/* Score + label row */}
      <div className="flex items-baseline gap-2">
        <span className="text-[24px] font-bold leading-none tabular-nums" style={glowStyle}>
          {value}
        </span>
        <span className="text-[24px] font-bold leading-none text-text-faint">/100</span>
      </div>

      <div className="text-[24px] font-bold leading-[1.2]" style={glowStyle}>
        {label}
      </div>

      {/* Slider */}
      <div className="py-1.5">
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={value}
          onChange={handleChange}
          className="score-slider"
          style={{
            background: `linear-gradient(to right, ${color} 0%, ${color} ${value}%, #2a2a2e ${value}%, #2a2a2e 100%)`,
          }}
        />
      </div>
    </div>
  )
}
