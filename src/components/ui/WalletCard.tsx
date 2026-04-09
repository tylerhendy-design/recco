'use client'

import { getCategoryLabel } from '@/constants/categories'
import { extractRecoCity } from '@/lib/city'
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
  tv:          { bg: '#0D47A1', gradient: '#1976D2', text: '#fff' },
  wine_bars:   { bg: '#4A0E0E', gradient: '#7B1F1F', text: '#fff' },
  custom:      { bg: '#9E9D24', gradient: '#D4E23A', text: '#111' },
}

export function getWalletColor(category: string) {
  return WALLET_COLORS[category] || { bg: '#333', gradient: '#555', text: '#fff' }
}

// Extract 1-2 detail pills from reco meta
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

// All available detail pills for expanded view
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
  const catLabel = getCategoryLabel(reco.category)
  const isDone = reco.status === 'done'
  const isNoGo = reco.status === 'no_go'
  const detailPills = getDetailPills(reco)
  const pillStyle = { backgroundColor: 'rgba(255,255,255,0.15)', color: colors.text }

  return (
    <div
      className="w-full rounded-2xl overflow-hidden cursor-pointer"
      style={{
        background: `linear-gradient(135deg, ${colors.gradient} 0%, ${colors.bg} 100%)`,
        boxShadow: '0 -1px 0 rgba(255,255,255,0.08) inset, 0 4px 12px rgba(0,0,0,0.4)',
        transition: 'max-height 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
        maxHeight: expanded ? 600 : 100,
      }}
    >
      {/* Collapsed header — always visible, this is what peeks through the stack */}
      <div
        className="flex items-center px-5 gap-3 active:opacity-80 transition-opacity"
        style={{ height: 100 }}
        onClick={onToggle}
      >
        <div className="flex-1 min-w-0">
          {/* Row 1: Category + detail lozenges */}
          <div className="flex items-center gap-1.5 mb-1 overflow-hidden">
            <span
              className="text-[10px] font-bold uppercase tracking-[0.8px] flex-shrink-0"
              style={{ color: colors.text, opacity: 0.55 }}
            >
              {catLabel}
            </span>
            {detailPills.map((pill, i) => (
              <span
                key={i}
                className="text-[9px] font-semibold px-2 py-0.5 rounded-full truncate max-w-[100px] flex-shrink-0"
                style={pillStyle}
              >
                {pill}
              </span>
            ))}
            {isDone && reco.score != null && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0" style={pillStyle}>
                {reco.score}/10
              </span>
            )}
            {isNoGo && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0" style={pillStyle}>
                No go
              </span>
            )}
          </div>
          {/* Row 2: Title */}
          <div className="text-[17px] font-bold truncate leading-tight" style={{ color: colors.text }}>
            {reco.title}
          </div>
          {/* Row 3: Sender */}
          <div className="text-[11px] mt-0.5 truncate" style={{ color: colors.text, opacity: 0.45 }}>
            from {senderName} · {timeAgo(reco.created_at)}
          </div>
        </div>
        {artworkUrl && (
          <img
            src={artworkUrl}
            alt=""
            className="w-14 h-14 rounded-xl object-cover flex-shrink-0"
            style={{ border: '1px solid rgba(255,255,255,0.12)' }}
          />
        )}
        {expanded && (
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={colors.text} strokeWidth="2.5" strokeLinecap="round">
              <path d="M18 15l-6-6-6 6"/>
            </svg>
          </div>
        )}
      </div>

      {/* Expanded content — slides open below header */}
      {expanded && (
        <div className="px-5 pb-5" style={{ color: colors.text }}>
          {/* Hero image */}
          {artworkUrl && (
            <img
              src={artworkUrl}
              alt=""
              className="w-full h-44 object-cover rounded-xl mb-4"
              style={{ border: '1px solid rgba(255,255,255,0.1)' }}
            />
          )}

          {/* All detail pills */}
          {getAllPills(reco).length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-4">
              {getAllPills(reco).map((pill, i) => (
                <span
                  key={i}
                  className="text-[11px] font-medium px-2.5 py-1 rounded-full"
                  style={{ backgroundColor: 'rgba(255,255,255,0.12)', color: colors.text }}
                >
                  {pill.value}
                </span>
              ))}
            </div>
          )}

          {/* Why text */}
          {reco.why_text && (
            <div className="mb-4">
              <div className="text-[10px] font-bold uppercase tracking-[0.5px] mb-1" style={{ opacity: 0.5 }}>
                Why
              </div>
              <div className="text-[14px] leading-[1.5]" style={{ opacity: 0.85 }}>
                "{reco.why_text}"
              </div>
            </div>
          )}

          {/* Links */}
          {(reco.meta?.website || reco.meta?.spotify_url || reco.meta?.instagram) && (
            <div className="flex flex-wrap gap-2 mb-4">
              {reco.meta?.website && (
                <a
                  href={reco.meta.website as string}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] font-semibold px-3 py-1.5 rounded-full"
                  style={{ backgroundColor: 'rgba(255,255,255,0.15)', color: colors.text }}
                  onClick={e => e.stopPropagation()}
                >
                  Website
                </a>
              )}
              {reco.meta?.spotify_url && (
                <a
                  href={reco.meta.spotify_url as string}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] font-semibold px-3 py-1.5 rounded-full"
                  style={{ backgroundColor: 'rgba(255,255,255,0.15)', color: colors.text }}
                  onClick={e => e.stopPropagation()}
                >
                  Spotify
                </a>
              )}
              {reco.meta?.instagram && (
                <a
                  href={`https://instagram.com/${(reco.meta.instagram as string).replace('@', '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] font-semibold px-3 py-1.5 rounded-full"
                  style={{ backgroundColor: 'rgba(255,255,255,0.15)', color: colors.text }}
                  onClick={e => e.stopPropagation()}
                >
                  Instagram
                </a>
              )}
            </div>
          )}

          {/* Action buttons */}
          {!isDone && !isNoGo && (onMarkDone || onBeenThere || onNoGo) && (
            <div className="flex gap-2 mt-2">
              {onMarkDone && (
                <button
                  onClick={(e) => { e.stopPropagation(); onMarkDone(reco) }}
                  className="flex-1 py-2.5 rounded-xl text-[13px] font-bold text-center"
                  style={{ backgroundColor: 'rgba(255,255,255,0.2)', color: colors.text }}
                >
                  Done it
                </button>
              )}
              {onBeenThere && (
                <button
                  onClick={(e) => { e.stopPropagation(); onBeenThere(reco) }}
                  className="flex-1 py-2.5 rounded-xl text-[13px] font-bold text-center"
                  style={{ backgroundColor: 'rgba(255,255,255,0.12)', color: colors.text }}
                >
                  Been there
                </button>
              )}
              {onNoGo && (
                <button
                  onClick={(e) => { e.stopPropagation(); onNoGo(reco) }}
                  className="py-2.5 px-4 rounded-xl text-[13px] font-bold"
                  style={{ backgroundColor: 'rgba(255,255,255,0.08)', color: colors.text, opacity: 0.7 }}
                >
                  No go
                </button>
              )}
            </div>
          )}

          {/* Forward for done recos */}
          {isDone && onForward && (
            <button
              onClick={(e) => { e.stopPropagation(); onForward(reco) }}
              className="w-full py-2.5 rounded-xl text-[13px] font-bold text-center mt-2"
              style={{ backgroundColor: 'rgba(255,255,255,0.15)', color: colors.text }}
            >
              Forward to a friend
            </button>
          )}

          {/* Score display for done */}
          {isDone && reco.score != null && (
            <div className="flex items-center gap-3 mt-4 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center text-[18px] font-bold"
                style={{ backgroundColor: 'rgba(255,255,255,0.15)', color: colors.text }}
              >
                {reco.score}
              </div>
              <div>
                <div className="text-[13px] font-semibold" style={{ opacity: 0.8 }}>Your score</div>
                {reco.feedback_text && (
                  <div className="text-[12px] mt-0.5" style={{ opacity: 0.5 }}>"{reco.feedback_text}"</div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
