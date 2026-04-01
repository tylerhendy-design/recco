'use client'

import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { StatusBar } from '@/components/ui/StatusBar'
import { GivePageInner } from '@/app/(app)/send/page'
import { GetPageInner } from '@/app/(app)/get/page'
import { ManualAddInner } from '@/app/(app)/send/manual/page'

type Mode = 'give' | 'get' | 'quick'

export default function RecoPage() {
  return <Suspense><RecoPageInner /></Suspense>
}

function RecoPageInner() {
  const searchParams = useSearchParams()
  const initialMode = (searchParams.get('mode') as Mode) ?? 'give'
  const [mode, setMode] = useState<Mode>(initialMode)

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <StatusBar />

      {/* Mode toggle */}
      <div className="flex-shrink-0 px-4 pt-2 pb-3">
        <div className="flex bg-bg-card border border-border rounded-xl p-1 gap-1">
          {([
            { key: 'give', label: 'Give' },
            { key: 'get', label: 'Get' },
            { key: 'quick', label: 'Quick Add' },
          ] as { key: Mode; label: string }[]).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setMode(tab.key)}
              className={`flex-1 py-2.5 rounded-lg text-[13px] font-semibold text-center transition-all ${
                mode === tab.key
                  ? 'bg-accent text-accent-fg'
                  : 'text-text-faint hover:text-text-secondary'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Active mode */}
      <div className="flex-1 min-h-0 flex flex-col">
        {mode === 'give' && <GivePageInner embedded />}
        {mode === 'get' && <GetPageInner embedded />}
        {mode === 'quick' && <ManualAddInner embedded />}
      </div>
    </div>
  )
}
