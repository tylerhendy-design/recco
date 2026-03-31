'use client'

import { useState, useEffect } from 'react'
import { StatusBar } from '@/components/ui/StatusBar'
import { NavHeader } from '@/components/ui/NavHeader'
import { getCategoryLabel, getCategoryColor } from '@/constants/categories'
import { createClient } from '@/lib/supabase/client'
import QRCode from 'qrcode'

type RecoRequest = {
  id: string
  category: string | null
  context: string
  created_at: string
}

export default function MyRequestsPage() {
  const [requests, setRequests] = useState<RecoRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [qrDataUrls, setQrDataUrls] = useState<Record<string, string>>({})
  const [copiedId, setCopiedId] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Use service role via API to fetch (RLS blocks direct reads)
      const res = await fetch(`/api/my-requests`)
      if (res.ok) {
        const data = await res.json()
        setRequests(data)
      }
      setLoading(false)
    }
    load()
  }, [])

  function getShareUrl(id: string) {
    return `${window.location.origin}/r/request/${id}`
  }

  async function generateQR(id: string) {
    if (qrDataUrls[id]) return
    const url = getShareUrl(id)
    const dataUrl = await QRCode.toDataURL(url, {
      width: 200, margin: 2,
      color: { dark: '#0c0c0e', light: '#ffffff' },
    })
    setQrDataUrls(prev => ({ ...prev, [id]: dataUrl }))
  }

  async function handleShare(req: RecoRequest) {
    const url = getShareUrl(req.id)
    const payload = parsePayload(req.context)
    const catLabel = req.category ? getCategoryLabel(req.category) : 'recommendation'
    const text = `I'm looking for a ${catLabel.toLowerCase()} recommendation. Got one for me?`

    if (navigator.share) {
      try { await navigator.share({ title: 'RECO — Give me a reco', text, url }); return } catch {}
    }
    await navigator.clipboard.writeText(url)
    setCopiedId(req.id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  function parsePayload(context: string) {
    try { return JSON.parse(context) } catch { return {} }
  }

  function timeAgo(dateStr: string): string {
    const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000)
    if (days === 0) return 'Today'
    if (days === 1) return 'Yesterday'
    if (days < 7) return `${days} days ago`
    if (days < 30) return `${Math.floor(days / 7)}w ago`
    return `${Math.floor(days / 30)}mo ago`
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <StatusBar />
      <NavHeader title="Your requests" closeHref="/get" />

      <div className="flex-1 overflow-y-auto scrollbar-none px-4 pt-4 pb-24">
        {loading && (
          <div className="flex justify-center py-12">
            <div className="w-5 h-5 border-2 border-border border-t-accent rounded-full animate-spin" />
          </div>
        )}

        {!loading && requests.length === 0 && (
          <div className="text-center py-16">
            <div className="text-[16px] font-semibold text-white mb-2">No requests yet</div>
            <div className="text-[13px] text-text-faint">When you request recos, they'll appear here so you can re-share them.</div>
          </div>
        )}

        {requests.map((req) => {
          const payload = parsePayload(req.context)
          const catLabel = req.category ? getCategoryLabel(req.category) : null
          const catColor = req.category ? getCategoryColor(req.category) : '#888'
          const constraints = payload?.constraints as Record<string, string> | undefined
          const details = payload?.details as string | undefined
          const isExpanded = expandedId === req.id

          return (
            <div key={req.id} className="mb-3 bg-bg-card border border-border rounded-card overflow-hidden">
              {/* Summary row */}
              <button
                onClick={() => { setExpandedId(isExpanded ? null : req.id); if (!isExpanded) generateQR(req.id) }}
                className="w-full flex items-center gap-3 px-4 py-3.5 text-left"
              >
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: catColor }} />
                <div className="flex-1 min-w-0">
                  <div className="text-[14px] font-semibold text-white truncate">
                    {catLabel ?? 'Recommendation'} request
                  </div>
                  <div className="text-[11px] text-text-faint">{timeAgo(req.created_at)}</div>
                </div>
                <svg
                  width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round"
                  className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                >
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>

              {/* Expanded details + share */}
              {isExpanded && (
                <div className="px-4 pb-4 border-t border-border pt-3">
                  {/* Constraints */}
                  {constraints && Object.keys(constraints).length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-2.5">
                      {Object.entries(constraints).map(([key, value]) => (
                        <span key={key} className="text-[11px] font-medium text-white/70 px-2.5 py-1 bg-white/5 border border-white/10 rounded-full">
                          {value}
                        </span>
                      ))}
                    </div>
                  )}
                  {details && (
                    <div className="text-[13px] text-text-secondary leading-[1.5] mb-3">"{details}"</div>
                  )}

                  {/* Share actions */}
                  <div className="flex gap-2 mb-3">
                    <button
                      onClick={() => handleShare(req)}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 border border-border rounded-input text-[13px] font-semibold text-text-secondary hover:border-accent hover:text-accent transition-colors"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/>
                      </svg>
                      {copiedId === req.id ? 'Link copied' : 'Share link'}
                    </button>
                  </div>

                  {/* QR code */}
                  {qrDataUrls[req.id] && (
                    <div className="flex flex-col items-center">
                      <div className="w-[160px] h-[160px] bg-white rounded-xl flex items-center justify-center mb-2">
                        <img src={qrDataUrls[req.id]} alt="QR code" width={160} height={160} className="rounded-xl" />
                      </div>
                      <div className="text-[10px] text-text-faint">Scan to see your request</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
