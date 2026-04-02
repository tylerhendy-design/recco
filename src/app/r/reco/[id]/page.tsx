import { createClient } from '@supabase/supabase-js'
import { createClient as createAuthClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

const CATEGORY_LABELS: Record<string, string> = {
  restaurant: 'Restaurant', tv: 'TV Show', podcast: 'Podcast', music: 'Music',
  book: 'Book', film: 'Film', bars: 'Bar', clubs: 'Club',
  cocktails: 'Cocktail Bar', culture: 'Culture', pubs: 'Pub', wine_bars: 'Wine Bar',
}

export default async function PublicRecoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const { data: reco } = await supabase
    .from('recommendations')
    .select('id, title, category, custom_cat, why_text, meta, created_at, sender_id, profiles (display_name, username, avatar_url)')
    .eq('id', id)
    .single()

  if (!reco) {
    return (
      <div className="min-h-dvh bg-[#0a0a0c] flex flex-col items-center justify-center px-6 text-center">
        <div className="text-[20px] font-bold text-white mb-2">Reco not found</div>
        <div className="text-[14px] text-[#888] mb-6">This link may have expired or been removed.</div>
        <Link href="/login" className="bg-[#D4E23A] text-[#111] px-8 py-3.5 rounded-full text-[15px] font-bold">
          Get RECO
        </Link>
      </div>
    )
  }

  // If logged in, redirect to home with reco highlighted
  try {
    const authClient = await createAuthClient()
    const { data: { user } } = await authClient.auth.getUser()
    if (user) {
      redirect(`/home?reco=${id}`)
    }
  } catch (e) {
    if (e && typeof e === 'object' && 'digest' in e) throw e
  }

  const meta = (reco.meta ?? {}) as Record<string, any>
  const sender = reco.profiles as any
  const senderName = meta.manual_sender_name || sender?.display_name || 'Someone'
  const catLabel = reco.category === 'custom' && reco.custom_cat
    ? reco.custom_cat.charAt(0).toUpperCase() + reco.custom_cat.slice(1)
    : CATEGORY_LABELS[reco.category] ?? reco.category
  const location = meta.location || meta.city
  const address = meta.address
  const price = meta.price
  const occasion = meta.occasion
  const imageUrl = meta.artwork_url

  const pills = [location, address, price, occasion].filter(Boolean)

  return (
    <div className="min-h-dvh bg-[#0a0a0c] flex flex-col">
      {/* Image */}
      {imageUrl && (
        <div className="w-full h-[240px] overflow-hidden">
          <img src={imageUrl} alt={reco.title} className="w-full h-full object-cover" />
        </div>
      )}

      {/* Content */}
      <div className="px-6 pt-6 pb-4 flex-1">
        {/* Category */}
        <div className="text-[11px] font-bold uppercase tracking-[0.5px] text-[#D4E23A] mb-2">{catLabel}</div>

        {/* Title */}
        <div className="text-[28px] font-bold text-white tracking-[-0.7px] leading-[1.1] mb-2">{reco.title}</div>

        {/* Sender */}
        <div className="text-[14px] text-[#888] mb-4">
          Reco'd by {senderName}
        </div>

        {/* Detail pills */}
        {pills.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {pills.map((pill, i) => (
              <span key={i} className="text-[12px] font-medium text-white/80 px-3 py-1.5 bg-white/5 border border-white/10 rounded-full">
                {pill}
              </span>
            ))}
          </div>
        )}

        {/* Why */}
        {reco.why_text && (
          <div className="mb-4">
            <div className="text-[11px] font-bold uppercase tracking-[0.5px] text-[#666] mb-1.5">Why</div>
            <div className="text-[15px] text-[#ccc] leading-[1.6]">{reco.why_text}</div>
          </div>
        )}

        {/* Maps link */}
        {(location || address) && (
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([reco.title, address, location].filter(Boolean).join(', '))}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-3 bg-white/5 border border-white/10 rounded-xl mb-4"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#D4E23A" strokeWidth="2" strokeLinecap="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
            <span className="text-[13px] font-medium text-[#D4E23A]">Open in Google Maps</span>
          </a>
        )}

        {/* Website */}
        {meta.website && (
          <a
            href={meta.website}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-3 bg-white/5 border border-white/10 rounded-xl mb-4"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#D4E23A" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>
            <span className="text-[13px] font-medium text-[#D4E23A]">Visit website</span>
          </a>
        )}
      </div>

      {/* CTA */}
      <div className="px-6 pb-10">
        <Link
          href="/login"
          className="block w-full bg-[#D4E23A] text-[#111] py-4 rounded-full text-[15px] font-bold text-center"
        >
          Join RECO to save this reco
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
