'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { StatusBar } from '@/components/ui/StatusBar'
import { NavHeader } from '@/components/ui/NavHeader'
import { createClient } from '@/lib/supabase/client'
import { fetchNotifications, markAllRead, markNotificationHandled, type NotificationRow } from '@/lib/data/notifications'
import { acceptFriendRequest, declineFriendRequest } from '@/lib/data/friends'
import { releaseSinBin } from '@/lib/data/sinbin'
import { sendMessage } from '@/lib/data/messages'
import { initials, formatRelativeTime, getScoreColor } from '@/lib/utils'
import { GiveRecoSheet } from '@/components/overlays/GiveRecoSheet'

export default function NotificationsPage() {
  const [userId, setUserId] = useState<string | null>(null)
  const [notifs, setNotifs] = useState<NotificationRow[]>([])
  const [loading, setLoading] = useState(true)
  const [handled, setHandled] = useState<Record<string, 'accepted' | 'declined' | 'released' | 'kept' | 'completed'>>({})
  const [replyTarget, setReplyTarget] = useState<{
    notifId: string
    notifPayload: Record<string, any>
    recipientId: string
    recipientName: string
    category: string | null
    context: string | null
    count: number
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
    await acceptFriendRequest(connectionId, notif.actor_id, userId)
  }

  async function handleDecline(notif: NotificationRow) {
    const connectionId = notif.payload?.connection_id
    if (!connectionId) return
    setHandled((prev) => ({ ...prev, [notif.id]: 'declined' }))
    await declineFriendRequest(connectionId)
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
              userId={userId}
              handled={handled[n.id]}
              onAccept={() => handleAccept(n)}
              onDecline={() => handleDecline(n)}
              onReleasePlea={() => handleReleasePlea(n)}
              onKeepPlea={() => handleKeepPlea(n)}
              onReply={() => setReplyTarget({
                notifId: n.id,
                notifPayload: n.payload,
                recipientId: n.actor_id,
                recipientName: n.actor.display_name,
                category: n.payload?.category ?? null,
                context: buildRequestContext(n.payload),
                count: n.payload?.count ?? 1,
              })}
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

function getScoreReaction(score: number): { text: string; sub: string } {
  if (score >= 9) return { text: 'They absolutely loved it.', sub: 'Reco legend status.' }
  if (score >= 7) return { text: 'Solid reco.', sub: 'They are into it.' }
  if (score >= 5) return { text: 'Meh.', sub: 'Not bad, not great.' }
  if (score >= 3) return { text: 'Bit of a miss.', sub: 'Don\'t take it personally.' }
  return { text: 'Stinker alert.', sub: 'This one hurt.' }
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
}: {
  notif: NotificationRow
  userId: string | null
  handled?: 'accepted' | 'declined' | 'released' | 'kept' | 'completed'
  onAccept: () => void
  onDecline: () => void
  onReleasePlea: () => void
  onKeepPlea: () => Promise<void> | void
  onReply: () => void
}) {
  const actor = notif.actor
  const time = formatRelativeTime(notif.created_at)
  const [expanded, setExpanded] = useState(false)
  const [replyText, setReplyText] = useState('')
  const [replySending, setReplySending] = useState(false)
  const [replySent, setReplySent] = useState(false)
  const replyRef = useRef<HTMLInputElement>(null)

  let body = ''
  let scoreLozenge: { score: number; title?: string; feedbackText?: string; category?: string } | null = null

  const isPlea = notif.type === 'sin_bin' && notif.payload?.subtype === 'plea'
  const isReleased = notif.type === 'sin_bin' && notif.payload?.subtype === 'released'

  if (notif.type === 'friend_request') body = 'wants to add you as a friend.'
  else if (notif.type === 'friend_accepted') body = 'accepted your friend request.'
  else if (notif.type === 'request_received') {
    const cat = notif.payload?.category
    const count = notif.payload?.count ?? 1
    const subtype = notif.payload?.subtype
    const constraints = notif.payload?.constraints as Record<string, string> | undefined
    const details = notif.payload?.details as string | undefined
    const constraintStr = constraints && Object.keys(constraints).length > 0
      ? Object.values(constraints).join(' · ')
      : null
    const extra = [constraintStr, details].filter(Boolean).join(' · ')
    if (subtype === 'been_there_new_request') {
      const original = notif.payload?.original_title
      body = `already has "${original}" — they're asking for a new ${cat ? `${cat} ` : ''}reco.`
    } else {
      body = `is asking for ${count > 1 ? `${count} ` : ''}${cat ? `${cat} ` : ''}reco${count > 1 ? 's' : ''}.${extra ? ` ${extra}` : ''}`
    }
  } else if (notif.type === 'reco_received') {
    const title = notif.payload?.title
    body = title ? `gave you a reco: ${title}` : 'gave you a reco.'
  } else if (isPlea) {
    const category = notif.payload?.category ?? ''
    body = `is pleading to get out of your sin bin for ${category}.`
  } else if (notif.type === 'sin_bin' && notif.payload?.subtype === 'released') {
    const category = notif.payload?.category ?? ''
    body = `released you from their sin bin for ${category}. You can send them recos again.`
  } else if (notif.type === 'sin_bin') {
    const category = notif.payload?.category ?? ''
    const lastReco = notif.payload?.last_reco_title
    body = `Oh no. 3rd strike you are out. You're in ${actor.display_name.split(' ')[0]}'s sin bin for ${category}.${lastReco ? ` Seems it was "${lastReco}" that pushed them over the edge.` : ''}`
  } else if (notif.type === 'feedback_received') {
    const subtype = notif.payload?.subtype
    const score = notif.payload?.score
    const category = notif.payload?.reco_category
    const categoryLabel = category ? `${category} ` : ''
    const recoTitle = notif.payload?.reco_title

    if (subtype === 'no_go') {
      body = `marked your reco${recoTitle ? ` "${recoTitle}"` : ''} as a 🚫 no go.`
      if (notif.payload?.feedback_text) {
        scoreLozenge = { score: -1, title: undefined, feedbackText: notif.payload.feedback_text, category }
      }
    } else if (subtype === 'been_there') {
      body = `has already 🔄 been there, done that with${recoTitle ? ` "${recoTitle}"` : ' your reco'}.`
    } else {
      body = `reviewed your ${categoryLabel}reco`
      if (score != null) {
        scoreLozenge = {
          score,
          title: recoTitle,
          feedbackText: notif.payload?.feedback_text,
          category,
        }
      }
    }
  }

  const isFeedback = notif.type === 'feedback_received'

  async function handleReply() {
    if (!replyText.trim() || !userId || !notif.reco_id) return
    setReplySending(true)
    await sendMessage({
      recoId: notif.reco_id,
      senderId: userId,
      recipientId: notif.actor_id,
      body: replyText.trim(),
    })
    setReplySent(true)
    setReplySending(false)
    setReplyText('')
  }

  // Determine where this notification should link to
  let href: string | null = null
  if (notif.type === 'reco_received') href = notif.reco_id ? `/home?reco=${notif.reco_id}` : '/home'
  else if (notif.type === 'friend_accepted') href = `/friends/${notif.actor_id}`
  else if (notif.type === 'sin_bin' && !isPlea && !isReleased) href = '/sinbin'
  else if (isReleased) href = '/home'

  // Feedback notifications expand inline instead of linking
  const isExpandable = isFeedback

  const Wrapper = href && !isExpandable
    ? ({ children, className }: { children: React.ReactNode; className: string }) => <Link href={href!} className={className}>{children}</Link>
    : ({ children, className }: { children: React.ReactNode; className: string }) => <div className={className} onClick={isExpandable ? () => setExpanded(!expanded) : undefined}>{children}</div>

  return (
    <Wrapper className={`block px-6 py-4 border-b border-[#0e0e10] ${!notif.read ? 'bg-bg-card/40' : ''}`}>
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
            {scoreLozenge != null && scoreLozenge.score >= 0 && (() => {
              const c = getScoreColor(scoreLozenge.score)
              return (
                <span
                  className="inline-flex items-center ml-1.5 px-2 py-0.5 rounded-chip text-[11px] font-bold"
                  style={{ color: c, background: `${c}22`, border: `1px solid ${c}44` }}
                >
                  {scoreLozenge.score}/10
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
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[11px] text-text-faint">{time}</span>
            {(href || isExpandable) && (
              <svg
                width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                className="flex-shrink-0 transition-transform"
                style={isExpandable && expanded ? { transform: 'rotate(90deg)' } : undefined}
              >
                <path d="M9 18l6-6-6-6"/>
              </svg>
            )}
          </div>

          {/* ── Expanded feedback detail ── */}
          {isFeedback && expanded && (() => {
            const score = notif.payload?.score
            const subtype = notif.payload?.subtype
            const recoTitle = notif.payload?.reco_title
            const feedbackText = notif.payload?.feedback_text
            const category = notif.payload?.reco_category
            const firstName = actor.display_name.split(' ')[0]
            const scoreColor = score != null && score >= 0 ? getScoreColor(score) : '#666'

            return (
              <div className="mt-3 rounded-xl border border-border bg-bg-base overflow-hidden" onClick={(e) => e.stopPropagation()}>
                {/* Header: title + category */}
                <div className="px-3.5 pt-3 pb-2">
                  {recoTitle && <div className="text-[15px] font-semibold text-white tracking-[-0.3px]">{recoTitle}</div>}
                  {category && <div className="text-[11px] text-text-faint uppercase tracking-[0.5px] mt-0.5">{category}</div>}
                </div>

                {/* Score + reaction */}
                {score != null && score >= 0 && (() => {
                  const reaction = getScoreReaction(score)
                  return (
                    <div className="px-3.5 py-3 border-t border-[#0e0e10]">
                      <div className="flex items-center gap-3">
                        <div
                          className="text-[28px] font-black tabular-nums"
                          style={{ color: scoreColor }}
                        >
                          {score}/10
                        </div>
                        <div>
                          <div className="text-[13px] font-semibold text-white">{reaction.text}</div>
                          <div className="text-[11px] text-text-faint">{reaction.sub}</div>
                        </div>
                      </div>
                    </div>
                  )
                })()}

                {/* No-go reason */}
                {subtype === 'no_go' && (
                  <div className="px-3.5 py-3 border-t border-[#0e0e10]">
                    <div className="text-[13px] font-semibold text-bad mb-1">Not happening.</div>
                    <div className="text-[11px] text-text-faint">{firstName} is not doing this one.</div>
                  </div>
                )}

                {/* Been there */}
                {subtype === 'been_there' && (
                  <div className="px-3.5 py-3 border-t border-[#0e0e10]">
                    <div className="text-[13px] font-semibold text-white mb-1">Already done it.</div>
                    <div className="text-[11px] text-text-faint">{firstName} beat you to the punch.</div>
                  </div>
                )}

                {/* Their review */}
                {feedbackText && (
                  <div className="px-3.5 py-3 border-t border-[#0e0e10]">
                    <div className="text-[10px] font-semibold text-text-faint uppercase tracking-[0.5px] mb-1.5">{firstName}'s take</div>
                    <div className="text-[13px] text-text-secondary leading-[1.6]">"{feedbackText}"</div>
                  </div>
                )}

                {/* Reply / conversation starter */}
                {notif.reco_id && userId && (
                  <div className="px-3.5 py-3 border-t border-[#0e0e10]">
                    {replySent ? (
                      <div className="text-[12px] text-accent font-medium">Message sent. The conversation has begun.</div>
                    ) : (
                      <>
                        <div className="text-[10px] font-semibold text-text-faint uppercase tracking-[0.5px] mb-2">
                          {score != null && score >= 7 ? 'Celebrate with them' : score != null && score <= 3 ? 'Defend yourself' : 'Say something'}
                        </div>
                        <div className="flex gap-2">
                          <input
                            ref={replyRef}
                            className="flex-1 bg-bg-card border border-border rounded-input px-3 py-2 text-[13px] text-white outline-none placeholder:text-[#333] font-sans"
                            placeholder={score != null && score >= 7 ? 'Told you so...' : score != null && score <= 3 ? 'In my defence...' : 'Reply...'}
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleReply()}
                          />
                          <button
                            onClick={handleReply}
                            disabled={!replyText.trim() || replySending}
                            className={`px-3 py-2 rounded-input text-[12px] font-semibold transition-all ${replyText.trim() ? 'bg-accent text-accent-fg' : 'bg-border text-text-faint'}`}
                          >
                            {replySending ? '...' : 'Send'}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Send another CTA for no-go */}
                {subtype === 'no_go' && (
                  <Link
                    href={`/send?to=${notif.actor_id}`}
                    className="block px-3.5 py-2.5 border-t border-[#0e0e10] text-[12px] font-semibold text-accent text-center hover:bg-accent/5 transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Send them something else
                  </Link>
                )}
              </div>
            )
          })()}

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
                const firstName = actor.display_name.split(' ')[0]
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
                href={`/send?to=${notif.actor_id}`}
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
