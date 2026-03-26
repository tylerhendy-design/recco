'use client'

import { useState } from 'react'
import { StatusBar } from '@/components/ui/StatusBar'
import { Avatar } from '@/components/ui/Avatar'
import { SentimentPill } from '@/components/ui/SentimentBadge'
import Link from 'next/link'

const THREAD = {
  friendName: 'Sam',
  recoTitle: 'The Boys',
  score: 88,
  messages: [
    {
      id: 'm1',
      fromMe: false,
      body: 'Loved The Boys. Season 2 is even better. Thanks for putting me on to it.',
      time: '2 hrs ago',
    },
    {
      id: 'm2',
      fromMe: true,
      body: 'Season 3 drops you. Just saying.',
      time: '1 hr ago',
    },
  ],
}

export default function NotifThreadPage() {
  const [reply, setReply] = useState('')

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <StatusBar />

      {/* Header */}
      <div className="flex justify-between items-center px-6 py-3.5 pb-2.5 flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <Link href="/notifications" className="text-xl text-text-faint cursor-pointer leading-none">‹</Link>
          <Avatar name="Sam Huckle" size="sm" color="#5BC4F5" bgColor="#1a2030" />
          <span className="text-[16px] font-semibold text-white tracking-[-0.4px]">
            {THREAD.friendName} · {THREAD.recoTitle}
          </span>
        </div>
        <SentimentPill score={THREAD.score} />
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto scrollbar-none px-6 py-4 flex flex-col gap-3.5">
        {THREAD.messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col max-w-[75%] ${msg.fromMe ? 'self-end items-end' : 'self-start items-start'}`}
          >
            <div
              className={`rounded-2xl px-3.5 py-3 ${
                msg.fromMe
                  ? 'bg-[#1e1c04] border border-accent rounded-br-sm'
                  : 'bg-bg-card rounded-bl-sm'
              }`}
            >
              <div className={`text-[13px] leading-[1.5] ${msg.fromMe ? 'text-accent' : 'text-text-secondary'}`}>
                {msg.body}
              </div>
            </div>
            <div className={`text-[10px] text-text-faint mt-1 px-1 ${msg.fromMe ? 'text-right' : ''}`}>
              {msg.fromMe ? `You · ${msg.time}` : `${THREAD.friendName} · ${msg.time}`}
            </div>
          </div>
        ))}
      </div>

      {/* Reply bar */}
      <div className="px-4 py-3 border-t border-bg-card flex gap-2 items-center flex-shrink-0">
        <button className="w-[34px] h-[34px] rounded-full border border-border flex items-center justify-center flex-shrink-0">
          <svg width="13" height="17" viewBox="0 0 14 18" fill="none" stroke="#777" strokeWidth="1.5" strokeLinecap="round">
            <rect x="4" y="1" width="6" height="10" rx="3"/><path d="M1 10c0 3.31 2.69 6 6 6s6-2.69 6-6"/><line x1="7" y1="16" x2="7" y2="18"/>
          </svg>
        </button>
        <input
          className="flex-1 bg-bg-card border border-border rounded-input px-3 py-2 text-[13px] text-text-secondary outline-none placeholder:text-border font-sans"
          placeholder="Agree, disagree, continue..."
          value={reply}
          onChange={(e) => setReply(e.target.value)}
        />
        <button className="w-[34px] h-[34px] rounded-full bg-accent flex items-center justify-center flex-shrink-0">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1a1c00" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
          </svg>
        </button>
      </div>
    </div>
  )
}
