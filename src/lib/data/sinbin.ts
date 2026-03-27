import { createClient } from '@/lib/supabase/client'
import { SCORE } from '@/constants/tiers'

export type SinBinEntry = {
  id: string
  sender_id: string
  recipient_id: string
  category: string
  bad_count: number
  is_active: boolean
  triggered_at: string | null
}

// Categories where currentUser (as reco sender) is blocked by a friend (as reco recipient)
export async function fetchBlockedCategories(currentUserId: string, friendId: string): Promise<string[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from('sin_bin')
    .select('category')
    .eq('sender_id', currentUserId)
    .eq('recipient_id', friendId)
    .eq('is_active', true)
  return (data ?? []).map((r: any) => r.category)
}

// Sin bin entries where *I* (currentUserId) am blocked by a friend (friendId sin-binned me)
export async function fetchSinBinnedByFriend(currentUserId: string, friendId: string): Promise<SinBinEntry[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from('sin_bin')
    .select('*')
    .eq('sender_id', currentUserId)
    .eq('recipient_id', friendId)
    .eq('is_active', true)
  return (data ?? []) as SinBinEntry[]
}

// Titles of bad recos I sent to a friend in a given category (the "offences")
export async function fetchSinBinOffences(senderId: string, recipientId: string, category: string): Promise<string[]> {
  const supabase = createClient()

  const { data: recos } = await supabase
    .from('recommendations')
    .select('id, title')
    .eq('sender_id', senderId)
    .eq('category', category)

  if (!recos?.length) return []

  const { data: rated } = await supabase
    .from('reco_recipients')
    .select('reco_id')
    .eq('recipient_id', recipientId)
    .lte('score', SCORE.BAD_MAX)
    .in('reco_id', recos.map((r) => r.id))

  return (rated ?? [])
    .map((r) => recos.find((rec) => rec.id === r.reco_id)?.title)
    .filter(Boolean) as string[]
}

// Release a sender from a recipient's sin bin for a given category
export async function releaseSinBin(senderId: string, recipientId: string, category: string): Promise<void> {
  const supabase = createClient()
  await supabase
    .from('sin_bin')
    .update({ is_active: false, released_at: new Date().toISOString() })
    .eq('sender_id', senderId)
    .eq('recipient_id', recipientId)
    .eq('category', category)
}
