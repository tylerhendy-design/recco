import { createClient } from '@supabase/supabase-js'
import { createClient as createAuthClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function PublicListPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const { data: list } = await supabase
    .from('lists')
    .select('id, title, description, owner_id, list_items (id, title, category, note, meta, sort_order)')
    .eq('id', id)
    .single()

  if (!list) {
    return (
      <div className="min-h-dvh bg-[#0a0a0c] flex flex-col items-center justify-center px-6 text-center">
        <div className="text-[20px] font-bold text-white mb-2">List not found</div>
        <div className="text-[14px] text-[#888] mb-6">This link may have expired or been removed.</div>
        <Link href="/login" className="bg-[#D4E23A] text-[#111] px-8 py-3.5 rounded-full text-[15px] font-bold">
          Get RECO
        </Link>
      </div>
    )
  }

  // If logged in, redirect to in-app lists page
  try {
    const authClient = await createAuthClient()
    const { data: { user } } = await authClient.auth.getUser()
    if (user) {
      redirect(`/profile/lists`)
    }
  } catch (e) {
    if (e && typeof e === 'object' && 'digest' in e) throw e
  }

  // Get owner name
  const { data: owner } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('id', list.owner_id)
    .single()

  const items = ((list as any).list_items ?? []).sort((a: any, b: any) => a.sort_order - b.sort_order)
  const ownerName = owner?.display_name ?? 'Someone'

  return (
    <div className="min-h-dvh bg-[#0a0a0c] flex flex-col">
      <div className="pt-14 pb-4 px-6">
        <div className="text-[11px] font-bold uppercase tracking-[0.5px] text-[#D4E23A] mb-2">
          {ownerName}'s list
        </div>
        <div className="text-[28px] font-bold text-white tracking-[-0.7px] leading-[1.1] mb-1">
          {list.title}
        </div>
        <div className="text-[14px] text-[#888]">{items.length} places</div>
      </div>

      <div className="px-6 pb-8 flex-1">
        <div className="flex flex-col gap-3">
          {items.map((item: any) => (
            <div key={item.id} className="bg-[#111114] border border-[#1a1a1e] rounded-2xl overflow-hidden">
              {item.meta?.artwork_url && (
                <img src={item.meta.artwork_url} alt={item.title} className="w-full h-32 object-cover" />
              )}
              <div className="p-4">
                <div className="text-[15px] font-semibold text-white">{item.title}</div>
                {item.meta?.city && <div className="text-[12px] text-[#888] mt-0.5">{item.meta.city}</div>}
                {item.meta?.maps_url && (
                  <a href={item.meta.maps_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-[12px] text-[#D4E23A] mt-2">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
                    Open in Maps
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="px-6 pb-10">
        <Link
          href="/login"
          className="block w-full bg-[#D4E23A] text-[#111] py-4 rounded-full text-[15px] font-bold text-center"
        >
          Join RECO to save this list
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
