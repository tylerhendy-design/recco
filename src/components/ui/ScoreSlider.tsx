'use client'

import { cn, getScoreColor } from '@/lib/utils'

interface ScoreSliderProps {
  value?: number
  onChange?: (value: number) => void
  className?: string
}

const LABELS: Record<number, string> = {
  0:   "You have shit taste. I cannot recommend this to anyone",
  11:  "I don't understand how you like this. I wouldn't recommend it",
  21:  "This really didn't work for me. I can't recommend this at all",
  31:  "I see what it's trying to do. I wouldn't recommend it",
  41:  "Not great overall. I wouldn't go out of my way to recommend",
  51:  "Something didn't quite land. I wouldn't recommend it yet",
  61:  "There's something here. I'd cautiously recommend it",
  71:  "This is solid overall. I'd recommend it without much hesitation",
  81:  "Very good overall. I'd happily recommend this to people",
  91:  "Excellent overall. I would strongly recommend this to people",
  100: "Life changing. I will recommend this to everyone",
}

function getBucket(value: number): number {
  if (value === 100) return 100
  if (value <= 10) return 0
  return Math.floor((value - 1) / 10) * 10 + 1
}

export function ScoreSlider({ value: controlled, onChange, className }: ScoreSliderProps) {
  const value = controlled ?? 50

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    onChange?.(parseInt(e.target.value))
  }

  const color = getScoreColor(value)
  const label = LABELS[getBucket(value)]
  const isMax = value === 100

  const glowStyle = isMax
    ? { color, textShadow: `0 0 8px #D4E23A55` }
    : { color }

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <style>{`
        .score-slider { -webkit-appearance: none; appearance: none; width: 100%; height: 4px; border-radius: 2px; outline: none; cursor: pointer; }
        .score-slider::-webkit-slider-thumb { -webkit-appearance: none; width: 22px; height: 22px; border-radius: 50%; background: #fff; box-shadow: 0 1px 6px rgba(0,0,0,0.5); cursor: pointer; }
        .score-slider::-moz-range-thumb { width: 22px; height: 22px; border-radius: 50%; background: #fff; border: none; box-shadow: 0 1px 6px rgba(0,0,0,0.5); cursor: pointer; }
      `}</style>

      <div className="flex items-baseline gap-2">
        <span className="text-[24px] font-bold leading-none tabular-nums" style={glowStyle}>
          {value}
        </span>
        <span className="text-[24px] font-bold leading-none text-text-faint">/100</span>
      </div>

      <div className="text-[24px] font-bold leading-[1.2]" style={glowStyle}>
        {label}
      </div>

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
