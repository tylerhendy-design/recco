import { createClient } from '@supabase/supabase-js'
import { createClient as createAuthClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function PublicProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, display_name, username, avatar_url')
    .eq('username', username)
    .single()

  if (!profile) {
    return (
      <div className="min-h-dvh bg-[#0a0a0c] flex flex-col items-center justify-center px-6 text-center">
        <div className="text-[20px] font-bold text-white mb-2">User not found</div>
        <div className="text-[14px] text-[#888] mb-6">@{username} doesn't exist on RECO.</div>
        <Link href="/login" className="bg-[#D4E23A] text-[#111] px-8 py-3.5 rounded-full text-[15px] font-bold">
          Get RECO
        </Link>
      </div>
    )
  }

  // If logged in, redirect to the in-app friend profile
  try {
    const authClient = await createAuthClient()
    const { data: { user } } = await authClient.auth.getUser()
    if (user) {
      redirect(`/friends/${profile.id}`)
    }
  } catch (e) {
    if (e && typeof e === 'object' && 'digest' in e) throw e
  }

  // Fetch their TOP 03 picks
  const { data: picks } = await supabase
    .from('profile_picks')
    .select('id, category, title, why, location, links, image_url, created_at')
    .eq('user_id', profile.id)
    .order('created_at', { ascending: true })
    .limit(9)

  const initials = profile.display_name
    .split(' ')
    .map((w: string) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <div className="min-h-dvh bg-[#0a0a0c] flex flex-col">
      <div className="pt-14 pb-6 px-6 text-center">
        <div className="w-20 h-20 rounded-full bg-[#111114] border border-[#1a1a1e] flex items-center justify-center mx-auto mb-4 text-[24px] font-bold text-[#888] overflow-hidden">
          {profile.avatar_url
            ? <img src={profile.avatar_url} alt={profile.display_name} className="w-full h-full object-cover" />
            : initials
          }
        </div>
        <div className="text-[24px] font-bold text-white tracking-[-0.5px]">{profile.display_name}</div>
        <div className="text-[14px] text-[#888] mt-0.5">@{profile.username}</div>
      </div>

      {picks && picks.length > 0 && (
        <div className="px-6 pb-8">
          <div className="text-[11px] font-bold uppercase tracking-[0.5px] text-[#D4E23A] mb-3">TOP picks</div>
          <div className="flex flex-col gap-2.5">
            {picks.map((pick: any) => (
              <div key={pick.id} className="bg-[#111114] border border-[#1a1a1e] rounded-2xl overflow-hidden">
                {pick.image_url && (
                  <img src={pick.image_url} alt={pick.title} className="w-full h-32 object-cover" />
                )}
                <div className="p-4">
                  <div className="text-[15px] font-semibold text-white">{pick.title}</div>
                  {pick.location && <div className="text-[12px] text-[#888] mt-0.5">{pick.location}</div>}
                  {pick.why && <div className="text-[13px] text-[#aaa] mt-1.5 leading-[1.5]">{pick.why}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex-1" />
      <div className="px-6 pb-10">
        <Link
          href="/login"
          className="block w-full bg-[#D4E23A] text-[#111] py-4 rounded-full text-[15px] font-bold text-center"
        >
          Join RECO to send {profile.display_name.split(' ')[0]} a reco
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
