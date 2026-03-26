'use client'

import { useState } from 'react'
import { getSentimentColor, getSentimentLabel } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface ScoreSliderProps {
  value?: number
  onChange?: (value: number) => void
  className?: string
}

export function ScoreSlider({ value: controlled, onChange, className }: ScoreSliderProps) {
  const [internal, setInternal] = useState(50)
  const value = controlled ?? internal

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = parseInt(e.target.value)
    setInternal(v)
    onChange?.(v)
  }

  const label = getSentimentLabel(value)
  const color = getSentimentColor(value)

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <div className="py-2">
        <input
          type="range"
          min={0}
          max={100}
          value={value}
          step={1}
          onChange={handleChange}
          className="w-full"
          style={{ accentColor: color }}
        />
      </div>
      <div className="flex justify-between text-[10px] text-text-faint">
        <span>Bad</span>
        <span className="font-semibold" style={{ color }}>
          {label} — {value}
        </span>
        <span>Good</span>
      </div>
    </div>
  )
}
