'use client'

import { useState, useEffect } from 'react'
import { getCategoryLabel } from '@/constants/categories'
import { extractRecoCity } from '@/lib/city'
import { getProgressActions, saveProgress } from '@/lib/data/recos'
import { createClient } from '@/lib/supabase/client'
import type { Reco } from '@/types/app.types'

// Rich, saturated card colours per category — inspired by Apple Wallet
const WALLET_COLORS: Record<string, { bg: string; gradient: string; text: string }> = {
  restaurant:  { bg: '#C62828', gradient: '#EF5350', text: '#fff' },
  bars:        { bg: '#E65100', gradient: '#FF8F00', text: '#fff' },
  book:        { bg: '#BF360C', gradient: '#E64A19', text: '#fff' },
  clubs:       { bg: '#AD1457', gradient: '#EC407A', text: '#fff' },
  cocktails:   { bg: '#880E4F', gradient: '#D81B60', text: '#fff' },
  culture:     { bg: '#283593', gradient: '#5C6BC0', text: '#fff' },
  film:        { bg: '#1a1a2e', gradient: '#2d2d44', text: '#fff' },
  music:       { bg: '#1B5E20', gradient: '#43A047', text: '#fff' },
  podcast:     { bg: '#4A148C', gradient: '#7B1FA2', text: '#fff' },
  pubs:        { bg: '#33691E', gradient: '#689F38', text: '#fff' },
  shopping:    { bg: '#B45309', gradient: '#F59E0B', text: '#fff' },
  tv:          { bg: '#0D47A1', gradient: '#1976D2', text: '#fff' },
  wine_bars:   { bg: '#4A0E0E', gradient: '#7B1F1F', text: '#fff' },
  custom:      { bg: '#9E9D24', gradient: '#D4E23A', text: '#111' },
}

export function getWalletColor(category: string) {
  return WALLET_COLORS[category] || { bg: '#333', gradient: '#555', text: '#fff' }
}

function getDetailPills(reco: Reco): string[] {
  const pills: string[] = []
  const meta = reco.meta
  const city = extractRecoCity(meta)
  if (city) pills.push(city)
  if (meta?.streaming_service && pills.length < 2) pills.push(meta.streaming_service as string)
  if (meta?.artist && pills.length < 2) pills.push(meta.artist as string)
  if (meta?.author && pills.length < 2) pills.push(meta.author as string)
  if (meta?.director && pills.length < 2) pills.push(meta.director as string)
  if (meta?.topic && pills.length < 2) pills.push(meta.topic as string)
  if (meta?.occasion && pills.length < 2) pills.push(meta.occasion as string)
  if (meta?.genre && pills.length < 2) pills.push(meta.genre as string)
  return pills
}

function getAllPills(reco: Reco): { label: string; value: string }[] {
  const pills: { label: string; value: string }[] = []
  const meta = reco.meta
  const city = extractRecoCity(meta)
  if (city) pills.push({ label: 'Location', value: city })
  if (meta?.address) pills.push({ label: 'Address', value: meta.address as string })
  if (meta?.streaming_service) pills.push({ label: 'Streaming', value: meta.streaming_service as string })
  if (meta?.artist) pills.push({ label: 'Artist', value: meta.artist as string })
  if (meta?.author) pills.push({ label: 'Author', value: meta.author as string })
  if (meta?.director) pills.push({ label: 'Director', value: meta.director as string })
  if (meta?.topic) pills.push({ label: 'Topic', value: meta.topic as string })
  if (meta?.genre) pills.push({ label: 'Genre', value: meta.genre as string })
  if (meta?.occasion) pills.push({ label: 'Occasion', value: meta.occasion as string })
  if (meta?.price) pills.push({ label: 'Price', value: meta.price as string })
  if (meta?.mood) pills.push({ label: 'Mood', value: meta.mood as string })
  if (meta?.era) pills.push({ label: 'Era', value: meta.era as string })
  if (meta?.vibes) pills.push({ label: 'Vibes', value: meta.vibes as string })
  return pills
}

function timeAgo(dateStr: string): string {
  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000)
  if (days === 0) return 'today'
  if (days === 1) return '1 day ago'
  if (days < 7) return `${days} days ago`
  if (days < 30) return `${Math.floor(days / 7)}w ago`
  if (days < 365) return `${Math.floor(days / 30)}mo ago`
  return `${Math.floor(days / 365)}y ago`
}

interface WalletCardProps {
  reco: Reco
  expanded?: boolean
  onToggle?: () => void
  onMarkDone?: (reco: Reco) => void
  onBeenThere?: (reco: Reco) => void
  onNoGo?: (reco: Reco) => void
  onForward?: (reco: Reco) => void
}

export function WalletCard({ reco, expanded, onToggle, onMarkDone, onBeenThere, onNoGo, onForward }: WalletCardProps) {
  const colors = getWalletColor(reco.category)
  const artworkUrl = reco.meta?.artwork_url || reco.meta?.image_url
  const senderName = (reco.meta?.manual_sender_name as string)?.trim() || reco.sender?.display_name || 'Someone'
  const catLabel = reco.category === 'custom' && reco.custom_cat ? reco.custom_cat : getCategoryLabel(reco.category)
  const isDone = reco.status === 'done'
  const isNoGo = reco.status === 'no_go'
  const detailPills = getDetailPills(reco)
  const pillStyle = { backgroundColor: 'rgba(255,255,255,0.15)', color: colors.text }
  const progressActions = getProgressActions(reco.category)

  const [viewerId, setViewerId] = useState<string | null>(null)
  const [localProgress, setLocalProgress] = useState<{ status: string; label: string } | null>(null)
  const [progressSaving, setProgressSaving] = useState(false)

  useEffect(() => {
    createClient().auth.getUser().then(({ data }) => {
      if (data.user) {
        setViewerId(data.user.id)
        const prog = (reco.meta?.progress as Record<string, { status: string; label: string }> | undefined)
        if (prog?.[data.user.id]) setLocalProgress(prog[data.user.id])
      }
    })
  }, [reco.meta])

  // ── Collapsed card header (always rendered in the wallet stack) ──
  const cardHeader = (
    <div
      className="flex items-start px-5 pt-3 gap-3 active:opacity-80 transition-opacity"
      style={{ height: 100 }}
      onClick={onToggle}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-1 overflow-hidden">
          <span className="text-[10px] font-bold uppercase tracking-[0.8px] flex-shrink-0" style={{ color: colors.text, opacity: 0.55 }}>
            {catLabel}
          </span>
          {detailPills.map((pill, i) => (
            <span key={i} className="text-[9px] font-semibold px-2 py-0.5 rounded-full truncate max-w-[100px] flex-shrink-0" style={pillStyle}>
              {pill}
            </span>
          ))}
          {isDone && reco.score != null && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0" style={pillStyle}>{reco.score}/10</span>
          )}
          {isNoGo && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0" style={pillStyle}>No go</span>
          )}
          {localProgress && !isDone && !isNoGo && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0" style={{ backgroundColor: 'rgba(212,226,58,0.25)', color: '#D4E23A' }}>
              {localProgress.label}
            </span>
          )}
        </div>
        <div className="text-[17px] font-bold truncate leading-tight" style={{ color: colors.text }}>{reco.title}</div>
        <div className="text-[11px] mt-0.5 truncate" style={{ color: colors.text, opacity: 0.45 }}>
          from {senderName} · {timeAgo(reco.created_at)}
        </div>
      </div>
      {artworkUrl && (
        <img src={artworkUrl} alt="" className="w-14 h-14 rounded-xl object-cover flex-shrink-0" style={{ border: '1px solid rgba(255,255,255,0.12)' }} />
      )}
    </div>
  )

  return (
    <>
      {/* Collapsed card in the wallet stack */}
      <div
        className="w-full rounded-2xl overflow-hidden cursor-pointer"
        style={{
          background: `linear-gradient(135deg, ${colors.gradient} 0%, ${colors.bg} 100%)`,
          boxShadow: '0 -1px 0 rgba(255,255,255,0.08) inset, 0 4px 12px rgba(0,0,0,0.4)',
          height: 100,
        }}
      >
        {cardHeader}
      </div>

      {/* Expanded overlay — fixed position, above EVERYTHING including TabBar */}
      {expanded && (
        <>
          <div className="fixed inset-0 z-[200] bg-black/60" onClick={onToggle} />
          <div
            className="fixed inset-x-0 bottom-0 z-[201] max-h-[85vh] overflow-y-auto scrollbar-none rounded-t-[20px]"
            style={{ background: `linear-gradient(135deg, ${colors.gradient} 0%, ${colors.bg} 100%)` }}
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1 sticky top-0" style={{ background: `linear-gradient(135deg, ${colors.gradient} 0%, ${colors.bg} 100%)` }}>
              <div className="w-10 h-1 rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.25)' }} />
            </div>

            {/* Card header repeated in overlay */}
            <div className="flex items-center px-5 gap-3 pb-2" style={{ color: colors.text }}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-1 overflow-hidden">
                  <span className="text-[10px] font-bold uppercase tracking-[0.8px] flex-shrink-0" style={{ opacity: 0.55 }}>{catLabel}</span>
                  {detailPills.map((pill, i) => (
                    <span key={i} className="text-[9px] font-semibold px-2 py-0.5 rounded-full truncate max-w-[100px] flex-shrink-0" style={pillStyle}>{pill}</span>
                  ))}
                  {isDone && reco.score != null && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0" style={pillStyle}>{reco.score}/10</span>
                  )}
                  {isNoGo && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0" style={pillStyle}>No go</span>
                  )}
                  {localProgress && !isDone && !isNoGo && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0" style={{ backgroundColor: 'rgba(212,226,58,0.25)', color: '#D4E23A' }}>
                      {localProgress.label}
                    </span>
                  )}
                </div>
                <div className="text-[22px] font-bold leading-tight">{reco.title}</div>
                <div className="text-[12px] mt-1" style={{ opacity: 0.5 }}>from {senderName} · {timeAgo(reco.created_at)}</div>
              </div>
              {artworkUrl && (
                <img src={artworkUrl} alt="" className="w-16 h-16 rounded-xl object-cover flex-shrink-0" style={{ border: '1px solid rgba(255,255,255,0.12)' }} />
              )}
            </div>

            {/* Expanded content */}
            <div className="px-5 pb-8" style={{ color: colors.text }}>
              {/* Hero image */}
              {artworkUrl && (
                <img src={artworkUrl} alt="" className="w-full h-44 object-cover rounded-xl mb-4 mt-2" style={{ border: '1px solid rgba(255,255,255,0.1)' }} />
              )}

              {/* All detail pills */}
              {getAllPills(reco).length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {getAllPills(reco).map((pill, i) => (
                    <span key={i} className="text-[11px] font-medium px-2.5 py-1 rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.12)' }}>
                      {pill.value}
                    </span>
                  ))}
                </div>
              )}

              {/* Why text */}
              {reco.why_text && (
                <div className="mb-4">
                  <div className="text-[10px] font-bold uppercase tracking-[0.5px] mb-1" style={{ opacity: 0.5 }}>Why</div>
                  <div className="text-[14px] leading-[1.5]" style={{ opacity: 0.85 }}>"{reco.why_text}"</div>
                </div>
              )}

              {/* Links */}
              {(reco.meta?.website || reco.meta?.spotify_url || reco.meta?.instagram) && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {reco.meta?.website && (
                    <a href={reco.meta.website as string} target="_blank" rel="noopener noreferrer"
                      className="text-[11px] font-semibold px-3 py-1.5 rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}
                      onClick={e => e.stopPropagation()}>Website</a>
                  )}
                  {reco.meta?.spotify_url && (
                    <a href={reco.meta.spotify_url as string} target="_blank" rel="noopener noreferrer"
                      className="text-[11px] font-semibold px-3 py-1.5 rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}
                      onClick={e => e.stopPropagation()}>Spotify</a>
                  )}
                  {reco.meta?.instagram && (
                    <a href={`https://instagram.com/${(reco.meta.instagram as string).replace('@', '')}`} target="_blank" rel="noopener noreferrer"
                      className="text-[11px] font-semibold px-3 py-1.5 rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}
                      onClick={e => e.stopPropagation()}>Instagram</a>
                  )}
                </div>
              )}

              {/* Progress actions */}
              {!isDone && !isNoGo && progressActions.length > 0 && viewerId && (
                <div className="mb-4">
                  <div className="text-[10px] font-bold uppercase tracking-[0.5px] mb-2" style={{ opacity: 0.4 }}>Update progress</div>
                  <div className="flex flex-wrap gap-1.5">
                    {progressActions.map(action => {
                      const isActive = localProgress?.status === action.value
                      return (
                        <button
                          key={action.value}
                          disabled={progressSaving}
                          onClick={async (e) => {
                            e.stopPropagation()
                            if (!viewerId) return
                            setProgressSaving(true)
                            const { error } = await saveProgress(reco.id, viewerId, reco.sender_id, action.value, action.label, reco.title)
                            if (!error) setLocalProgress({ status: action.value, label: action.label })
                            setProgressSaving(false)
                          }}
                          className="text-[12px] font-semibold px-3 py-1.5 rounded-full transition-all"
                          style={{
                            backgroundColor: isActive ? 'rgba(212,226,58,0.25)' : 'rgba(255,255,255,0.12)',
                            color: isActive ? '#D4E23A' : colors.text,
                            border: isActive ? '1px solid rgba(212,226,58,0.4)' : '1px solid transparent',
                          }}
                        >
                          {isActive && '✓ '}{action.label}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Action buttons */}
              {!isDone && !isNoGo && (onMarkDone || onBeenThere || onNoGo) && (
                <div className="flex gap-2 mb-3">
                  {onMarkDone && (
                    <button onClick={(e) => { e.stopPropagation(); onMarkDone(reco); onToggle?.() }}
                      className="flex-1 py-3 rounded-xl text-[14px] font-bold text-center"
                      style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>
                      Done it
                    </button>
                  )}
                  {onBeenThere && (
                    <button onClick={(e) => { e.stopPropagation(); onBeenThere(reco); onToggle?.() }}
                      className="flex-1 py-3 rounded-xl text-[14px] font-bold text-center"
                      style={{ backgroundColor: 'rgba(255,255,255,0.12)' }}>
                      Been there
                    </button>
                  )}
                  {onNoGo && (
                    <button onClick={(e) => { e.stopPropagation(); onNoGo(reco); onToggle?.() }}
                      className="py-3 px-5 rounded-xl text-[14px] font-bold"
                      style={{ backgroundColor: 'rgba(255,255,255,0.08)', opacity: 0.7 }}>
                      No go
                    </button>
                  )}
                </div>
              )}

              {/* Forward for done recos */}
              {isDone && onForward && (
                <button onClick={(e) => { e.stopPropagation(); onForward(reco); onToggle?.() }}
                  className="w-full py-3 rounded-xl text-[14px] font-bold text-center mb-3"
                  style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}>
                  Forward to a friend
                </button>
              )}

              {/* Score display for done */}
              {isDone && reco.score != null && (
                <div className="flex items-center gap-3 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                  <div className="w-12 h-12 rounded-full flex items-center justify-center text-[18px] font-bold"
                    style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}>
                    {reco.score}
                  </div>
                  <div>
                    <div className="text-[13px] font-semibold" style={{ opacity: 0.8 }}>Your score</div>
                    {reco.feedback_text && <div className="text-[12px] mt-0.5" style={{ opacity: 0.5 }}>"{reco.feedback_text}"</div>}
                  </div>
                </div>
              )}

              {/* Cancel / close */}
              <button
                onClick={onToggle}
                className="w-full py-3.5 rounded-xl text-[14px] font-semibold text-center mt-4"
                style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}
              >
                Close
              </button>
            </div>
          </div>
        </>
      )}
    </>
  )
}
