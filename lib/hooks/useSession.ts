"use client"

import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then((res) => {
  if (!res.ok) throw new Error('Not authenticated')
  return res.json()
})

// Accept an optional `fallbackData` so callers (or server layout) can
// provide an initial session value to avoid an extra client fetch.
export default function useSession(fallbackData?: any) {
  const { data, error, isLoading, mutate } = useSWR('/api/auth/check', fetcher, {
    revalidateOnFocus: true,
    dedupingInterval: 60 * 1000,
    fallbackData,
  })

  return {
    user: data || null,
    isLoading,
    error,
    mutate,
  }
}
