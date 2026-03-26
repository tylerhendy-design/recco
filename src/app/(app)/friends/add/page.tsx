import { StatusBar } from '@/components/ui/StatusBar'
import { NavHeader } from '@/components/ui/NavHeader'
import { Avatar } from '@/components/ui/Avatar'

const SUGGESTED = [
  { id: 's1', name: 'James Doyle', mutual: 2, color: '#2DD4BF', bg: '#0e2420' },
  { id: 's2', name: 'Laura Price', mutual: 3, color: '#C084FC', bg: '#1e1030' },
]

export default function AddFriendsPage() {
  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <StatusBar />
      <NavHeader title="add friends" closeHref="/friends" />
      <div className="flex-1 overflow-y-auto scrollbar-none px-6 flex flex-col gap-4 pb-4">
        {/* Search */}
        <div>
          <div className="text-[11px] font-semibold text-text-faint tracking-[0.6px] uppercase mb-2">Search by name</div>
          <input
            className="bg-transparent outline-none text-white font-sans text-[19px] font-normal w-full pb-2 tracking-[-0.3px] placeholder:text-[#222226]"
            style={{ borderBottom: '1px solid #2a2a30' }}
            placeholder="Who are you looking for?"
          />
        </div>

        {/* Invite */}
        <div className="border-t border-bg-card pt-4">
          <div className="text-[11px] font-semibold text-text-faint tracking-[0.6px] uppercase mb-2">Invite someone</div>
          <div className="text-[13px] text-text-dim leading-[1.6] mb-3">
            Send a link to someone not on Reco yet.
          </div>
          <div className="border border-border rounded-btn p-3 text-center text-[13px] font-semibold text-accent cursor-pointer hover:bg-accent/5 transition-colors">
            Share invite link
          </div>
        </div>

        {/* Suggested */}
        <div className="border-t border-bg-card pt-4">
          <div className="text-[11px] font-semibold text-text-faint tracking-[0.6px] uppercase mb-2">Suggested</div>
          {SUGGESTED.map((person) => (
            <div key={person.id} className="flex justify-between items-center py-3 border-b border-bg-card">
              <div className="flex items-center gap-3">
                <Avatar
                  name={person.name}
                  size="md"
                  color={person.color}
                  bgColor={person.bg}
                />
                <div>
                  <div className="text-[15px] font-medium text-white">{person.name}</div>
                  <div className="text-[11px] text-text-faint mt-0.5">{person.mutual} mutual friends</div>
                </div>
              </div>
              <button className="px-3 py-[7px] border border-accent rounded-chip text-[11px] font-semibold text-accent hover:bg-accent/10 transition-colors">
                Add
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
