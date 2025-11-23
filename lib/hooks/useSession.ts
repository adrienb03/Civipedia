"use client"

import useSWR from 'swr'

// Petit fetcher utilisé par SWR pour appeler l'API de session
const fetcher = (url: string) => fetch(url).then((res) => {
  // Si la réponse n'est pas OK on lève une erreur pour que SWR la gère
  if (!res.ok) throw new Error('Not authenticated')
  return res.json()
})

// Accept an optional `fallbackData` so callers (or server layout) can
// provide an initial session value to avoid an extra client fetch.
// Hook: useSession — SWR hook pour la session utilisateur
// Fonction pour récupérer et mettre en cache l'objet session (/api/auth/check)
export default function useSession(fallbackData?: any) {
  // Utilise SWR pour fetcher `/api/auth/check` et mettre en cache la session
  // `fallbackData` permet d'hydrater la valeur depuis le server layout
  const { data, error, isLoading, mutate } = useSWR('/api/auth/check', fetcher, {
    revalidateOnFocus: true, // revalide au focus de la fenêtre
    dedupingInterval: 60 * 1000, // désactive les requêtes doublons pendant 60s
    fallbackData,
  })

  return {
    user: data || null,
    isLoading,
    error,
    mutate,
  }
}
