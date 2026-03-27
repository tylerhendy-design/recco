'use client'

import { cn } from '@/lib/utils'

interface ScoreSliderProps {
  value?: number
  onChange?: (value: number) => void
  className?: string
}

const LABELS: Record<number, string> = {
  0:   "you have shit taste",
  10:  "i don't understand how you like this",
  20:  "this isn't for me, and i suspect that's not the problem",
  30:  "i can see what it's going for, i just don't think it gets there",
  40:  "not great, not quite awful, just a bit regrettable",
  50:  "better luck next time, something wasn't right",
  60:  "there's something here, and it mostly works",
  70:  "solid, easy enough to recommend",
  80:  "very good, i'd happily point people towards it",
  90:  "excellent, and worth making a bit of noise about",
  100: "Life changing. I will recommend this to everyone",
}

// brown (#7A3B1E) → orange (#F97316) → heart pink (#FF3A6E)
function getScoreColor(score: number): string {
  if (score <= 50) {
    const t = score / 50
    const r = Math.round(122 + (249 - 122) * t)
    const g = Math.round(59  + (115 - 59)  * t)
    const b = Math.round(30  + (22  - 30)  * t)
    return `rgb(${r},${g},${b})`
  } else {
    const t = (score - 50) / 50
    const r = Math.round(249 + (255 - 249) * t)
    const g = Math.round(115 + (58  - 115) * t)
    const b = Math.round(22  + (110 - 22)  * t)
    return `rgb(${r},${g},${b})`
  }
}

export function ScoreSlider({ value: controlled, onChange, className }: ScoreSliderProps) {
  const value = controlled ?? 50

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    onChange?.(parseInt(e.target.value))
  }

  const color = getScoreColor(value)
  const bucket = Math.min(100, Math.round(value / 10) * 10)
  const label = LABELS[bucket]

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <style>{`
        .score-slider { -webkit-appearance: none; appearance: none; width: 100%; height: 4px; border-radius: 2px; outline: none; cursor: pointer; }
        .score-slider::-webkit-slider-thumb { -webkit-appearance: none; width: 22px; height: 22px; border-radius: 50%; background: #fff; box-shadow: 0 1px 6px rgba(0,0,0,0.5); cursor: pointer; }
        .score-slider::-moz-range-thumb { width: 22px; height: 22px; border-radius: 50%; background: #fff; border: none; box-shadow: 0 1px 6px rgba(0,0,0,0.5); cursor: pointer; }
      `}</style>

      {/* Score number */}
      <div className="flex items-baseline gap-1.5">
        <span className="text-[36px] font-bold leading-none tabular-nums" style={{ color }}>
          {value}
        </span>
        <span className="text-[14px] text-text-faint">/100</span>
      </div>

      {/* Label */}
      <div className="text-[13px] italic leading-[1.4] min-h-[18px]" style={{ color }}>
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
