import { createClient } from '@/lib/supabase/client'

export type MessageRow = {
  id: string
  reco_id: string
  sender_id: string
  recipient_id: string
  body: string | null
  audio_url: string | null
  created_at: string
  sender: {
    display_name: string
    avatar_url: string | null
  }
}

export async function fetchMessages(recoId: string, userId: string): Promise<MessageRow[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from('messages')
    .select(`
      id, reco_id, sender_id, recipient_id, body, audio_url, created_at,
      sender:profiles!messages_sender_id_fkey(display_name, avatar_url)
    `)
    .eq('reco_id', recoId)
    .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
    .order('created_at', { ascending: true })
    .limit(100)
  return (data ?? []) as MessageRow[]
}

export async function sendMessage({
  recoId,
  senderId,
  recipientId,
  body,
  audioUrl,
  recoTitle,
}: {
  recoId: string
  senderId: string
  recipientId: string
  body?: string
  audioUrl?: string
  recoTitle?: string
}): Promise<{ error: string | null }> {
  const supabase = createClient()
  const { error } = await supabase.from('messages').insert({
    reco_id: recoId,
    sender_id: senderId,
    recipient_id: recipientId,
    body: body?.trim() || null,
    audio_url: audioUrl || null,
  })
  if (error) return { error: error.message }

  // Create a notification for the recipient so the message surfaces at the top
  await supabase.from('notifications').insert({
    user_id: recipientId,
    type: 'reco_received' as const,
    actor_id: senderId,
    reco_id: recoId,
    payload: {
      subtype: 'message',
      title: recoTitle || null,
      message_preview: body?.trim()?.slice(0, 100) || 'Voice note',
    },
  })

  return { error: null }
}
