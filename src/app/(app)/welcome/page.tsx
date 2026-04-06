'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { StatusBar } from '@/components/ui/StatusBar'
import { CategoryChips } from '@/components/ui/CategoryChips'
import { AutocompleteInput, type Suggestion } from '@/components/ui/AutocompleteInput'
import { createClient } from '@/lib/supabase/client'
import { searchProfiles, sendFriendRequest } from '@/lib/data/friends'
import { initials } from '@/lib/utils'
import type { CategoryId } from '@/constants/categories'

type Step = 'welcome' | 'friends' | 'first-reco' | 'done'

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

  // First reco step
  const [recoSenderName, setRecoSenderName] = useState('')
  const [recoCategory, setRecoCategory] = useState<CategoryId | null>(null)
  const [recoCustomCat, setRecoCustomCat] = useState('')
  const [recoTitle, setRecoTitle] = useState('')
  const [recoSaving, setRecoSaving] = useState(false)
  const [recoSaved, setRecoSaved] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/login'); return }
      setUserId(user.id)
      supabase.from('profiles').select('display_name').eq('id', user.id).single().then(({ data }) => {
        if (data?.display_name) setDisplayName(data.display_name.split(' ')[0])
      })
    })
  }, [])

  // Friend search
  const searchFriends = useCallback(async (q: string) => {
    if (q.length < 2 || !userId) { setFriendResults([]); return }
    setSearching(true)
    const results = await searchProfiles(q, userId)
    setFriendResults(results)
    setSearching(false)
  }, [userId])

  useEffect(() => {
    const t = setTimeout(() => searchFriends(friendQuery), 300)
    return () => clearTimeout(t)
  }, [friendQuery, searchFriends])

  async function handleAddFriend(person: any) {
    if (!userId) return
    try {
      await sendFriendRequest(userId, person.id)
      setFriendsAdded(prev => [...prev, person.id])
    } catch {}
  }

  async function handleSaveReco() {
    if (!userId || !recoCategory || !recoTitle.trim() || !recoSenderName.trim()) return
    setRecoSaving(true)
    try {
      const recoId = crypto.randomUUID()
      const meta: Record<string, unknown> = { manual_sender_name: recoSenderName.trim() }

      await supabase.from('recommendations').insert({
        id: recoId,
        sender_id: userId,
        category: recoCategory === 'custom' ? 'custom' : recoCategory,
        custom_cat: recoCategory === 'custom' ? recoCustomCat.trim() : null,
        title: recoTitle.trim(),
        meta,
      })

      await supabase.from('reco_recipients').insert({
        reco_id: recoId,
        recipient_id: userId,
        status: 'unseen',
      })

      setRecoSaved(true)
    } catch {}
    setRecoSaving(false)
  }

  function handleSelectSuggestion(s: Suggestion) {
    setRecoTitle(s.title)
  }

  const VENUE_CATS = new Set(['restaurant', 'bars', 'clubs', 'cocktails', 'pubs', 'wine_bars', 'culture'])
  const isVenue = recoCategory !== null && VENUE_CATS.has(recoCategory)

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <StatusBar />
      <div className="flex-1 overflow-y-auto scrollbar-none">

        {/* Step 1: Welcome */}
        {step === 'welcome' && (
          <div className="flex flex-col items-center justify-center min-h-[80vh] px-8 text-center">
            <div className="text-[42px] mb-4">👋</div>
            <div className="text-[28px] font-bold text-white tracking-[-0.7px] leading-[1.15] mb-3">
              Welcome{displayName ? `, ${displayName}` : ''}
            </div>
            <div className="text-[16px] text-text-muted leading-[1.6] mb-8 max-w-[300px]">
              RECO is where your friends' recommendations actually live. Let's get you set up in 2 minutes.
            </div>
            <button
              onClick={() => setStep('friends')}
              className="w-full bg-accent text-accent-fg py-4 rounded-btn text-[16px] font-bold"
            >
              Let's go
            </button>
          </div>
        )}

        {/* Step 2: Add friends */}
        {step === 'friends' && (
          <div className="px-6 pt-8 pb-6">
            <div className="text-[11px] font-semibold text-accent uppercase tracking-[1px] mb-2">Step 1 of 2</div>
            <div className="text-[24px] font-bold text-white tracking-[-0.5px] leading-[1.15] mb-2">
              Find your people
            </div>
            <div className="text-[15px] text-text-muted leading-[1.6] mb-6">
              Recos only matter when they come from someone you trust. Search for friends already on RECO.
            </div>

            <input
              value={friendQuery}
              onChange={(e) => setFriendQuery(e.target.value)}
              autoFocus
              placeholder="Search by name or username..."
              className="w-full bg-bg-card border border-border rounded-input px-3.5 py-3 text-[14px] text-white placeholder:text-[#444] outline-none focus:border-accent font-sans mb-4"
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
                          {person.avatar_url
                            ? <img src={person.avatar_url} alt="" className="w-full h-full object-cover" />
                            : initials(person.display_name)
                          }
                        </div>
                        <div>
                          <div className="text-[14px] font-medium text-white">{person.display_name}</div>
                          <div className="text-[11px] text-text-faint">@{person.username}</div>
                        </div>
                      </div>
                      {added ? (
                        <span className="text-[12px] text-accent font-medium">Requested</span>
                      ) : (
                        <button
                          onClick={() => handleAddFriend(person)}
                          className="px-3 py-1.5 border border-accent rounded-chip text-[12px] font-semibold text-accent"
                        >
                          Add
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {!searching && friendQuery.length >= 2 && friendResults.length === 0 && (
              <div className="text-[13px] text-text-faint text-center py-4 mb-4">
                No one found for "{friendQuery}"
              </div>
            )}

            {/* Invite */}
            <button
              onClick={async () => {
                if (navigator.share) {
                  try { await navigator.share({ title: 'Join me on RECO', text: 'Your friends have recommendations for you.', url: 'https://givemeareco.com' }); return } catch {}
                }
                await navigator.clipboard.writeText('https://givemeareco.com')
                setInviteCopied(true)
                setTimeout(() => setInviteCopied(false), 2000)
              }}
              className="w-full py-3 border border-dashed border-border rounded-btn text-[13px] font-semibold text-text-secondary mb-6"
            >
              {inviteCopied ? 'Link copied' : 'Invite someone to RECO'}
            </button>

            <div className="flex gap-2">
              <button
                onClick={() => setStep('first-reco')}
                className="flex-1 py-3.5 border border-border rounded-btn text-[14px] font-semibold text-text-secondary"
              >
                Skip
              </button>
              <button
                onClick={() => setStep('first-reco')}
                className="flex-[2] py-3.5 bg-accent text-accent-fg rounded-btn text-[14px] font-bold"
              >
                {friendsAdded.length > 0 ? `Next (${friendsAdded.length} added)` : 'Next'}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Quick Add first reco */}
        {step === 'first-reco' && !recoSaved && (
          <div className="px-6 pt-8 pb-6">
            <div className="text-[11px] font-semibold text-accent uppercase tracking-[1px] mb-2">Step 2 of 2</div>
            <div className="text-[24px] font-bold text-white tracking-[-0.5px] leading-[1.15] mb-2">
              Add your first reco
            </div>
            <div className="text-[15px] text-text-muted leading-[1.6] mb-6">
              Think of the last great thing someone told you about. A restaurant, a show, a podcast — anything. Who told you?
            </div>

            <div className="bg-bg-card border border-border rounded-card px-4 py-4">
              <div className="text-[11px] font-semibold text-text-faint tracking-[0.5px] uppercase mb-2">Who gave you this reco?</div>
              <input
                value={recoSenderName}
                onChange={(e) => setRecoSenderName(e.target.value)}
                placeholder="Their name..."
                className="w-full bg-bg-card border border-border rounded-input px-3.5 py-3 text-[14px] text-white placeholder:text-[#444] outline-none focus:border-accent font-sans mb-4"
              />

              {recoSenderName.trim() && (
                <>
                  <div className="text-[11px] font-semibold text-text-faint tracking-[0.5px] uppercase mb-2">What did they recommend?</div>
                  <CategoryChips
                    category={recoCategory}
                    customCat={recoCustomCat}
                    onCategoryChange={setRecoCategory}
                    onCustomCatChange={setRecoCustomCat}
                  />
                </>
              )}

              {recoCategory && (
                <AutocompleteInput
                  category={recoCategory}
                  value={recoTitle}
                  onChange={setRecoTitle}
                  onSelect={handleSelectSuggestion}
                  placeholder="Name..."
                  isVenue={isVenue}
                  compact
                />
              )}
            </div>

            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setStep('done')}
                className="flex-1 py-3.5 border border-border rounded-btn text-[14px] font-semibold text-text-secondary"
              >
                Skip
              </button>
              <button
                onClick={async () => { await handleSaveReco(); setStep('done') }}
                disabled={!recoCategory || !recoTitle.trim() || !recoSenderName.trim() || recoSaving}
                className={`flex-[2] py-3.5 rounded-btn text-[14px] font-bold ${
                  recoCategory && recoTitle.trim() && recoSenderName.trim()
                    ? 'bg-accent text-accent-fg' : 'bg-accent/30 text-accent-fg/50'
                }`}
              >
                {recoSaving ? 'Saving...' : 'Save & finish'}
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Done */}
        {(step === 'done' || recoSaved) && (
          <div className="flex flex-col items-center justify-center min-h-[80vh] px-8 text-center">
            <div className="w-20 h-20 rounded-full bg-accent/15 border-2 border-accent flex items-center justify-center mb-6">
              <svg width="36" height="36" viewBox="0 0 32 32" fill="none" stroke="#D4E23A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 16l8 8 12-12" />
              </svg>
            </div>
            <div className="text-[28px] font-bold text-white tracking-[-0.7px] leading-[1.15] mb-3">
              You're in.
            </div>
            <div className="text-[16px] text-text-muted leading-[1.6] mb-2 max-w-[280px]">
              {recoSaved
                ? `${recoSenderName.trim()}'s reco is in your feed. Now go do it and tell them what you think.`
                : 'Start giving and getting recos from people you trust. No algorithms. Just taste.'}
            </div>
            {friendsAdded.length > 0 && (
              <div className="text-[13px] text-accent mb-4">
                {friendsAdded.length} friend request{friendsAdded.length > 1 ? 's' : ''} sent
              </div>
            )}
            <Link
              href="/home"
              className="w-full bg-accent text-accent-fg py-4 rounded-btn text-[16px] font-bold text-center mt-4"
            >
              Open RECO
            </Link>
          </div>
        )}

      </div>
    </div>
  )
}
