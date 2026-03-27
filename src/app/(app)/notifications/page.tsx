'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { StatusBar } from '@/components/ui/StatusBar'
import { NavHeader } from '@/components/ui/NavHeader'
import { createClient } from '@/lib/supabase/client'
import { fetchNotifications, markAllRead, type NotificationRow } from '@/lib/data/notifications'
import { acceptFriendRequest, declineFriendRequest } from '@/lib/data/friends'
import { initials, formatRelativeTime, getScoreColor } from '@/lib/utils'

export default function NotificationsPage() {
  const [userId, setUserId] = useState<string | null>(null)
  const [notifs, setNotifs] = useState<NotificationRow[]>([])
  const [loading, setLoading] = useState(true)
  const [handled, setHandled] = useState<Record<string, 'accepted' | 'declined'>>({})

  useEffect(() => {
    createClient().auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      setUserId(user.id)
      const data = await fetchNotifications(user.id)
      setNotifs(data)
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
    await acceptFriendRequest(connectionId, notif.actor_id, userId)
  }

  async function handleDecline(notif: NotificationRow) {
    const connectionId = notif.payload?.connection_id
    if (!connectionId) return
    setHandled((prev) => ({ ...prev, [notif.id]: 'declined' }))
    await declineFriendRequest(connectionId)
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <StatusBar />
      <NavHeader title="Notifications" closeHref="/home" />

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
        ) : (
          notifs.map((n) => (
            <NotifRow
              key={n.id}
              notif={n}
              handled={handled[n.id]}
              onAccept={() => handleAccept(n)}
              onDecline={() => handleDecline(n)}
            />
          ))
        )}
      </div>
    </div>
  )
}

function NotifRow({
  notif,
  handled,
  onAccept,
  onDecline,
}: {
  notif: NotificationRow
  handled?: 'accepted' | 'declined'
  onAccept: () => void
  onDecline: () => void
}) {
  const actor = notif.actor
  const time = formatRelativeTime(notif.created_at)

  let body = ''
  let scoreLozenge: { score: number; title?: string; feedbackText?: string; category?: string } | null = null

  if (notif.type === 'friend_request') body = 'wants to add you as a friend.'
  else if (notif.type === 'friend_accepted') body = 'accepted your friend request.'
  else if (notif.type === 'reco_received') {
    const title = notif.payload?.title
    body = title ? `gave you a reco: ${title}` : 'gave you a reco.'
  } else if (notif.type === 'feedback_received') {
    const score = notif.payload?.score
    const category = notif.payload?.reco_category
    const categoryLabel = category ? `${category} ` : ''
    body = `reviewed your ${categoryLabel}reco`
    if (score != null) {
      scoreLozenge = {
        score,
        title: notif.payload?.reco_title,
        feedbackText: notif.payload?.feedback_text,
        category,
      }
    }
  }

  return (
    <div className={`px-6 py-4 border-b border-[#0e0e10] ${!notif.read ? 'bg-bg-card/40' : ''}`}>
      <div className="flex items-start gap-3">
        {/* Unread dot */}
        <div className="pt-1 w-2 flex-shrink-0">
          {!notif.read && <div className="w-1.5 h-1.5 rounded-full bg-accent" />}
        </div>

        {/* Avatar */}
        <div className="w-9 h-9 rounded-full bg-bg-card border border-border flex items-center justify-center text-[11px] font-bold text-text-secondary overflow-hidden flex-shrink-0">
          {actor.avatar_url
            ? <img src={actor.avatar_url} alt={actor.display_name} className="w-full h-full object-cover" />
            : initials(actor.display_name)
          }
        </div>

        <div className="flex-1 min-w-0">
          <div className="text-[13px] text-white leading-[1.5]">
            <span className="font-semibold">{actor.display_name}</span>{' '}
            <span className="text-text-muted">{body}</span>
            {scoreLozenge != null && (() => {
              const c = getScoreColor(scoreLozenge.score)
              return (
                <span
                  className="inline-flex items-center ml-1.5 px-2 py-0.5 rounded-chip text-[11px] font-bold"
                  style={{ color: c, background: `${c}22`, border: `1px solid ${c}44` }}
                >
                  {scoreLozenge.score}/100
                </span>
              )
            })()}
          </div>
          {scoreLozenge?.title || scoreLozenge?.feedbackText ? (
            <div className="text-[12px] text-text-muted mt-0.5 leading-[1.4]">
              {scoreLozenge.title && <span className="font-medium text-white">{scoreLozenge.title}: </span>}
              {scoreLozenge.feedbackText}
            </div>
          ) : null}
          <div className="text-[11px] text-text-faint mt-0.5">{time}</div>

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
        </div>
      </div>
    </div>
  )
}
