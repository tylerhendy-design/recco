'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import Link from 'next/link'
import { useParams, useSearchParams } from 'next/navigation'
import { StatusBar } from '@/components/ui/StatusBar'
import { createClient } from '@/lib/supabase/client'
import { fetchMessages, sendMessage, type MessageRow } from '@/lib/data/messages'
import { initials, getScoreColor } from '@/lib/utils'

export default function ThreadPage() {
  return <Suspense><ThreadPageInner /></Suspense>
}

function getScoreReaction(score: number, title: string): string {
  if (score >= 9) return `They absolutely loved ${title}.`
  if (score >= 7) return `${title} was a solid reco.`
  if (score >= 5) return `${title} was just okay.`
  if (score >= 3) return `${title} was not good enough. A stinker.`
  return `${title} was a disaster. A proper stinker.`
}

function ThreadPageInner() {
  const params = useParams()
  const searchParams = useSearchParams()
  const recoId = params.thread_id as string
  const withUserId = searchParams.get('with')

  const [userId, setUserId] = useState<string | null>(null)
  const [messages, setMessages] = useState<MessageRow[]>([])
  const [loading, setLoading] = useState(true)
  const [replyText, setReplyText] = useState('')
  const [sending, setSending] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Reco + friend context from the notification payload
  const [recoTitle, setRecoTitle] = useState('')
  const [recoCategory, setRecoCategory] = useState('')
  const [friendName, setFriendName] = useState('')
  const [friendAvatar, setFriendAvatar] = useState<string | null>(null)
  const [friendInitials, setFriendInitials] = useState('')
  const [score, setScore] = useState<number | null>(null)
  const [feedbackText, setFeedbackText] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      setUserId(user.id)

      // Fetch reco details
      const { data: reco } = await supabase
        .from('recommendations')
        .select('title, category')
        .eq('id', recoId)
        .single()
      if (reco) {
        setRecoTitle(reco.title)
        setRecoCategory(reco.category)
      }

      // Fetch friend profile
      if (withUserId) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('display_name, avatar_url')
          .eq('id', withUserId)
          .single()
        if (profile) {
          setFriendName(profile.display_name)
          setFriendAvatar(profile.avatar_url)
          const parts = profile.display_name.split(' ')
          setFriendInitials((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? ''))
        }
      }

      // Fetch feedback (score + text) from reco_recipients
      if (withUserId) {
        const { data: feedback } = await supabase
          .from('reco_recipients')
          .select('score, feedback_text')
          .eq('reco_id', recoId)
          .eq('recipient_id', withUserId)
          .single()
        if (feedback) {
          if (feedback.score != null) setScore(feedback.score)
          if (feedback.feedback_text) setFeedbackText(feedback.feedback_text)
        }
      }

      // Fetch existing messages
      const msgs = await fetchMessages(recoId, user.id)
      setMessages(msgs)
      setLoading(false)

      // Scroll to bottom
      requestAnimationFrame(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight })
      })
    })
  }, [recoId, withUserId])

  async function handleSend() {
    if (!replyText.trim() || !userId || !withUserId) return
    setSending(true)
    await sendMessage({
      recoId,
      senderId: userId,
      recipientId: withUserId,
      body: replyText.trim(),
      recoTitle,
    })
    // Optimistically add to messages
    setMessages(prev => [...prev, {
      id: crypto.randomUUID(),
      reco_id: recoId,
      sender_id: userId,
      recipient_id: withUserId,
      body: replyText.trim(),
      audio_url: null,
      created_at: new Date().toISOString(),
      sender: { display_name: 'You', avatar_url: null },
    }])
    setReplyText('')
    setSending(false)
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
    })
  }

  const firstName = friendName.split(' ')[0]
  const scoreColor = score != null ? getScoreColor(score) : null

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <StatusBar />

      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-[#0e0e10] flex-shrink-0">
        <Link href="/notifications" className="flex items-center justify-center w-11 h-11 -ml-2 flex-shrink-0">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
        </Link>
        <div className="w-9 h-9 rounded-full bg-bg-card border border-border flex items-center justify-center text-[10px] font-bold text-text-secondary overflow-hidden flex-shrink-0">
          {friendAvatar
            ? <img src={friendAvatar} alt={friendName} className="w-full h-full object-cover" />
            : friendInitials
          }
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[15px] font-semibold text-white tracking-[-0.3px] truncate">{firstName}</div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-[12px] text-text-faint truncate">{recoTitle}</span>
            {score != null && (
              <span
                className="text-[11px] font-bold px-2.5 py-1 rounded-full flex-shrink-0"
                style={{ color: scoreColor!, background: `${scoreColor}22`, border: `1px solid ${scoreColor}44` }}
              >
                {score}/10
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Messages area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-none px-4 py-4 flex flex-col gap-3">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-4 h-4 border-2 border-border border-t-accent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Feedback context as first "message" */}
            {(feedbackText || score != null) && (
              <div className="self-start max-w-[85%]">
                <div className="bg-white rounded-2xl px-4 py-3.5">
                  {score != null && (
                    <div className="mb-2.5">
                      <div className="text-[16px] font-bold text-[#222] leading-[1.3]">{getScoreReaction(score, recoTitle || 'this reco')}</div>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="text-[22px] font-black tabular-nums" style={{ color: scoreColor! }}>{score}/10</span>
                        <span className="text-[12px] text-[#888]">{recoCategory}</span>
                      </div>
                    </div>
                  )}
                  {feedbackText && (
                    <div className="text-[14px] text-[#333] leading-[1.6]">{feedbackText}</div>
                  )}
                </div>
                <div className="text-[11px] text-text-faint mt-1 pl-1">{firstName}'s review</div>
              </div>
            )}

            {/* Actual messages */}
            {messages.map((msg) => {
              const isMe = msg.sender_id === userId
              return (
                <div key={msg.id} className={`flex flex-col max-w-[75%] ${isMe ? 'self-end items-end' : 'self-start items-start'}`}>
                  <div
                    className={`rounded-2xl px-3.5 py-3 ${
                      isMe
                        ? 'bg-accent'
                        : 'bg-white'
                    }`}
                  >
                    <div className={`text-[14px] leading-[1.5] ${isMe ? 'text-[#1a1c00]' : 'text-[#222]'}`}>
                      {msg.body}
                    </div>
                  </div>
                  <div className={`text-[11px] text-text-faint mt-1 px-1 ${isMe ? 'text-right' : ''}`}>
                    {isMe ? 'You' : firstName} {msg.created_at ? `\u00b7 ${formatTime(msg.created_at)}` : ''}
                  </div>
                </div>
              )
            })}

            {/* Empty state — no messages yet */}
            {messages.length === 0 && !feedbackText && score == null && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="text-[14px] text-text-faint">Start the conversation about {recoTitle || 'this reco'}.</div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Reply bar */}
      <div className="px-4 py-3 border-t border-[#0e0e10] flex gap-2 items-center flex-shrink-0">
        <input
          className="flex-1 bg-bg-card border border-border rounded-input px-3 py-2.5 text-[14px] text-white outline-none placeholder:text-[#444] font-sans"
          placeholder={score != null && score >= 7 ? 'Told you so...' : score != null && score <= 3 ? 'In my defence...' : 'Say something...'}
          value={replyText}
          onChange={(e) => setReplyText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
        />
        <button
          onClick={handleSend}
          disabled={!replyText.trim() || sending}
          className={`w-[38px] h-[38px] rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
            replyText.trim() ? 'bg-accent' : 'bg-border'
          }`}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={replyText.trim() ? '#1a1c00' : '#555'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </div>
    </div>
  )
}

function formatTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}
