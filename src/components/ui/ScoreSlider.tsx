'use client'

import { cn, getScoreColor } from '@/lib/utils'

interface ScoreSliderProps {
  value?: number
  onChange?: (value: number) => void
  className?: string
}

const LABELS: Record<number, string> = {
  0:  "You have shit taste. I cannot recommend this to anyone",
  1:  "I don't understand how you like this. I wouldn't recommend it",
  2:  "This really didn't work for me. I can't recommend this at all",
  3:  "I see what it's trying to do. I wouldn't recommend it",
  4:  "Not great overall. I wouldn't go out of my way to recommend",
  5:  "Something didn't quite land. I wouldn't recommend it yet",
  6:  "There's something here. I'd cautiously recommend it",
  7:  "This is solid overall. I'd recommend it without much hesitation",
  8:  "Very good overall. I'd happily recommend this to people",
  9:  "Unreal. Will recommend this to anyone who'll listen",
  10: "Life changing. I will recommend this to everyone",
}

export function ScoreSlider({ value: controlled, onChange, className }: ScoreSliderProps) {
  const value = controlled ?? 5

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    onChange?.(parseInt(e.target.value))
  }

  const color = getScoreColor(value)
  const label = LABELS[value]
  const isMax = value === 10

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
        <span className="text-[24px] font-bold leading-none text-text-faint">/10</span>
      </div>

      <div className="text-[24px] font-bold leading-[1.2]" style={glowStyle}>
        {label}
      </div>

      <div className="py-1.5">
        <input
          type="range"
          min={0}
          max={10}
          step={1}
          value={value}
          onChange={handleChange}
          className="score-slider"
          style={{
            background: `linear-gradient(to right, ${color} 0%, ${color} ${value * 10}%, #2a2a2e ${value * 10}%, #2a2a2e 100%)`,
          }}
        />
      </div>
    </div>
  )
}
