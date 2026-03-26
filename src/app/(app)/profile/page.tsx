import { StatusBar } from '@/components/ui/StatusBar'

const TOP_RESTAURANTS = [
  { name: 'Bistroteque', link: 'bistrotheque.com' },
  { name: 'Pockets', link: '@pockets_uk' },
  { name: 'Facing Heaven', link: 'facing-heaven.com' },
  { name: 'Padella', link: 'padella.co' },
  { name: 'Dilpasand', link: 'dilpasandrestaurant.com' },
]

const TOP_TV = [
  { name: 'Succession', sub: 'HBO' },
  { name: 'The Wire', sub: 'HBO' },
  { name: 'Slow Horses', sub: 'Apple TV+' },
  { name: 'Utopia', sub: 'Channel 4' },
  { name: 'The Rehearsal', sub: 'HBO' },
]

export default function ProfilePage() {
  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <StatusBar />

      {/* Profile header */}
      <div className="px-6 pt-5 pb-4 border-b border-bg-card flex-shrink-0">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-14 h-14 rounded-full bg-[#1e1c04] border-2 border-accent flex items-center justify-center text-[18px] font-bold text-accent flex-shrink-0">
            TH
          </div>
          <div>
            <div className="text-[19px] font-bold text-white tracking-[-0.4px]">Tyler Hendy</div>
            <div className="text-xs text-text-faint mt-0.5">142 friends · joined 2023</div>
          </div>
        </div>

        <div className="flex gap-2.5">
          <StatBox value="247" label="Recos sent" />
          <StatBox value="89%" label="Good rate" accent />
          <StatBox value="142" label="Friends" />
        </div>
      </div>

      {/* Lists */}
      <div className="flex-1 overflow-y-auto scrollbar-none">
        <SectionLabel>Top 5 restaurants — London</SectionLabel>
        {TOP_RESTAURANTS.map((item, i) => (
          <div key={item.name} className="flex justify-between items-center px-6 py-3 border-b border-[#0e0e10] cursor-pointer hover:bg-bg-hover transition-colors">
            <div>
              <div className="text-sm font-medium text-white tracking-[-0.2px]">{item.name}</div>
              <div className="text-[11px] text-accent mt-0.5">{item.link}</div>
            </div>
            <span className="text-[13px] font-bold text-text-faint">{i + 1}</span>
          </div>
        ))}

        <SectionLabel>Top 5 TV series</SectionLabel>
        {TOP_TV.map((item, i) => (
          <div key={item.name} className="flex justify-between items-center px-6 py-3 border-b border-[#0e0e10] cursor-pointer hover:bg-bg-hover transition-colors">
            <div>
              <div className="text-sm font-medium text-white tracking-[-0.2px]">{item.name}</div>
              <div className="text-[11px] text-text-faint mt-0.5">{item.sub}</div>
            </div>
            <span className="text-[13px] font-bold text-text-faint">{i + 1}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function StatBox({ value, label, accent }: { value: string; label: string; accent?: boolean }) {
  return (
    <div className="flex-1 bg-bg-card rounded-input p-2.5 text-center">
      <div className={`text-[20px] font-bold ${accent ? 'text-accent' : 'text-white'}`}>{value}</div>
      <div className="text-[10px] text-text-faint mt-0.5">{label}</div>
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[11px] font-semibold tracking-[0.8px] uppercase text-text-faint px-6 pt-4 pb-2">
      {children}
    </div>
  )
}
