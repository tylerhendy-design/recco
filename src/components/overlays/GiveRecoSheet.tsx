'use client'

import { useState } from 'react'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { CategoryChip } from '@/components/ui/CategoryChip'
import { VoiceButton } from '@/components/ui/VoiceButton'
import { CATEGORIES, type CategoryId } from '@/constants/categories'
import { sendReco } from '@/lib/data/recos'

function getLinkLabel(url: string): string {
  try {
    const u = new URL(url)
    const h = u.hostname.replace('www.', '')
    if (h.includes('instagram.com')) return 'Instagram'
    if (h.includes('twitter.com') || h.includes('x.com')) return 'X / Twitter'
    if (h.includes('google.com') && u.pathname.includes('maps')) return 'Google Maps'
    if (h.includes('maps.apple.com')) return 'Apple Maps'
    if (h.includes('spotify.com')) return 'Spotify'
    if (h.includes('youtube.com') || h.includes('youtu.be')) return 'YouTube'
    if (h.includes('facebook.com')) return 'Facebook'
    if (h.includes('tripadvisor.com')) return 'TripAdvisor'
    if (h.includes('yelp.com')) return 'Yelp'
    if (h.includes('opentable.com')) return 'OpenTable'
    if (h.includes('resy.com')) return 'Resy'
    if (h.includes('imdb.com')) return 'IMDb'
    if (h.includes('netflix.com')) return 'Netflix'
    if (h.includes('goodreads.com')) return 'Goodreads'
    if (h.includes('amazon.')) return 'Amazon'
    if (h.includes('apple.com')) return 'Apple'
    return 'Website'
  } catch {
    return 'Link'
  }
}

interface GiveRecoSheetProps {
  open: boolean
  onClose: () => void
  senderId: string
  recipientId: string
  recipientName: string
  blockedCategories?: string[]
}

export function GiveRecoSheet({
  open,
  onClose,
  senderId,
  recipientId,
  recipientName,
  blockedCategories = [],
}: GiveRecoSheetProps) {
  const firstName = recipientName.split(' ')[0]

  const [category, setCategory] = useState<CategoryId | null>(null)
  const [customCat, setCustomCat] = useState('')
  const [title, setTitle] = useState('')
  const [why, setWhy] = useState('')
  const [links, setLinks] = useState<string[]>([''])
  const [linksOpen, setLinksOpen] = useState(false)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function reset() {
    setCategory(null)
    setCustomCat('')
    setTitle('')
    setWhy('')
    setLinks([''])
    setLinksOpen(false)
    setSending(false)
    setSent(false)
    setError(null)
  }

  function handleClose() {
    reset()
    onClose()
  }

  const isCategoryBlocked = category !== null && blockedCategories.includes(category)
  const canSend = category !== null && title.trim().length > 0 && !sending && !isCategoryBlocked

  async function handleSend() {
    if (!canSend) return
    setSending(true)
    setError(null)

    const finalCat = category === 'custom' ? 'custom' : category!
    const finalCustomCat = category === 'custom' ? customCat.trim() : undefined

    const { error: err } = await sendReco({
      senderId,
      category: finalCat,
      customCat: finalCustomCat,
      title: title.trim(),
      whyText: why.trim() || undefined,
      links: links.filter((l) => l.trim()),
      recipientIds: [recipientId],
    })

    if (err) {
      setError(err)
      setSending(false)
      return
    }

    setSent(true)
  }

  return (
    <BottomSheet open={open} onClose={sent ? handleClose : onClose} className="max-h-[90vh] overflow-y-auto scrollbar-none">
      {sent ? (
        <div className="p-6 pt-4 text-center flex flex-col items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-accent/10 border border-accent/30 flex items-center justify-center">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#D4E23A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
          <div>
            <div className="text-[19px] font-semibold text-white tracking-[-0.4px] mb-1.5">
              Reco given. Good job.
            </div>
            <div className="text-[13px] text-text-dim leading-[1.6]">
              We hope {firstName} loves it.
            </div>
          </div>
          <button
            onClick={handleClose}
            className="w-full py-3.5 bg-accent text-accent-fg rounded-btn text-[14px] font-bold"
          >
            Done
          </button>
        </div>
      ) : (
        <div className="p-5 pt-4 flex flex-col gap-4">
          <div className="text-[17px] font-semibold text-white tracking-[-0.4px]">
            Give {firstName} a reco
          </div>

          {/* Category */}
          <div>
            <div className="text-[11px] font-semibold text-text-muted tracking-[0.4px] uppercase mb-2">Category</div>
            <div className="flex flex-wrap gap-[7px]">
              {CATEGORIES.map((cat) => (
                <CategoryChip
                  key={cat.id}
                  id={cat.id}
                  selected={category === cat.id}
                  dashed={cat.id === 'custom'}
                  onClick={() => setCategory(cat.id === category ? null : cat.id as CategoryId)}
                />
              ))}
            </div>
            {category === 'custom' && (
              <input
                value={customCat}
                onChange={(e) => setCustomCat(e.target.value)}
                placeholder="Category name…"
                className="w-full mt-2 bg-bg-card border border-border rounded-input px-3 py-2 text-[13px] text-white placeholder:text-text-faint outline-none focus:border-accent"
              />
            )}
            {isCategoryBlocked && (
              <div className="mt-2.5 px-3 py-2.5 bg-bad/10 border border-bad/30 rounded-input">
                <div className="text-[12px] font-semibold text-bad">Sin bin</div>
                <div className="text-[12px] text-bad/80 mt-0.5 leading-[1.5]">
                  {firstName} has sin-binned you from giving {category} recos. You can't send recos in this category until they let you out.
                </div>
              </div>
            )}
          </div>

          {/* Name */}
          <div>
            <div className="text-[11px] font-semibold text-text-muted tracking-[0.4px] uppercase mb-2">Name</div>
            <input
              className="w-full bg-bg-card border border-border rounded-input px-3 py-2.5 text-[15px] text-white placeholder:text-text-faint outline-none focus:border-accent font-sans"
              placeholder="Name it…"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* Why */}
          <div>
            <div className="text-[11px] font-semibold text-text-muted tracking-[0.4px] uppercase mb-2">Why?</div>
            <div className="flex gap-2 items-start">
              <VoiceButton />
              <textarea
                className="flex-1 bg-bg-card border border-border rounded-input px-3 py-2 text-[13px] text-text-secondary outline-none placeholder:text-text-faint font-sans resize-none focus:border-accent"
                placeholder="Voice or type your reason…"
                rows={3}
                value={why}
                onChange={(e) => setWhy(e.target.value)}
              />
            </div>
          </div>

          {/* Links toggle */}
          <button
            onClick={() => setLinksOpen((o) => !o)}
            className="flex items-center justify-between w-full text-[12px] font-semibold text-text-faint hover:text-text-muted transition-colors"
          >
            <span>Links <span className="font-normal">— optional</span></span>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className={`transition-transform duration-200 ${linksOpen ? 'rotate-180' : ''}`}>
              <path d="M6 9l6 6 6-6"/>
            </svg>
          </button>

          {linksOpen && (
            <div className="flex flex-col gap-2 -mt-2">
              {links.map((link, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="flex items-center gap-2 flex-1 bg-bg-card border border-border rounded-input px-3 py-2">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#777" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
                      <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/>
                      <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/>
                    </svg>
                    <input
                      className="flex-1 bg-transparent outline-none text-[13px] text-text-secondary placeholder:text-border font-sans"
                      placeholder="Paste a URL…"
                      value={link}
                      onChange={(e) => { const n = [...links]; n[i] = e.target.value; setLinks(n) }}
                    />
                    {link.trim() && (
                      <span className="text-[10px] text-text-faint flex-shrink-0">{getLinkLabel(link)}</span>
                    )}
                  </div>
                  {links.length > 1 && (
                    <button onClick={() => setLinks(links.filter((_, j) => j !== i))} className="w-6 h-6 flex items-center justify-center text-text-faint hover:text-bad transition-colors flex-shrink-0">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                      </svg>
                    </button>
                  )}
                </div>
              ))}
              <button onClick={() => setLinks([...links, ''])} className="flex items-center gap-1.5 text-[12px] font-semibold text-text-dim hover:text-text-secondary transition-colors">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                Add another link
              </button>
            </div>
          )}

          {error && (
            <div className="text-[12px] text-red-400 text-center">{error}</div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 py-3 border border-border rounded-input text-[13px] font-semibold text-text-dim hover:border-text-faint transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSend}
              disabled={!canSend}
              className={`flex-[2] py-3 rounded-input text-[13px] font-bold transition-all ${
                canSend ? 'bg-accent text-accent-fg hover:opacity-90' : 'bg-accent/30 text-accent-fg/50 cursor-not-allowed'
              }`}
            >
              {sending ? 'Giving…' : 'Give reco'}
            </button>
          </div>
        </div>
      )}
    </BottomSheet>
  )
}
