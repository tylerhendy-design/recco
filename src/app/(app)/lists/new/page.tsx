'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { StatusBar } from '@/components/ui/StatusBar'
import { NavHeader } from '@/components/ui/NavHeader'

export default function NewListPage() {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')

  function handleCreate() {
    if (!title.trim()) return
    // Phase 2: persist to Supabase, then redirect to the new list's detail page.
    // For now, redirect back to lists.
    router.push('/lists')
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <StatusBar />
      <NavHeader title="new list" closeHref="/lists" />
      <div className="flex-1 overflow-y-auto scrollbar-none px-6 flex flex-col gap-5 pb-4 pt-2">
        <div>
          <div className="text-[11px] font-semibold text-text-faint tracking-[0.6px] uppercase mb-2">Title</div>
          <input
            autoFocus
            className="bg-transparent outline-none text-white font-sans text-[19px] font-normal w-full pb-2 tracking-[-0.3px] placeholder:text-[#222226]"
            style={{ borderBottom: '1px solid #2a2a30' }}
            placeholder="e.g. Paris — a few things"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          />
        </div>
        <div>
          <div className="text-[11px] font-semibold text-text-faint tracking-[0.6px] uppercase mb-2">Description <span className="normal-case font-normal text-text-faint tracking-normal">(optional)</span></div>
          <input
            className="bg-transparent outline-none text-white font-sans text-base font-normal w-full pb-2 placeholder:text-[#222226]"
            style={{ borderBottom: '1px solid #2a2a30' }}
            placeholder="What's this list for?"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <button
          onClick={handleCreate}
          disabled={!title.trim()}
          className="w-full bg-accent text-accent-fg py-[15px] rounded-btn text-sm font-bold mt-auto hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Create list
        </button>
      </div>
    </div>
  )
}
