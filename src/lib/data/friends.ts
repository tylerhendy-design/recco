import { createClient } from '@/lib/supabase/client'

// ── Search profiles by username ───────────────────────────────────────────────
export async function searchProfiles(query: string, currentUserId: string) {
  const supabase = createClient()
  const { data } = await supabase
    .from('profiles')
    .select('id, display_name, username, avatar_url')
    .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
    .neq('id', currentUserId)
    .limit(10)
  return data ?? []
}

// ── Get connection status between two users ───────────────────────────────────
export async function getConnectionStatus(userId: string, otherId: string) {
  const supabase = createClient()
  const { data } = await supabase
    .from('friend_connections')
    .select('id, status, requester_id, addressee_id')
    .or(
      `and(requester_id.eq.${userId},addressee_id.eq.${otherId}),` +
      `and(requester_id.eq.${otherId},addressee_id.eq.${userId})`
    )
    .maybeSingle()
  return data
}

// ── Send a friend request ─────────────────────────────────────────────────────
export async function sendFriendRequest(requesterId: string, addresseeId: string) {
  const supabase = createClient()

  const { data: conn, error } = await supabase
    .from('friend_connections')
    .insert({ requester_id: requesterId, addressee_id: addresseeId, status: 'pending' })
    .select('id')
    .single()

  if (error) return { error: error.message }

  // Notify the addressee, storing the connection_id so they can accept/decline from the notification
  await supabase.from('notifications').insert({
    user_id: addresseeId,
    type: 'friend_request',
    actor_id: requesterId,
    payload: { connection_id: conn.id },
  })

  return { error: null }
}

// ── Accept a friend request ───────────────────────────────────────────────────
export async function acceptFriendRequest(connectionId: string, requesterId: string, addresseeId: string) {
  const supabase = createClient()

  const { error } = await supabase
    .from('friend_connections')
    .update({ status: 'accepted' })
    .eq('id', connectionId)

  if (error) return { error: error.message }

  // Notify the original requester that their request was accepted
  await supabase.from('notifications').insert({
    user_id: requesterId,
    type: 'friend_accepted',
    actor_id: addresseeId,
    payload: {},
  })

  return { error: null }
}

// ── Decline / cancel a friend request ────────────────────────────────────────
export async function declineFriendRequest(connectionId: string) {
  const supabase = createClient()
  const { error } = await supabase
    .from('friend_connections')
    .delete()
    .eq('id', connectionId)
  return { error: error?.message ?? null }
}

// ── Fetch accepted friends for a user ────────────────────────────────────────
export async function fetchFriends(userId: string) {
  const supabase = createClient()
  const { data } = await supabase
    .from('friend_connections')
    .select(`
      id, tier,
      requester:profiles!friend_connections_requester_id_fkey(id, display_name, username, avatar_url),
      addressee:profiles!friend_connections_addressee_id_fkey(id, display_name, username, avatar_url)
    `)
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
    .eq('status', 'accepted')
  return (data ?? []).map((row: any) => {
    const friend = row.requester?.id === userId ? row.addressee : row.requester
    return { ...friend, tier: row.tier as string, connection_id: row.id }
  }).filter(Boolean)
}

// ── Fetch a friend's profile + stats ─────────────────────────────────────────
export async function fetchFriendProfile(friendId: string) {
  const supabase = createClient()
  const [
    { data: prof },
    { data: sentRecos },
    { count: friendsCount },
    { count: recosCompleted },
  ] = await Promise.all([
    supabase.from('profiles').select('display_name, username, avatar_url, joined_at').eq('id', friendId).single(),
    supabase.from('recommendations').select('id').eq('sender_id', friendId),
    supabase.from('friend_connections').select('*', { count: 'exact', head: true })
      .or(`requester_id.eq.${friendId},addressee_id.eq.${friendId}`)
      .eq('status', 'accepted'),
    supabase.from('reco_recipients').select('*', { count: 'exact', head: true })
      .eq('recipient_id', friendId)
      .eq('status', 'done'),
  ])

  const sentIds = sentRecos?.map((r) => r.id) ?? []
  let stinkersSent = 0
  if (sentIds.length > 0) {
    const { count } = await supabase
      .from('reco_recipients')
      .select('*', { count: 'exact', head: true })
      .in('reco_id', sentIds)
      .eq('status', 'done')
      .lt('score', 40)
    stinkersSent = count ?? 0
  }

  let memberNumber = 1
  if (prof?.joined_at) {
    const { count } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .lte('joined_at', prof.joined_at)
    memberNumber = count ?? 1
  }

  return {
    profile: prof as { display_name: string; username: string; avatar_url: string | null; joined_at: string } | null,
    memberNumber,
    stats: {
      recos_sent: sentIds.length,
      friends_count: friendsCount ?? 0,
      recos_completed: recosCompleted ?? 0,
      stinkers_sent: stinkersSent,
    },
  }
}

// ── Remove a friend ───────────────────────────────────────────────────────────
export async function removeFriend(currentUserId: string, friendId: string) {
  const supabase = createClient()
  const { error } = await supabase
    .from('friend_connections')
    .delete()
    .or(
      `and(requester_id.eq.${currentUserId},addressee_id.eq.${friendId}),` +
      `and(requester_id.eq.${friendId},addressee_id.eq.${currentUserId})`
    )
  return { error: error?.message ?? null }
}

// ── Fetch incoming pending requests ──────────────────────────────────────────
export async function fetchIncomingRequests(userId: string) {
  const supabase = createClient()
  const { data } = await supabase
    .from('friend_connections')
    .select(`
      id,
      requester:profiles!friend_connections_requester_id_fkey(id, display_name, username, avatar_url)
    `)
    .eq('addressee_id', userId)
    .eq('status', 'pending')
  return (data ?? []).map((row: any) => ({ ...row.requester, connection_id: row.id })).filter(Boolean)
}
