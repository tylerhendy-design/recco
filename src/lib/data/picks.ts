import { createClient } from '@/lib/supabase/client'

export type Pick = {
  id: string
  category: string
  title: string
  created_at: string
}

export async function fetchUserPicks(userId: string): Promise<Pick[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from('profile_picks')
    .select('id, category, title, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
  return data ?? []
}

export async function addPick(userId: string, category: string, title: string) {
  const supabase = createClient()
  const { error } = await supabase
    .from('profile_picks')
    .insert({ user_id: userId, category, title: title.trim() })
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
