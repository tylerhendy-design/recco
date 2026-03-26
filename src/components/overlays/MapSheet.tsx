'use client'

import { BottomSheet } from '@/components/ui/BottomSheet'

interface MapSheetProps {
  open: boolean
  onClose: () => void
  name: string
  address?: string
  category?: string
}

export function MapSheet({ open, onClose, name, address, category }: MapSheetProps) {
  return (
    <BottomSheet open={open} onClose={onClose}>
      <div className="p-[22px] pt-3 pb-7">
        <div className="text-base font-semibold text-white mb-1">{name}</div>
        <div className="text-xs text-text-faint mb-3.5">{address ?? 'See on map'}</div>

        {/* Map placeholder */}
        <div className="w-full h-40 bg-bg-card rounded-input border border-border mb-3.5 relative overflow-hidden">
          <div
            className="absolute inset-0"
            style={{ background: 'linear-gradient(135deg,#0e1a0e 0%,#161618 50%,#0e1015 100%)' }}
          />
          <div className="relative z-10 flex flex-col items-center justify-center h-full gap-1.5">
            <div className="w-5 h-5 rounded-full bg-[#F56E6E] border-[3px] border-white shadow-[0_0_0_4px_rgba(245,110,110,0.3)]" />
            <div className="text-[11px] text-white font-semibold bg-bg-base px-2 py-[3px] rounded-md">
              {name}
            </div>
          </div>
          <div className="absolute bottom-2 right-2 text-[9px] text-text-faint">Map view</div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-[11px] border border-border rounded-input text-xs font-semibold text-text-dim hover:border-text-faint transition-colors"
          >
            Close
          </button>
          <button className="flex-[2] py-[11px] bg-[#5BC4F5] text-[#061820] rounded-input text-xs font-bold">
            Open in Maps
          </button>
        </div>
      </div>
    </BottomSheet>
  )
}
