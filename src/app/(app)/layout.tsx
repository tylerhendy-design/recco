import { TabBar } from '@/components/ui/TabBar'
import { RecosProvider } from '@/lib/context/RecosContext'

// The (app) route group: all authenticated screens live here.
// TabBar is persistent. Each child page fills the scroll area.
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    // On mobile: full-screen. On desktop: centred phone shell.
    <div className="h-dvh bg-[#d8d8d8] flex items-start justify-center md:items-center md:h-screen">
      <div
        className="
          relative flex flex-col
          w-full md:w-[390px]
          h-dvh md:h-[844px]
          bg-bg-base overflow-hidden
          md:rounded-[48px] md:border md:border-[#2a2a2e]
          md:shadow-phone
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
