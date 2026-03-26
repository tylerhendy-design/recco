'use client'

import { useEffect, useRef } from 'react'
import { StatusBar } from '@/components/ui/StatusBar'
import { NavHeader } from '@/components/ui/NavHeader'
import Link from 'next/link'
import QRCode from 'qrcode'

const RECO_URL = 'https://reco.app/r/baosoho'

export default function QRPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!canvasRef.current) return
    QRCode.toCanvas(canvasRef.current, RECO_URL, {
      width: 148,
      margin: 1,
      color: {
        dark: '#0c0c0e',
        light: '#ffffff',
      },
    })
  }, [])

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <StatusBar />
      <NavHeader title="QR reco" closeHref="/send" />
      <div className="flex-1 flex flex-col items-center justify-center px-8">
        <div className="text-[15px] text-text-dim text-center mb-7 leading-[1.6]">
          Share this QR code and anyone can open your reco directly in Reco
        </div>

        {/* Real QR code */}
        <div className="w-[180px] h-[180px] bg-white rounded-card p-4 flex items-center justify-center mb-7">
          <canvas ref={canvasRef} />
        </div>

        <div className="text-[13px] font-semibold text-white mb-1">BAO Soho — Restaurant</div>
        <div className="text-xs text-text-faint mb-7">reco.app/r/baosoho</div>

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
