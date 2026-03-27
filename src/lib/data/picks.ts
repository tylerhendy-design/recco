import { createClient } from '@/lib/supabase/client'

export type Pick = {
  id: string
  category: string
  title: string
  why: string | null
  location: string | null
  links: string[]
  created_at: string
}

export async function fetchUserPicks(userId: string): Promise<Pick[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from('profile_picks')
    .select('id, category, title, why, location, links, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
  return (data ?? []).map((r) => ({ ...r, links: r.links ?? [] }))
}

export async function addPick(
  userId: string,
  category: string,
  title: string,
  why?: string,
  links?: string[],
  location?: string,
) {
  const supabase = createClient()
  const { error } = await supabase
    .from('profile_picks')
    .insert({
      user_id: userId,
      category,
      title: title.trim(),
      why: why?.trim() || null,
      location: location?.trim() || null,
      links: (links ?? []).filter((l) => l.trim()),
    })
  return { error: error?.message ?? null }
}

export async function updatePick(
  pickId: string,
  title: string,
  why?: string,
  links?: string[],
  location?: string,
) {
  const supabase = createClient()
  const { error } = await supabase
    .from('profile_picks')
    .update({
      title: title.trim(),
      why: why?.trim() || null,
      location: location?.trim() || null,
      links: (links ?? []).filter((l) => l.trim()),
    })
    .eq('id', pickId)
  return { error: error?.message ?? null }
}

export async function removePick(pickId: string) {
  const supabase = createClient()
  const { error } = await supabase
    .from('profile_picks')
    .delete()
    .eq('id', pickId)
  return { error: error?.message ?? null }
}
