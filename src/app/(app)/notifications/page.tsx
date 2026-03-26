import { StatusBar } from '@/components/ui/StatusBar'
import { NavHeader } from '@/components/ui/NavHeader'
import { Avatar } from '@/components/ui/Avatar'
import { SentimentPill } from '@/components/ui/SentimentBadge'
import Link from 'next/link'

const NOTIFS = [
  {
    id: 'n1',
    threadId: 'thread-1',
    name: 'Sam Huckle',
    initials: 'SH',
    color: '#5BC4F5',
    bg: '#1a2030',
    time: '2 hours ago',
    body: 'Loved The Boys. Season 2 is even better.',
    score: 88,
    unread: true,
  },
  {
    id: 'n2',
    threadId: null,
    name: 'Tyler Hendy',
    initials: 'TH',
    color: '#2DD4BF',
    bg: '#0e2420',
    time: 'Yesterday',
    body: 'BAO Soho was incredible. The pork chop bao — unreal.',
    score: 95,
    unread: false,
  },
  {
    id: 'n3',
    threadId: null,
    name: 'Alex Horlock',
    initials: 'AH',
    color: '#C084FC',
    bg: '#1e1030',
    time: '3 days ago',
    body: 'Acquired isn\'t really for me. Too long.',
    score: 40,
    unread: false,
  },
]

export default function NotificationsPage() {
  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <StatusBar />
      <NavHeader title="notifications" closeHref="/home" />
      <div className="flex-1 overflow-y-auto scrollbar-none">
        {NOTIFS.map((n) => {
          const inner = (
            <div className="px-6 py-3.5 border-b border-bg-card cursor-pointer hover:bg-bg-hover transition-colors">
              <div className="flex justify-between items-start mb-1.5">
                <div className="flex items-center gap-2">
                  {n.unread && <div className="w-[7px] h-[7px] rounded-full bg-accent flex-shrink-0" />}
                  <Avatar name={n.name} size="sm" color={n.color} bgColor={n.bg} />
                  <div>
                    <div className="text-[13px] font-semibold text-white">{n.name}</div>
                    <div className="text-[10px] text-text-faint">{n.time}</div>
                  </div>
                </div>
              </div>
              <div className="text-[13px] text-text-muted leading-[1.5] ml-[38px]">{n.body}</div>
              <div className="ml-[38px] mt-1.5">
                <SentimentPill score={n.score} />
              </div>
            </div>
          )

          return n.threadId ? (
            <Link key={n.id} href={`/notifications/${n.threadId}`}>
              {inner}
            </Link>
          ) : (
            <div key={n.id}>{inner}</div>
          )
        })}
      </div>
    </div>
  )
}
