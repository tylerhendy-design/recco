'use client'

import { useState } from 'react'
import { BottomSheet } from '@/components/ui/BottomSheet'

export type SenderItem = {
  key: string           // profile ID or "manual::name"
  label: string         // display name
  sub?: string          // @username if registered
  isRegistered: boolean // has a profiles row
  userId?: string       // profile ID if registered
}

type MergeState = 'idle' | 'merging' | 'done'

interface SenderMergeSheetProps {
  open: boolean
  onClose: () => void
  itemA: SenderItem | null
  itemB: SenderItem | null
  onMerge: (canonical: { name: string; userId?: string }, absorbed: { name: string; userId?: string }, type: 'quick_add_to_user' | 'quick_add_to_quick_add' | 'user_to_user') => Promise<string | null>
}

export function SenderMergeSheet({ open, onClose, itemA, itemB, onMerge }: SenderMergeSheetProps) {
  const [state, setState] = useState<MergeState>('idle')
  const [selectedName, setSelectedName] = useState<string | null>(null)
  const [customName, setCustomName] = useState('')
  const [useCustom, setUseCustom] = useState(false)

  if (!itemA || !itemB) return null

  const bothRegistered = itemA.isRegistered && itemB.isRegistered
  const oneRegistered = itemA.isRegistered !== itemB.isRegistered
  const noneRegistered = !itemA.isRegistered && !itemB.isRegistered

  // Determine which is the registered one (if any)
  const registered = itemA.isRegistered ? itemA : itemB.isRegistered ? itemB : null
  const manual = !itemA.isRegistered ? itemA : !itemB.isRegistered ? itemB : null

  async function handleMerge() {
    setState('merging')

    if (oneRegistered && registered && manual) {
      // Case A: Quick Add → Registered User
      const mergeId = await onMerge(
        { name: registered.label, userId: registered.userId },
        { name: manual.label },
        'quick_add_to_user'
      )
      if (mergeId) setState('done')
      else setState('idle')
    } else if (noneRegistered) {
      // Case B: Quick Add → Quick Add
      const canonicalName = useCustom ? customName.trim() : (selectedName ?? itemA.label)
      const absorbedName = canonicalName === itemA.label ? itemB.label : itemA.label
      const mergeId = await onMerge(
        { name: canonicalName },
        { name: absorbedName },
        'quick_add_to_quick_add'
      )
      if (mergeId) setState('done')
      else setState('idle')
    }
  }

  function handleClose() {
    setState('idle')
    setSelectedName(null)
    setCustomName('')
    setUseCustom(false)
    onClose()
  }

  const canConfirmB = noneRegistered && (selectedName || (useCustom && customName.trim().length >= 2))

  return (
    <BottomSheet open={open} onClose={handleClose}>
      <div className="p-5 pt-3">

        {/* Case A: Quick Add → Registered User */}
        {oneRegistered && registered && manual && (
          <>
            <div className="text-[18px] font-semibold text-white tracking-[-0.4px] mb-4">Merge these senders?</div>
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1 bg-bg-base border border-border rounded-xl px-3 py-2.5 text-center">
                <div className="text-[14px] text-text-secondary">{manual.label}</div>
                <div className="text-[11px] text-text-faint mt-0.5">Quick add</div>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              <div className="flex-1 bg-accent/8 border border-accent/30 rounded-xl px-3 py-2.5 text-center">
                <div className="text-[14px] text-white font-medium">{registered.label}</div>
                {registered.sub && <div className="text-[11px] text-accent mt-0.5">{registered.sub}</div>}
              </div>
            </div>
            <div className="text-[13px] text-text-muted leading-[1.6] mb-5">
              All recos from "{manual.label}" will be credited to {registered.label}.
            </div>
            <div className="flex gap-2">
              <button onClick={handleClose} className="flex-1 py-3 border border-border rounded-btn text-[14px] font-semibold text-text-secondary">
                Keep separate
              </button>
              <button
                onClick={handleMerge}
                disabled={state === 'merging'}
                className="flex-[2] py-3 bg-accent text-accent-fg rounded-btn text-[14px] font-bold disabled:opacity-50"
              >
                {state === 'merging' ? 'Merging...' : 'Merge'}
              </button>
            </div>
          </>
        )}

        {/* Case B: Two Quick Add names */}
        {noneRegistered && (
          <>
            <div className="text-[18px] font-semibold text-white tracking-[-0.4px] mb-4">Which spelling is correct?</div>
            <div className="flex flex-col gap-2 mb-3">
              <button
                onClick={() => { setSelectedName(itemA.label); setUseCustom(false) }}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors text-left ${
                  selectedName === itemA.label && !useCustom ? 'border-accent bg-accent/8' : 'border-border'
                }`}
              >
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${selectedName === itemA.label && !useCustom ? 'border-accent' : 'border-border'}`}>
                  {selectedName === itemA.label && !useCustom && <div className="w-2 h-2 rounded-full bg-accent" />}
                </div>
                <span className="text-[14px] text-white">{itemA.label}</span>
              </button>
              <button
                onClick={() => { setSelectedName(itemB.label); setUseCustom(false) }}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors text-left ${
                  selectedName === itemB.label && !useCustom ? 'border-accent bg-accent/8' : 'border-border'
                }`}
              >
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${selectedName === itemB.label && !useCustom ? 'border-accent' : 'border-border'}`}>
                  {selectedName === itemB.label && !useCustom && <div className="w-2 h-2 rounded-full bg-accent" />}
                </div>
                <span className="text-[14px] text-white">{itemB.label}</span>
              </button>
              <button
                onClick={() => { setUseCustom(true); setSelectedName(null) }}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors text-left ${
                  useCustom ? 'border-accent bg-accent/8' : 'border-border'
                }`}
              >
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${useCustom ? 'border-accent' : 'border-border'}`}>
                  {useCustom && <div className="w-2 h-2 rounded-full bg-accent" />}
                </div>
                <span className="text-[14px] text-text-faint">Neither — let me type it</span>
              </button>
              {useCustom && (
                <input
                  autoFocus
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="Correct name..."
                  className="ml-7 bg-bg-card border border-border rounded-input px-3.5 py-3 text-[14px] text-white placeholder:text-[#444] outline-none focus:border-accent font-sans"
                />
              )}
            </div>
            <div className="text-[12px] text-text-faint leading-[1.5] mb-4">
              This name will be used for all their recos.
            </div>
            <div className="flex gap-2">
              <button onClick={handleClose} className="flex-1 py-3 border border-border rounded-btn text-[14px] font-semibold text-text-secondary">
                Cancel
              </button>
              <button
                onClick={handleMerge}
                disabled={!canConfirmB || state === 'merging'}
                className="flex-[2] py-3 bg-accent text-accent-fg rounded-btn text-[14px] font-bold disabled:opacity-40"
              >
                {state === 'merging' ? 'Merging...' : 'Confirm'}
              </button>
            </div>
          </>
        )}

        {/* Case C: Two registered users */}
        {bothRegistered && (
          <>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[20px]">⚠️</span>
              <div className="text-[18px] font-semibold text-white tracking-[-0.4px]">Two different accounts</div>
            </div>
            <div className="flex flex-col gap-2 mb-3">
              <div className="bg-bg-base border border-border rounded-xl px-4 py-3">
                <div className="text-[14px] text-white font-medium">{itemA.label}</div>
                {itemA.sub && <div className="text-[11px] text-text-faint mt-0.5">{itemA.sub}</div>}
              </div>
              <div className="bg-bg-base border border-border rounded-xl px-4 py-3">
                <div className="text-[14px] text-white font-medium">{itemB.label}</div>
                {itemB.sub && <div className="text-[11px] text-text-faint mt-0.5">{itemB.sub}</div>}
              </div>
            </div>
            <div className="text-[13px] text-text-muted leading-[1.6] mb-5">
              The second account will be deactivated. This can't be undone from the app.
            </div>
            <div className="flex gap-2">
              <button onClick={handleClose} className="flex-1 py-3 border border-border rounded-btn text-[14px] font-semibold text-text-secondary">
                Cancel
              </button>
              <button
                onClick={handleMerge}
                disabled={state === 'merging'}
                className="flex-[2] py-3 bg-[#EF4444] text-white rounded-btn text-[14px] font-bold disabled:opacity-50"
              >
                {state === 'merging' ? 'Merging...' : 'Merge accounts'}
              </button>
            </div>
          </>
        )}
      </div>
    </BottomSheet>
  )
}
