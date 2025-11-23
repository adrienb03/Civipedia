"use client"

// Composant: ClientSWRProvider — fournit la configuration SWR côté client
// Fonction pour hydrater le fallback fourni depuis le server layout
import React from 'react'
import { SWRConfig } from 'swr'

export default function ClientSWRProvider({ children, fallback }: { children: React.ReactNode; fallback?: Record<string, any> }) {
  return (
    <SWRConfig value={{ fallback }}>
      {children}
    </SWRConfig>
  )
}
