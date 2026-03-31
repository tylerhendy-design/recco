'use client'

import { useState } from 'react'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { sendSinBinPlea } from '@/lib/data/sinbin'
import { getCategoryLabel } from '@/constants/categories'

interface PleaSheetProps {
  open: boolean
  onClose: () => void
  fromUserId: string
  toUserId: string
  toName: string
  category: string
}

export function PleaSheet({ open, onClose, fromUserId, toUserId, toName, category }: PleaSheetProps) {
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const firstName = toName.split(' ')[0]
  const catLabel = getCategoryLabel(category).toLowerCase()

  function handleClose() {
    setMessage('')
    setSending(false)
    setSent(false)
    onClose()
  }

  async function handleSend() {
    if (!message.trim() || sending) return
    setSending(true)
    const { error } = await sendSinBinPlea(fromUserId, toUserId, category, message.trim())
    if (!error) setSent(true)
    setSending(false)
  }

  return (
    <BottomSheet open={open} onClose={handleClose}>
      <div className="p-6 pt-4 flex flex-col gap-5">
        {sent ? (
          <div className="text-center flex flex-col items-center gap-4 py-4">
            <div className="text-[36px]">🙏</div>
            <div className="text-[18px] font-bold text-white tracking-[-0.4px]">Plea sent.</div>
            <div className="text-[14px] text-text-muted leading-[1.6]">
              {firstName} will see your message. The rest is up to them.
            </div>
            <button
              onClick={handleClose}
              className="w-full py-3.5 bg-accent text-accent-fg rounded-btn text-[14px] font-bold"
            >
              Done
            </button>
          </div>
        ) : (
          <>
            <div>
              <div className="text-[11px] font-semibold text-bad tracking-[0.8px] uppercase mb-2">Sin bin plea</div>
              <div className="text-[20px] font-bold text-white tracking-[-0.4px] leading-[1.2]">
                Plead your case.
              </div>
              <div className="text-[14px] text-text-muted mt-2 leading-[1.6]">
                You're in {firstName}'s sin bin for {catLabel}. Make it genuine — tell them you have an incredible reco they'll love.
              </div>
            </div>

            <div>
              <div className="text-[11px] font-semibold text-text-faint tracking-[0.6px] uppercase mb-2">Your plea</div>
              <textarea
                rows={1}
                className="w-full bg-bg-card border border-border rounded-input px-3.5 py-3 text-[14px] text-text-secondary placeholder:text-[#444] outline-none focus:border-accent font-sans resize-none min-h-[44px]"
                placeholder="Be specific. What's the reco, and why will they love it?"
                value={message}
                onChange={(e) => { setMessage(e.target.value); const el = e.target; el.style.height = 'auto'; el.style.height = `${el.scrollHeight}px` }}
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleClose}
                className="flex-1 py-3 border border-border rounded-input text-[13px] font-semibold text-text-dim hover:border-text-faint transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSend}
                disabled={!message.trim() || sending}
                className={`flex-[2] py-3 rounded-input text-[13px] font-bold transition-all ${
                  message.trim() && !sending
                    ? 'bg-accent text-accent-fg hover:opacity-90'
                    : 'bg-accent/30 text-accent-fg/50 cursor-not-allowed'
                }`}
              >
                {sending ? 'Sending…' : 'Send plea'}
              </button>
            </div>
          </>
        )}
      </div>
    </BottomSheet>
  )
}
