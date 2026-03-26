import { TabBar } from '@/components/ui/TabBar'
import { RecosProvider } from '@/lib/context/RecosContext'

// The (app) route group: all authenticated screens live here.
// TabBar is persistent. Each child page fills the scroll area.
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    // On mobile: full-screen. On desktop: centred phone shell.
    <div className="min-h-svh bg-[#d8d8d8] flex items-start justify-center md:items-center md:min-h-screen">
      <div
        className="
          relative flex flex-col
          w-full md:w-[390px]
          min-h-svh md:h-[844px] md:min-h-0
          bg-bg-base
          md:rounded-[48px] md:border md:border-[#2a2a2e]
          md:shadow-phone md:overflow-hidden
          font-sans
        "
      >
        <RecosProvider>
          {children}
          <TabBar />
        </RecosProvider>
      </div>
    </div>
  )
}
