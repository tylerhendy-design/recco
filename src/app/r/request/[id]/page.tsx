import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'

const CATEGORY_EMOJI: Record<string, string> = {
  restaurant: '🍽', tv: '📺', podcast: '🎙', music: '🎵',
  book: '📖', film: '🎬', bars: '🍸', clubs: '🪩',
  cocktails: '🍹', culture: '🏛', pubs: '🍺', wine_bars: '🍷',
}

const CATEGORY_LABELS: Record<string, string> = {
  restaurant: 'Restaurant', tv: 'TV Show', podcast: 'Podcast', music: 'Music',
  book: 'Book', film: 'Film', bars: 'Bar', clubs: 'Club',
  cocktails: 'Cocktail Bar', culture: 'Culture', pubs: 'Pub', wine_bars: 'Wine Bar',
}

export default async function PublicRequestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const { data: request } = await supabase
    .from('reco_requests')
    .select('id, requester_id, category, context, created_at')
    .eq('id', id)
    .single()

  if (!request) {
    return (
      <div className="min-h-dvh bg-[#0a0a0c] flex flex-col items-center justify-center px-6 text-center">
        <div className="text-[20px] font-bold text-white mb-2">Request not found</div>
        <div className="text-[14px] text-[#888] mb-6">This link may have expired or been removed.</div>
        <Link href="/login" className="bg-[#D4E23A] text-[#111] px-8 py-3.5 rounded-full text-[15px] font-bold">
          Get RECO
        </Link>
      </div>
    )
  }

  // Fetch the requester's profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, username, avatar_url')
    .eq('id', request.requester_id)
    .single()

  const name = profile?.display_name?.split(' ')[0] ?? 'Someone'
  const payload = typeof request.context === 'string' ? JSON.parse(request.context) : request.context
  const category = request.category
  const catLabel = category ? (CATEGORY_LABELS[category] ?? category) : null
  const catEmoji = category ? (CATEGORY_EMOJI[category] ?? '✨') : '✨'
  const constraints = payload?.constraints as Record<string, string> | undefined
  const details = payload?.details as string | undefined
  const count = payload?.count as number | undefined

  return (
    <div className="min-h-dvh bg-[#0a0a0c] flex flex-col">
      {/* Header */}
      <div className="pt-14 pb-8 px-6 text-center">
        <div className="w-16 h-16 rounded-full bg-[#D4E23A]/15 border border-[#D4E23A]/30 flex items-center justify-center mx-auto mb-5">
          <span className="text-[28px]">{catEmoji}</span>
        </div>
        <div className="text-[26px] font-bold text-white tracking-[-0.6px] leading-[1.15] mb-2">
          {name} wants a {catLabel?.toLowerCase() ?? 'recommendation'}
        </div>
        <div className="text-[15px] text-[#888] leading-[1.6]">
          {count && count > 1 ? `They're looking for ${count} recos.` : `They're looking for a reco.`} Got one?
        </div>
      </div>

      {/* Request details card */}
      {(constraints && Object.keys(constraints).length > 0) || details ? (
        <div className="mx-6 mb-6 bg-[#111114] border border-[#1a1a1e] rounded-2xl p-5">
          {catLabel && (
            <div className="text-[10px] font-bold uppercase tracking-[0.5px] text-[#D4E23A] mb-3">{catLabel}</div>
          )}
          {constraints && Object.keys(constraints).length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {Object.entries(constraints).map(([key, value]) => (
                <span key={key} className="text-[12px] font-medium text-white/80 px-3 py-1.5 bg-white/5 border border-white/10 rounded-full">
                  {key === 'budget' ? '💰' : key === 'location' ? '📍' : key === 'occasion' ? '✨' : key === 'genre' ? '🎭' : key === 'mood' ? '🌙' : key === 'streaming' ? '📺' : key === 'era' ? '⏰' : key === 'topic' ? '💬' : '📌'} {value}
                </span>
              ))}
            </div>
          )}
          {details && (
            <div className="text-[14px] text-[#aaa] leading-[1.6]">"{details}"</div>
          )}
        </div>
      ) : null}

      {/* CTA */}
      <div className="flex-1" />
      <div className="px-6 pb-10">
        <Link
          href="/login"
          className="block w-full bg-[#D4E23A] text-[#111] py-4 rounded-full text-[15px] font-bold text-center"
        >
          Sign up to give {name} a reco
        </Link>
        <div className="text-center mt-4">
          <Link href="/login" className="text-[13px] text-[#888] underline underline-offset-2">
            Already on RECO? Log in
          </Link>
        </div>
        <div className="text-center mt-6 text-[11px] text-[#555]">
          RECO — It's not for everyone.
        </div>
      </div>
    </div>
  )
}
