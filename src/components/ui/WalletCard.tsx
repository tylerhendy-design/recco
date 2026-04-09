'use client'

import { getCategoryLabel } from '@/constants/categories'
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

interface WalletCardProps {
  reco: Reco
  onClick?: () => void
}

export function WalletCard({ reco, onClick }: WalletCardProps) {
  const colors = getWalletColor(reco.category)
  const artworkUrl = reco.meta?.artwork_url || reco.meta?.image_url
  const senderName = (reco.meta?.manual_sender_name as string)?.trim() || reco.sender?.display_name || 'Someone'
  const catLabel = getCategoryLabel(reco.category)
  const isDone = reco.status === 'done'
  const isNoGo = reco.status === 'no_go'

  return (
    <div
      className="w-full rounded-2xl overflow-hidden cursor-pointer active:scale-[0.98] transition-transform duration-100"
      style={{
        background: `linear-gradient(135deg, ${colors.gradient} 0%, ${colors.bg} 100%)`,
        height: 88,
        boxShadow: '0 -1px 0 rgba(255,255,255,0.08) inset, 0 4px 12px rgba(0,0,0,0.4)',
      }}
      onClick={onClick}
    >
      <div className="flex items-center h-full px-5 gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span
              className="text-[10px] font-bold uppercase tracking-[0.8px]"
              style={{ color: colors.text, opacity: 0.55 }}
            >
              {catLabel}
            </span>
            {isDone && reco.score != null && (
              <span
                className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                style={{ backgroundColor: 'rgba(255,255,255,0.15)', color: colors.text, opacity: 0.7 }}
              >
                {reco.score}/10
              </span>
            )}
            {isNoGo && (
              <span
                className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                style={{ backgroundColor: 'rgba(255,255,255,0.15)', color: colors.text, opacity: 0.7 }}
              >
                No go
              </span>
            )}
          </div>
          <div
            className="text-[17px] font-bold truncate leading-tight"
            style={{ color: colors.text }}
          >
            {reco.title}
          </div>
          <div
            className="text-[11px] mt-0.5 truncate"
            style={{ color: colors.text, opacity: 0.45 }}
          >
            from {senderName}
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
      </div>
    </div>
  )
}
