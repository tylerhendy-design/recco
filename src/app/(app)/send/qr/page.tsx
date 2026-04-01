'use client'

import { useEffect, useState } from 'react'
import { StatusBar } from '@/components/ui/StatusBar'
import { NavHeader } from '@/components/ui/NavHeader'
import Link from 'next/link'
import QRCode from 'qrcode'

const RECO_URL = 'https://givemeareco.com/r/baosoho'

export default function QRPage() {
  const [dataUrl, setDataUrl] = useState<string>('')

  useEffect(() => {
    QRCode.toDataURL(RECO_URL, {
      width: 200,
      margin: 2,
      color: { dark: '#0c0c0e', light: '#ffffff' },
    }).then(setDataUrl)
  }, [])

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <StatusBar />
      <NavHeader title="QR reco" closeHref="/reco" />
      <div className="flex-1 flex flex-col items-center justify-center px-8">
        <div className="text-[15px] text-text-dim text-center mb-7 leading-[1.6]">
          Share this QR code and anyone can open your reco directly in Reco
        </div>

        <div className="w-[200px] h-[200px] bg-white rounded-card flex items-center justify-center mb-7">
          {dataUrl
            ? <img src={dataUrl} alt="QR code" width={200} height={200} className="rounded-card" />
            : <div className="w-8 h-8 border-2 border-border border-t-accent rounded-full animate-spin" />
          }
        </div>

        <div className="text-[13px] font-semibold text-white mb-1">BAO Soho — Restaurant</div>
        <div className="text-xs text-text-faint mb-7">givemeareco.com/r/baosoho</div>

        <Link
          href="/home"
          className="bg-accent text-accent-fg px-10 py-3.5 rounded-btn text-sm font-bold hover:opacity-90 transition-opacity"
        >
          Done
        </Link>
      </div>
    </div>
  )
}
