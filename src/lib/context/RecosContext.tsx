'use client'

import { createContext, useContext, useState } from 'react'
import type { Reco } from '@/types/app.types'

interface RecosContextValue {
  manualRecos: Reco[]
  addManualReco: (reco: Reco) => void
}

const RecosContext = createContext<RecosContextValue>({
  manualRecos: [],
  addManualReco: () => {},
})

export function RecosProvider({ children }: { children: React.ReactNode }) {
  const [manualRecos, setManualRecos] = useState<Reco[]>([])

  function addManualReco(reco: Reco) {
    setManualRecos((prev) => [reco, ...prev])
  }

  return (
    <RecosContext.Provider value={{ manualRecos, addManualReco }}>
      {children}
    </RecosContext.Provider>
  )
}

export function useRecos() {
  return useContext(RecosContext)
}
