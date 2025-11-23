// lib/types.ts

export type User = {
  id: number
  name: string
  email?: string
}

export type Session = {
  id: number
  name: string | null
} | null
