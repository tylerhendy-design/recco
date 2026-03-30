import { createClient } from '@/lib/supabase/client'

export type NotificationRow = {
  id: string
  type: 'friend_request' | 'friend_accepted' | 'reco_received' | 'feedback_received' | 'request_received' | 'sin_bin'
  actor_id: string
  reco_id: string | null
  payload: Record<string, any>
  read: boolean
  created_at: string
  actor: {
    display_name: string
    username: string
    avatar_url: string | null
  }
}

export async function fetchNotifications(userId: string): Promise<NotificationRow[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from('notifications')
    .select(`
      id, type, actor_id, reco_id, payload, read, created_at,
      actor:profiles!notifications_actor_id_fkey(display_name, username, avatar_url)
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50)
  return (data ?? []) as NotificationRow[]
}

export async function markAllRead(userId: string) {
  const supabase = createClient()
  await supabase
    .from('notifications')
    .update({ read: true })
    .eq('user_id', userId)
    .eq('read', false)
}

export async function markNotificationHandled(
  notifId: string,
  currentPayload: Record<string, any>,
  outcome: 'released' | 'kept' | 'completed',
) {
  const supabase = createClient()
  await supabase
    .from('notifications')
    .update({ payload: { ...currentPayload, handled: outcome } })
    .eq('id', notifId)
}
