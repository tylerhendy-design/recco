'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { StatusBar } from '@/components/ui/StatusBar'
import { CategoryChips } from '@/components/ui/CategoryChips'
import { FriendPicker } from '@/components/ui/FriendPicker'
import { AutocompleteInput, type Suggestion } from '@/components/ui/AutocompleteInput'
import { createClient } from '@/lib/supabase/client'
import { searchProfiles, sendFriendRequest } from '@/lib/data/friends'
import { sendReco } from '@/lib/data/recos'
import { initials } from '@/lib/utils'
import type { CategoryId } from '@/constants/categories'
import { VENUE_CATEGORIES } from '@/constants/categories'

type Step = 'welcome' | 'friends' | 'give' | 'ask' | 'done'

export default function WelcomePage() {
  const router = useRouter()
  const supabase = createClient()
  const [step, setStep] = useState<Step>('welcome')
  const [userId, setUserId] = useState<string | null>(null)
  const [displayName, setDisplayName] = useState('')

  // Friends step
  const [friendQuery, setFriendQuery] = useState('')
  const [friendResults, setFriendResults] = useState<any[]>([])
  const [friendsAdded, setFriendsAdded] = useState<string[]>([])
  const [searching, setSearching] = useState(false)
  const [inviteCopied, setInviteCopied] = useState(false)

  // Give reco step
  const [giveCategory, setGiveCategory] = useState<CategoryId | null>(null)
  const [giveCustomCat, setGiveCustomCat] = useState('')
  const [giveTitle, setGiveTitle] = useState('')
  const [giveWhy, setGiveWhy] = useState('')
  const [giveTo, setGiveTo] = useState<{ id: string; name: string } | null>(null)
  const [giveMeta, setGiveMeta] = useState<Record<string, unknown>>({})
  const [giveSaving, setGiveSaving] = useState(false)
  const [gaveReco, setGaveReco] = useState(false)

  // Ask reco step
  const [askCategory, setAskCategory] = useState<CategoryId | null>(null)
  const [askCustomCat, setAskCustomCat] = useState('')
  const [askFrom, setAskFrom] = useState<{ id: string; name: string } | null>(null)
  const [askSaving, setAskSaving] = useState(false)
  const [askedReco, setAskedReco] = useState(false)

  // Friends list for pickers
  const [friends, setFriends] = useState<{ id: string; display_name: string; username: string; avatar_url: string | null }[]>([])

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/login'); return }
      setUserId(user.id)
      supabase.from('profiles').select('display_name').eq('id', user.id).single().then(({ data }) => {
        if (data?.display_name) setDisplayName(data.display_name.split(' ')[0])
      })
    })
  }, [])

  // Load friends when moving past the friends step
  async function loadFriends() {
    if (!userId) return
    const { data } = await supabase
      .from('friend_connections')
      .select('friend_id, profiles:friend_id (id, display_name, username, avatar_url)')
      .eq('user_id', userId)
    setFriends((data ?? []).map((r: any) => r.profiles).filter(Boolean))
  }

  // Friend search
  const searchFriendsFn = useCallback(async (q: string) => {
    if (q.length < 2 || !userId) { setFriendResults([]); return }
    setSearching(true)
    const results = await searchProfiles(q, userId)
    setFriendResults(results)
    setSearching(false)
  }, [userId])

  useEffect(() => {
    const t = setTimeout(() => searchFriendsFn(friendQuery), 300)
    return () => clearTimeout(t)
  }, [friendQuery, searchFriendsFn])

  async function handleAddFriend(person: any) {
    if (!userId) return
    try {
      await sendFriendRequest(userId, person.id)
      setFriendsAdded(prev => [...prev, person.id])
    } catch {}
  }

  // Give a reco
  async function handleGiveReco() {
    if (!userId || !giveCategory || !giveTitle.trim() || !giveTo) return
    setGiveSaving(true)
    await sendReco({
      senderId: userId,
      recipientIds: [giveTo.id],
      category: giveCategory,
      customCat: giveCategory === 'custom' ? giveCustomCat : undefined,
      title: giveTitle.trim(),
      whyText: giveWhy.trim() || undefined,
      meta: giveMeta,
    })
    setGaveReco(true)
    setGiveSaving(false)
  }

  // Ask for a reco
  async function handleAskReco() {
    if (!userId || !askCategory || !askFrom) return
    setAskSaving(true)
    await (supabase.from('notifications') as any).insert({
      user_id: askFrom.id,
      type: 'request_received',
      actor_id: userId,
      payload: { category: askCategory === 'custom' ? askCustomCat : askCategory, count: 1 },
    })
    setAskedReco(true)
    setAskSaving(false)
  }

  function handleSelectSuggestion(s: Suggestion) {
    setGiveTitle(s.title)
    const meta: Record<string, unknown> = {}
    if (s.imageUrl) meta.artwork_url = s.imageUrl
    if (s.city) meta.location = s.city
    if (s.address) meta.address = s.address
    if (s.website) meta.website = s.website
    if (s.mapsUrl) { if (!meta.links) meta.links = []; (meta.links as string[]).push(s.mapsUrl) }
    setGiveMeta(meta)
  }

  const isVenue = giveCategory !== null && VENUE_CATEGORIES.has(giveCategory)

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <StatusBar />
      <div className="flex-1 overflow-y-auto scrollbar-none">

        {/* ── WELCOME ── */}
        {step === 'welcome' && (
          <div className="flex flex-col items-center justify-center min-h-[80vh] px-8 text-center">
            <div className="text-[28px] font-bold text-white tracking-[-0.7px] leading-[1.15] mb-4">
              {displayName ? `Hey ${displayName}.` : 'Hey.'}
            </div>
            <div className="text-[16px] text-text-muted leading-[1.7] mb-3 max-w-[310px]">
              RECO is a place for all your recommendations, shared with your closest friends.
            </div>
            <div className="text-[14px] text-text-faint leading-[1.7] mb-8 max-w-[310px]">
              No algorithms. No influencers. Just the people who actually know you, recommending the things that might change your trip, your week, or your life.
            </div>
            <button
              onClick={() => setStep('friends')}
              className="w-full bg-accent text-accent-fg py-4 rounded-xl text-[16px] font-bold"
            >
              Get started
            </button>
          </div>
        )}

        {/* ── FIND FRIENDS ── */}
        {step === 'friends' && (
          <div className="px-6 pt-8 pb-6">
            <div className="text-[11px] font-semibold text-accent uppercase tracking-[1px] mb-2">Step 1 of 3</div>
            <div className="text-[24px] font-bold text-white tracking-[-0.5px] leading-[1.15] mb-2">
              Find your people
            </div>
            <div className="text-[15px] text-text-muted leading-[1.6] mb-6">
              A reco means nothing from a stranger. Search for the friends whose taste you trust.
            </div>

            <input
              value={friendQuery}
              onChange={(e) => setFriendQuery(e.target.value)}
              autoFocus
              placeholder="Search by name or username..."
              className="w-full bg-bg-card border border-border rounded-xl px-3.5 py-3 text-[14px] text-white placeholder:text-[#444] outline-none focus:border-accent font-sans mb-4"
            />

            {searching && (
              <div className="flex justify-center py-4">
                <div className="w-4 h-4 border-2 border-border border-t-accent rounded-full animate-spin" />
              </div>
            )}

            {!searching && friendResults.length > 0 && (
              <div className="flex flex-col gap-1 mb-4">
                {friendResults.map((person) => {
                  const added = friendsAdded.includes(person.id)
                  return (
                    <div key={person.id} className="flex items-center justify-between py-3 border-b border-[#1a1a1e]">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-bg-card flex items-center justify-center text-[11px] font-bold text-text-secondary overflow-hidden">
                          {person.avatar_url ? <img src={person.avatar_url} alt="" className="w-full h-full object-cover" /> : initials(person.display_name)}
                        </div>
                        <div>
                          <div className="text-[14px] font-medium text-white">{person.display_name}</div>
                          <div className="text-[11px] text-text-faint">@{person.username}</div>
                        </div>
                      </div>
                      {added ? (
                        <span className="text-[12px] text-accent font-medium">Requested</span>
                      ) : (
                        <button onClick={() => handleAddFriend(person)} className="px-3 py-1.5 border border-accent rounded-full text-[12px] font-semibold text-accent">Add</button>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {!searching && friendQuery.length >= 2 && friendResults.length === 0 && (
              <div className="text-[13px] text-text-faint text-center py-4 mb-4">No one found for "{friendQuery}"</div>
            )}

            <button
              onClick={async () => {
                if (navigator.share) {
                  try { await navigator.share({ title: 'Join me on RECO', text: 'A place for all your recommendations, shared with your closest friends.', url: 'https://givemeareco.com' }); return } catch {}
                }
                await navigator.clipboard.writeText('https://givemeareco.com')
                setInviteCopied(true)
                setTimeout(() => setInviteCopied(false), 2000)
              }}
              className="w-full py-3 border border-dashed border-border rounded-xl text-[13px] font-semibold text-text-secondary mb-6"
            >
              {inviteCopied ? 'Link copied' : 'Invite someone to RECO'}
            </button>

            <div className="flex gap-2">
              <button onClick={() => { loadFriends(); setStep('give') }} className="flex-1 py-3.5 border border-border rounded-xl text-[14px] font-semibold text-text-secondary">Skip</button>
              <button onClick={() => { loadFriends(); setStep('give') }} className="flex-[2] py-3.5 bg-accent text-accent-fg rounded-xl text-[14px] font-bold">
                {friendsAdded.length > 0 ? `Next (${friendsAdded.length} added)` : 'Next'}
              </button>
            </div>
          </div>
        )}

        {/* ── GIVE YOUR FIRST RECO ── */}
        {step === 'give' && !gaveReco && (
          <div className="px-6 pt-8 pb-6">
            <div className="text-[11px] font-semibold text-accent uppercase tracking-[1px] mb-2">Step 2 of 3</div>
            <div className="text-[24px] font-bold text-white tracking-[-0.5px] leading-[1.15] mb-2">
              Give your first reco
            </div>
            <div className="text-[15px] text-text-muted leading-[1.6] mb-6">
              Think of something you love that a friend needs to try. A restaurant, a film, a podcast — send it to them.
            </div>

            <div className="space-y-4">
              {/* Category */}
              <div>
                <div className="text-[11px] font-semibold text-text-faint tracking-[0.5px] uppercase mb-2">What is it?</div>
                <CategoryChips category={giveCategory} customCat={giveCustomCat} onCategoryChange={setGiveCategory} onCustomCatChange={setGiveCustomCat} />
              </div>

              {/* Title */}
              {giveCategory && (
                <div>
                  <AutocompleteInput
                    category={giveCategory}
                    value={giveTitle}
                    onChange={setGiveTitle}
                    onSelect={handleSelectSuggestion}
                    placeholder="Name..."
                    isVenue={isVenue}
                    compact
                  />
                </div>
              )}

              {/* Why (optional) */}
              {giveTitle.trim() && (
                <textarea
                  value={giveWhy}
                  onChange={(e) => { setGiveWhy(e.target.value); const el = e.target; el.style.height = 'auto'; el.style.height = `${el.scrollHeight}px` }}
                  placeholder="Why should they try it? (optional)"
                  rows={2}
                  className="w-full bg-bg-card border border-border rounded-xl px-3.5 py-3 text-[14px] text-text-secondary placeholder:text-[#444] outline-none focus:border-accent font-sans resize-none"
                />
              )}

              {/* Who to send to */}
              {giveTitle.trim() && (
                <div>
                  <div className="text-[11px] font-semibold text-text-faint tracking-[0.5px] uppercase mb-2">Send to</div>
                  {friends.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {friends.map(f => (
                        <button
                          key={f.id}
                          onClick={() => setGiveTo(giveTo?.id === f.id ? null : { id: f.id, name: f.display_name })}
                          className={`px-3 py-2 rounded-full text-[13px] font-semibold border transition-all ${
                            giveTo?.id === f.id ? 'bg-accent text-accent-fg border-accent' : 'bg-bg-card text-text-secondary border-border'
                          }`}
                        >
                          {f.display_name}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="text-[13px] text-text-faint">Add friends first to send them recos. You can skip for now.</div>
                  )}
                </div>
              )}
            </div>

            <div className="flex gap-2 mt-6">
              <button onClick={() => setStep('ask')} className="flex-1 py-3.5 border border-border rounded-xl text-[14px] font-semibold text-text-secondary">Skip</button>
              <button
                onClick={async () => { await handleGiveReco(); setStep('ask') }}
                disabled={!giveCategory || !giveTitle.trim() || !giveTo || giveSaving}
                className={`flex-[2] py-3.5 rounded-xl text-[14px] font-bold ${
                  giveCategory && giveTitle.trim() && giveTo ? 'bg-accent text-accent-fg' : 'bg-accent/30 text-accent-fg/50'
                }`}
              >
                {giveSaving ? 'Sending...' : 'Send reco'}
              </button>
            </div>
          </div>
        )}

        {/* ── ASK FOR A RECO ── */}
        {step === 'ask' && !askedReco && (
          <div className="px-6 pt-8 pb-6">
            <div className="text-[11px] font-semibold text-accent uppercase tracking-[1px] mb-2">Step 3 of 3</div>
            <div className="text-[24px] font-bold text-white tracking-[-0.5px] leading-[1.15] mb-2">
              Ask for a reco
            </div>
            <div className="text-[15px] text-text-muted leading-[1.6] mb-6">
              Now the other side. Pick a friend and ask them to recommend something. They'll get a nudge.
            </div>

            <div className="space-y-4">
              {/* Category */}
              <div>
                <div className="text-[11px] font-semibold text-text-faint tracking-[0.5px] uppercase mb-2">What do you want?</div>
                <CategoryChips category={askCategory} customCat={askCustomCat} onCategoryChange={setAskCategory} onCustomCatChange={setAskCustomCat} />
              </div>

              {/* Who to ask */}
              {askCategory && (
                <div>
                  <div className="text-[11px] font-semibold text-text-faint tracking-[0.5px] uppercase mb-2">Ask who?</div>
                  {friends.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {friends.map(f => (
                        <button
                          key={f.id}
                          onClick={() => setAskFrom(askFrom?.id === f.id ? null : { id: f.id, name: f.display_name })}
                          className={`px-3 py-2 rounded-full text-[13px] font-semibold border transition-all ${
                            askFrom?.id === f.id ? 'bg-accent text-accent-fg border-accent' : 'bg-bg-card text-text-secondary border-border'
                          }`}
                        >
                          {f.display_name}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="text-[13px] text-text-faint">Add friends first to request recos. You can skip for now.</div>
                  )}
                </div>
              )}
            </div>

            <div className="flex gap-2 mt-6">
              <button onClick={() => setStep('done')} className="flex-1 py-3.5 border border-border rounded-xl text-[14px] font-semibold text-text-secondary">Skip</button>
              <button
                onClick={async () => { await handleAskReco(); setStep('done') }}
                disabled={!askCategory || !askFrom || askSaving}
                className={`flex-[2] py-3.5 rounded-xl text-[14px] font-bold ${
                  askCategory && askFrom ? 'bg-accent text-accent-fg' : 'bg-accent/30 text-accent-fg/50'
                }`}
              >
                {askSaving ? 'Asking...' : 'Ask for a reco'}
              </button>
            </div>
          </div>
        )}

        {/* ── DONE ── */}
        {step === 'done' && (
          <div className="flex flex-col items-center justify-center min-h-[80vh] px-8 text-center">
            <div className="w-20 h-20 rounded-full bg-accent/15 border-2 border-accent flex items-center justify-center mb-6">
              <svg width="36" height="36" viewBox="0 0 32 32" fill="none" stroke="#D4E23A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 16l8 8 12-12" />
              </svg>
            </div>
            <div className="text-[28px] font-bold text-white tracking-[-0.7px] leading-[1.15] mb-3">
              You're in.
            </div>
            <div className="text-[15px] text-text-muted leading-[1.6] mb-2 max-w-[280px]">
              {gaveReco && askedReco
                ? `You've sent a reco and asked for one back. That's the loop.`
                : gaveReco
                ? `Your reco is on its way. Now see what your friends think.`
                : askedReco
                ? `You've asked for a reco. Now give one back.`
                : `No algorithms. No influencers. Just taste from people who know you.`
              }
            </div>
            {friendsAdded.length > 0 && (
              <div className="text-[13px] text-accent mb-2">{friendsAdded.length} friend request{friendsAdded.length > 1 ? 's' : ''} sent</div>
            )}
            <Link href="/home" className="w-full bg-accent text-accent-fg py-4 rounded-xl text-[16px] font-bold text-center mt-4">
              Open RECO
            </Link>
          </div>
        )}

      </div>
    </div>
  )
}
