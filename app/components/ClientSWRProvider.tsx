"use client"

import React from 'react'
import { SWRConfig } from 'swr'

export default function ClientSWRProvider({ children, fallback }: { children: React.ReactNode; fallback?: Record<string, any> }) {
  return (
    <SWRConfig value={{ fallback }}>
      {children}
    </SWRConfig>
  )
}
