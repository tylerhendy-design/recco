'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { StatusBar } from '@/components/ui/StatusBar'
import { NavHeader } from '@/components/ui/NavHeader'
import { createClient } from '@/lib/supabase/client'
import { fetchNotifications, markAllRead, markNotificationHandled, type NotificationRow } from '@/lib/data/notifications'
import { acceptFriendRequest, declineFriendRequest } from '@/lib/data/friends'
import { releaseSinBin, fetchBlockedCategories } from '@/lib/data/sinbin'
import { initials, formatRelativeTime, getScoreColor, getScoreTextColor } from '@/lib/utils'
import { GiveRecoSheet } from '@/components/overlays/GiveRecoSheet'

export default function NotificationsPage() {
  const [userId, setUserId] = useState<string | null>(null)
  const [notifs, setNotifs] = useState<NotificationRow[]>([])
  const [loading, setLoading] = useState(true)
  const [handled, setHandled] = useState<Record<string, 'accepted' | 'declined' | 'released' | 'kept' | 'completed'>>({})
  const [filter, setFilter] = useState<string>('all')
  const [archived, setArchived] = useState<Set<string>>(new Set())

  function archiveNotif(id: string) {
    setArchived(prev => new Set(prev).add(id))
  }

  const FILTERS = [
    { value: 'all', label: 'All' },
    { value: 'recos', label: 'Recos' },
    { value: 'reviews', label: 'Reviews' },
    { value: 'messages', label: 'Messages' },
    { value: 'stinkers', label: 'Stinkers' },
    { value: 'friends', label: 'Friends' },
    { value: 'sinbin', label: 'Sin bin' },
    { value: 'archived', label: 'Archived' },
  ]

  const filtered = useMemo(() => {
    if (filter === 'archived') return notifs.filter(n => archived.has(n.id))
    const active = notifs.filter(n => !archived.has(n.id))
    if (filter === 'all') return active
    return active.filter((n) => {
      if (filter === 'recos') return n.type === 'reco_received' && n.payload?.subtype !== 'message'
      if (filter === 'reviews') return n.type === 'feedback_received'
      if (filter === 'messages') return n.type === 'reco_received' && n.payload?.subtype === 'message'
      if (filter === 'stinkers') return n.type === 'feedback_received' && n.payload?.score != null && n.payload.score <= 3
      if (filter === 'friends') return n.type === 'friend_request' || n.type === 'friend_accepted'
      if (filter === 'sinbin') return n.type === 'sin_bin'
      return true
    })
  }, [notifs, filter])

  const [replyTarget, setReplyTarget] = useState<{
    notifId: string
    notifPayload: Record<string, any>
    recipientId: string
    recipientName: string
    category: string | null
    context: string | null
    count: number
    blockedCategories: string[]
  } | null>(null)

  useEffect(() => {
    createClient().auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      setUserId(user.id)
      const data = await fetchNotifications(user.id)
      setNotifs(data)
      // Seed handled state from persisted payload
      const persistedHandled: Record<string, 'accepted' | 'declined' | 'released' | 'kept' | 'completed'> = {}
      for (const n of data) {
        if (n.payload?.handled) persistedHandled[n.id] = n.payload.handled
      }
      setHandled(persistedHandled)
      setLoading(false)
      // Mark all as read once viewed
      markAllRead(user.id)
    })
  }, [])

  async function handleAccept(notif: NotificationRow) {
    if (!userId) return
    const connectionId = notif.payload?.connection_id
    if (!connectionId) return
    setHandled((prev) => ({ ...prev, [notif.id]: 'accepted' }))
    await Promise.all([
      acceptFriendRequest(connectionId, notif.actor_id, userId),
      markNotificationHandled(notif.id, notif.payload, 'accepted'),
    ])
  }

  async function handleDecline(notif: NotificationRow) {
    const connectionId = notif.payload?.connection_id
    if (!connectionId) return
    setHandled((prev) => ({ ...prev, [notif.id]: 'declined' }))
    await Promise.all([
      declineFriendRequest(connectionId),
      markNotificationHandled(notif.id, notif.payload, 'declined'),
    ])
  }

  function buildRequestContext(payload: Record<string, any>): string | null {
    const constraints = payload?.constraints as Record<string, string> | undefined
    const details = payload?.details as string | undefined
    const parts = [
      ...(constraints ? Object.values(constraints).filter(Boolean) : []),
      details,
    ].filter(Boolean)
    return parts.length > 0 ? parts.join(' · ') : null
  }

  async function handleReleasePlea(notif: NotificationRow) {
    if (!userId) return
    const { category } = notif.payload ?? {}
    if (!category) return
    setHandled((prev) => ({ ...prev, [notif.id]: 'released' }))
    await Promise.all([
      releaseSinBin(notif.actor_id, userId, category),
      markNotificationHandled(notif.id, notif.payload, 'released'),
    ])
  }

  async function handleKeepPlea(notif: NotificationRow) {
    setHandled((prev) => ({ ...prev, [notif.id]: 'kept' }))
    await markNotificationHandled(notif.id, notif.payload, 'kept')
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <StatusBar />
      <div className="flex items-center justify-between px-6 pt-4 pb-2 flex-shrink-0">
        <div className="text-[22px] font-bold text-white tracking-[-0.5px]">Notifications</div>
        <Link href="/home" className="flex items-center justify-center w-9 h-9">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </Link>
      </div>

      {/* Filter bar */}
      {notifs.length > 0 && (
        <div className="flex gap-1.5 overflow-x-auto scrollbar-none px-6 pb-3 flex-shrink-0">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`px-3 py-1.5 rounded-full text-[12px] font-semibold flex-shrink-0 transition-all ${
                filter === f.value
                  ? 'bg-accent text-accent-fg'
                  : 'bg-bg-card border border-border text-text-faint'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      )}

      <div className="flex-1 overflow-y-auto scrollbar-none">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-5 h-5 border-2 border-border border-t-accent rounded-full animate-spin" />
          </div>
        ) : notifs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-10 text-center gap-3">
            <div className="text-[36px] mb-1">🔔</div>
            <div className="text-[16px] font-semibold text-white">Nothing yet</div>
            <div className="text-[13px] text-text-muted leading-[1.6]">
              You'll see friend requests and reco activity here.
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="text-[14px] text-text-faint">No {FILTERS.find(f => f.value === filter)?.label.toLowerCase()} notifications.</div>
          </div>
        ) : (
          filtered.map((n) => (
            <NotifRow
              key={n.id}
              notif={n}
              userId={userId}
              onArchive={() => archiveNotif(n.id)}
              isArchived={archived.has(n.id)}
              handled={handled[n.id]}
              onAccept={() => handleAccept(n)}
              onDecline={() => handleDecline(n)}
              onReleasePlea={() => handleReleasePlea(n)}
              onKeepPlea={() => handleKeepPlea(n)}
              onReply={async () => {
                const blocked = userId ? await fetchBlockedCategories(userId, n.actor_id) : []
                setReplyTarget({
                  notifId: n.id,
                  notifPayload: n.payload,
                  recipientId: n.actor_id,
                  recipientName: n.actor.display_name,
                  category: n.payload?.category ?? null,
                  context: buildRequestContext(n.payload),
                  count: n.payload?.count ?? 1,
                  blockedCategories: blocked,
                })
              }}
            />
          ))
        )}
      </div>

      {userId && replyTarget && (
        <GiveRecoSheet
          open={!!replyTarget}
          onClose={() => setReplyTarget(null)}
          senderId={userId}
          recipientId={replyTarget.recipientId}
          recipientName={replyTarget.recipientName}
          blockedCategories={replyTarget.blockedCategories}
          initialCategory={replyTarget.category}
          requestContext={replyTarget.context}
          requestCount={replyTarget.count}
          onAllSent={async () => {
            setHandled((prev) => ({ ...prev, [replyTarget.notifId]: 'completed' }))
            await markNotificationHandled(replyTarget.notifId, replyTarget.notifPayload, 'completed')
          }}
        />
      )}
    </div>
  )
}

function getNotifIcon(notif: NotificationRow): { emoji?: string; svg?: React.ReactNode; bg: string } {
  const score = notif.payload?.score
  const subtype = notif.payload?.subtype

  // Absolute zero (score 1)
  if (notif.type === 'feedback_received' && score != null && score <= 1) {
    return { emoji: '💀', bg: '#1a0a0a' }
  }
  // Proper stinker (score 2)
  if (notif.type === 'feedback_received' && score != null && score <= 2) {
    return { emoji: '🚨💩🚨', bg: '#2a1a0a' }
  }
  // Stinker (score 3)
  if (notif.type === 'feedback_received' && score != null && score <= 3) {
    return { emoji: '💩', bg: '#2a1a0a' }
  }
  // Crown (score >= 9)
  if (notif.type === 'feedback_received' && score != null && score >= 9) {
    return { emoji: '👑', bg: '#2a2500' }
  }
  // Good review (7-8)
  if (notif.type === 'feedback_received' && score != null && score >= 7) {
    return { emoji: '🔥', bg: '#1a2010' }
  }
  // Meh review (4-6)
  if (notif.type === 'feedback_received' && score != null) {
    return { emoji: '😐', bg: '#1a1a1a' }
  }
  // No go
  if (notif.type === 'feedback_received' && subtype === 'no_go') {
    return { emoji: '🚫', bg: '#2a0a0a' }
  }
  // Been there
  if (notif.type === 'feedback_received' && subtype === 'been_there') {
    return { emoji: '🔄', bg: '#0a1a2a' }
  }
  // Feedback (generic)
  if (notif.type === 'feedback_received') {
    return { emoji: '⭐', bg: '#2a2500' }
  }
  // Reco received
  if (notif.type === 'reco_received' && subtype === 'message') {
    return { emoji: '💬', bg: '#0a1a2a' }
  }
  if (notif.type === 'reco_received' && subtype === 'forwarded') {
    return { emoji: '🚀', bg: '#1a1020' }
  }
  if (notif.type === 'reco_received') {
    const cat = notif.payload?.category
    const catEmoji: Record<string, string> = {
      restaurant: '🍽️',
      bars: '🍺',
      book: '📚',
      clubs: '🪩',
      cocktails: '🍸',
      culture: '🎭',
      film: '🎬',
      music: '🎵',
      podcast: '🎙️',
      pubs: '🍻',
      tv: '📺',
      wine_bars: '🍷',
    }
    return { emoji: catEmoji[cat] ?? '🎁', bg: '#1a1020' }
  }
  // Friend request
  if (notif.type === 'friend_request') {
    return { emoji: '👋', bg: '#0a1a2a' }
  }
  // Friend accepted
  if (notif.type === 'friend_accepted') {
    return { emoji: '🤝', bg: '#0a2a1a' }
  }
  // Request received
  if (notif.type === 'request_received') {
    return { emoji: '🤲', bg: '#2a1a2a' }
  }
  // Sin bin
  if (notif.type === 'sin_bin' && subtype === 'plea') {
    return { emoji: '👁️👄👁️', bg: '#2a1a0a' }
  }
  if (notif.type === 'sin_bin' && subtype === 'released') {
    return { emoji: '🕊️', bg: '#0a2a1a' }
  }
  if (notif.type === 'sin_bin') {
    return { emoji: '⛔', bg: '#2a0a0a' }
  }
  return { emoji: '🔔', bg: '#1a1a1a' }
}

function NotifRow({
  notif,
  userId,
  handled,
  onAccept,
  onDecline,
  onReleasePlea,
  onKeepPlea,
  onReply,
  onArchive,
  isArchived,
}: {
  notif: NotificationRow
  userId: string | null
  handled?: 'accepted' | 'declined' | 'released' | 'kept' | 'completed'
  onAccept: () => void
  onDecline: () => void
  onArchive: () => void
  isArchived: boolean
  onReleasePlea: () => void
  onKeepPlea: () => Promise<void> | void
  onReply: () => void
}) {
  const actor = notif.actor
  const time = formatRelativeTime(notif.created_at)
  const firstName = actor.display_name
  const icon = getNotifIcon(notif)

  let heading = ''
  let body = ''
  let scoreLozenge: { score: number; title?: string; feedbackText?: string; category?: string } | null = null

  const isPlea = notif.type === 'sin_bin' && notif.payload?.subtype === 'plea'
  const isReleased = notif.type === 'sin_bin' && notif.payload?.subtype === 'released'

  if (notif.type === 'friend_request') {
    heading = `${icon.emoji} Friend request`
    body = `${firstName} wants to add you as a friend.`
  } else if (notif.type === 'friend_accepted') {
    heading = `${icon.emoji} New friend`
    body = `${firstName} accepted your friend request.`
  } else if (notif.type === 'request_received') {
    const cat = notif.payload?.category
    const count = notif.payload?.count ?? 1
    const subtype = notif.payload?.subtype
    const constraints = notif.payload?.constraints as Record<string, string> | undefined
    const details = notif.payload?.details as string | undefined
    const constraintStr = constraints && Object.keys(constraints).length > 0
      ? Object.values(constraints).join(' · ')
      : null
    const extra = [constraintStr, details].filter(Boolean).join(' · ')
    heading = `${icon.emoji} Reco request`
    if (subtype === 'been_there_new_request') {
      const original = notif.payload?.original_title
      body = `${firstName} already has "${original}" — they want a new ${cat ? `${cat} ` : ''}reco.`
    } else {
      body = `${firstName} is asking for ${count > 1 ? `${count} ` : ''}${cat ? `a ${cat} ` : ''}reco${count > 1 ? 's' : ''}.${extra ? ` ${extra}` : ''}`
    }
  } else if (notif.type === 'reco_received' && notif.payload?.subtype === 'forwarded') {
    const title = notif.payload?.title
    const forwardedTo = notif.payload?.forwarded_to
    const count = notif.payload?.forwarded_count ?? 1
    heading = `${icon.emoji} Reco forwarded`
    const forwardLines = [
      `${firstName} forwarded your reco${title ? ` "${title}"` : ''} to ${forwardedTo ?? `${count} ${count === 1 ? 'person' : 'people'}`}. You're becoming a tastemaker.`,
      `${firstName} forwarded ${title ? `"${title}"` : 'your reco'}. This is how myths become legends.`,
      `Another forward${title ? ` for "${title}"` : ''}. One more and you get a physical trophy.`,
      `${firstName} forwarded ${title ? `"${title}"` : 'your reco'} to ${forwardedTo ?? 'a friend'}. Top jaw.`,
      `Your reco${title ? ` "${title}"` : ''} is spreading. ${firstName} just forwarded it. Reco legend status.`,
    ]
    body = forwardLines[Math.abs(notif.id.charCodeAt(0)) % forwardLines.length]
  } else if (notif.type === 'reco_received' && notif.payload?.subtype === 'message') {
    const title = notif.payload?.title
    const preview = notif.payload?.message_preview
    heading = `${icon.emoji} New message`
    body = `${firstName}${title ? ` about ${title}` : ''}: "${preview ?? ''}"`
  } else if (notif.type === 'reco_received') {
    const title = notif.payload?.title
    const cat = notif.payload?.category
    heading = `${icon.emoji} New ${cat ? `${cat} ` : ''}reco`
    body = `${firstName} just sent you${title ? ` "${title}"` : ' a reco'}.`
  } else if (isPlea) {
    const category = notif.payload?.category ?? ''
    heading = `${icon.emoji} Sin bin plea`
    body = `${firstName} is pleading to get out of your sin bin for ${category}.`
  } else if (isReleased) {
    const category = notif.payload?.category ?? ''
    heading = `${icon.emoji} Released`
    body = `${firstName} released you from their sin bin for ${category}. Freedom.`
  } else if (notif.type === 'sin_bin') {
    const category = notif.payload?.category ?? ''
    const lastReco = notif.payload?.last_reco_title
    heading = `${icon.emoji} Sin binned`
    body = `3rd strike. You're in ${firstName}'s sin bin for ${category}.${lastReco ? ` "${lastReco}" pushed them over the edge.` : ''}`
  } else if (notif.type === 'feedback_received') {
    const subtype = notif.payload?.subtype
    const score = notif.payload?.score
    const category = notif.payload?.reco_category
    const recoTitle = notif.payload?.reco_title

    if (subtype === 'pick_rated') {
      const pickTitle = notif.payload?.pick_title
      const pickScore = notif.payload?.score
      heading = `⭐ TOP 03 rated`
      body = `${firstName} rated your pick${pickTitle ? ` "${pickTitle}"` : ''} ${pickScore}/10.`
    } else if (subtype === 'no_go') {
      heading = `🚫 No go`
      body = `${firstName} is not doing${recoTitle ? ` "${recoTitle}"` : ' your reco'}.`
      if (notif.payload?.feedback_text) {
        scoreLozenge = { score: -1, title: undefined, feedbackText: notif.payload.feedback_text, category }
      }
    } else if (subtype === 'been_there') {
      heading = `🔄 Been there`
      body = `${firstName} already did${recoTitle ? ` "${recoTitle}"` : ' this one'}.`
    } else {
      if (score != null && score >= 9) heading = `${icon.emoji} They loved it`
      else if (score != null && score >= 7) heading = `${icon.emoji} Solid reco`
      else if (score != null && score >= 5) heading = `${icon.emoji} Meh`
      else if (score != null && score >= 3) heading = `${icon.emoji} Stinker`
      else if (score != null && score <= 1) heading = `${icon.emoji} Unforgivable`
      else if (score != null) heading = `${icon.emoji} Proper stinker`
      else heading = `${icon.emoji} Review`

      body = `${firstName} reviewed${recoTitle ? ` "${recoTitle}"` : ` your ${category ?? ''}reco`}.`
      if (score != null) {
        scoreLozenge = {
          score,
          title: undefined,
          feedbackText: notif.payload?.feedback_text,
          category,
        }
      }
    }
  }

  // Determine where this notification should link to
  let href: string | null = null
  if (notif.type === 'reco_received' && notif.payload?.subtype === 'message') {
    href = notif.reco_id ? `/notifications/${notif.reco_id}?with=${notif.actor_id}` : '/notifications'
  } else if (notif.type === 'reco_received' && notif.payload?.subtype === 'forwarded') {
    href = notif.reco_id ? `/home?reco=${notif.reco_id}` : '/home'
  } else if (notif.type === 'reco_received') {
    href = notif.reco_id ? `/home?reco=${notif.reco_id}` : '/home'
  }
  else if (notif.type === 'feedback_received' && notif.reco_id) href = `/notifications/${notif.reco_id}?with=${notif.actor_id}`
  else if (notif.type === 'friend_accepted') href = `/friends/${notif.actor_id}`
  else if (notif.type === 'sin_bin' && !isPlea && !isReleased) href = '/sinbin'
  else if (isReleased) href = `/reco?mode=give&to=${notif.actor_id}&context=prove`

  const Wrapper = href
    ? ({ children, className }: { children: React.ReactNode; className: string }) => <Link href={href!} className={className}>{children}</Link>
    : ({ children, className }: { children: React.ReactNode; className: string }) => <div className={className}>{children}</div>

  return (
    <Wrapper className={`block px-6 py-4 border-b border-[#0e0e10] ${!notif.read ? 'border-l-2 border-l-accent' : ''}`}>
      <div className="flex items-start gap-3">
        {/* Avatar + score badge */}
        <div className="relative flex-shrink-0">
          <div className="w-10 h-10 rounded-full bg-bg-card border border-border flex items-center justify-center text-[11px] font-bold text-text-secondary overflow-hidden">
            {actor.avatar_url
              ? <img src={actor.avatar_url} alt={actor.display_name} className="w-full h-full object-cover" />
              : initials(actor.display_name)
            }
          </div>
          {scoreLozenge != null && scoreLozenge.score >= 0 && (() => {
            const bg = getScoreColor(scoreLozenge.score)
            const fg = getScoreTextColor(scoreLozenge.score)
            return (
              <div
                className="absolute -top-1 -right-1 w-[22px] h-[22px] rounded-full flex items-center justify-center text-[9px] font-black border-2 border-[#0c0c0e]"
                style={{ background: bg, color: fg }}
              >
                {scoreLozenge.score}
              </div>
            )
          })()}
        </div>

        <div className="flex-1 min-w-0">
          <div className="text-[12px] font-bold text-white tracking-[0.3px] mb-0.5">{heading}</div>
          <div className="text-[13px] text-text-muted leading-[1.5]">{body}</div>
          {scoreLozenge?.feedbackText ? (
            <div className="text-[12px] text-text-muted mt-0.5 leading-[1.4]">
              {scoreLozenge.feedbackText}
            </div>
          ) : null}
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[11px] text-text-faint flex-1">{time}</span>
            {href && (
              <svg
                width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                className="flex-shrink-0"
              >
                <path d="M9 18l6-6-6-6"/>
              </svg>
            )}
          </div>

          {/* Friend request actions */}
          {notif.type === 'friend_request' && (
            <div className="flex gap-2 mt-2.5">
              {handled === 'accepted' ? (
                <span className="text-[12px] text-accent font-medium">Friends!</span>
              ) : handled === 'declined' ? (
                <span className="text-[12px] text-text-faint">Declined</span>
              ) : (
                <>
                  <button
                    onClick={onDecline}
                    className="px-3 py-1.5 rounded-chip border border-border text-[12px] text-text-faint hover:border-red-400 hover:text-red-400 transition-colors"
                  >
                    Decline
                  </button>
                  <button
                    onClick={onAccept}
                    className="px-3 py-1.5 rounded-chip border border-accent text-[12px] text-accent font-semibold hover:bg-accent/10 transition-colors"
                  >
                    Accept
                  </button>
                </>
              )}
            </div>
          )}

          {/* Reco request — Give reco button / completed state */}
          {notif.type === 'request_received' && (
            <div className="mt-2.5">
              {handled === 'completed' ? (() => {
                const count = notif.payload?.count ?? 1
                const cat = notif.payload?.category
                const firstName = actor.display_name
                return (
                  <span className="text-[12px] text-accent font-medium">
                    Completed {firstName}'s request for {count > 1 ? `${count} ` : ''}{cat ? `${cat} ` : ''}reco{count > 1 ? 's' : ''}.
                  </span>
                )
              })() : (
                <button
                  onClick={onReply}
                  className="px-3 py-1.5 rounded-chip border border-accent text-[12px] font-semibold text-accent hover:bg-accent/10 transition-colors"
                >
                  Give reco
                </button>
              )}
            </div>
          )}

          {/* Sin bin plea actions */}
          {isPlea && (
            <div className="mt-2">
              {notif.payload?.message && (
                <div className="text-[12px] text-text-muted bg-bg-card border border-border rounded-input px-3 py-2 mb-2.5 leading-[1.5]">
                  "{notif.payload.message}"
                </div>
              )}
              {handled === 'released' ? (
                <span className="text-[12px] text-accent font-medium">Released from sin bin.</span>
              ) : handled === 'kept' ? (
                <span className="text-[12px] text-text-faint">Kept in sin bin.</span>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={onKeepPlea}
                    className="px-3 py-1.5 rounded-chip border border-border text-[12px] text-text-faint hover:border-bad/40 hover:text-bad/80 transition-colors"
                  >
                    Keep in sin bin
                  </button>
                  <button
                    onClick={onReleasePlea}
                    className="px-3 py-1.5 rounded-chip border border-accent text-[12px] text-accent font-semibold hover:bg-accent/10 transition-colors"
                  >
                    Release them
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Sin bin released — send a reco to prove yourself */}
          {isReleased && (
            <div className="mt-2">
              <Link
                href={`/reco?mode=give&to=${notif.actor_id}`}
                className="inline-flex px-3 py-1.5 rounded-chip border border-accent text-[12px] font-semibold text-accent hover:bg-accent/10 transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                Prove yourself — send a reco
              </Link>
            </div>
          )}
        </div>
      </div>
    </Wrapper>
  )
}
