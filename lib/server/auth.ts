// lib/server/auth.ts
import { cookies as nextCookies } from 'next/headers'

// ReturnType<typeof nextCookies> can vary between versions/environments
// (sometimes a Promise, sometimes sync). To avoid fragile types we accept
// either the store or a Promise for it and normalize inside each helper.

type MaybePromise<T> = T | Promise<T>

// Export a single source of truth for cookie TTL so other modules can reuse it.
// Auth serveur: gestion des cookies de session
// Constantes et helpers pour définir/effacer la cookie `user_id`
export const COOKIE_MAX_AGE = 60 * 60 * 24 * 7 // 1 week in seconds

export const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: COOKIE_MAX_AGE,
  path: '/',
}

async function resolveStore(cookieStore: MaybePromise<any>) {
  // Normaliser le cookie store : accepte une valeur ou une Promise
  // Ceci permet d'utiliser `cookies()` qui peut être sync ou async
  return await Promise.resolve(cookieStore)
}

/**
 * Set authentication cookies for a newly created or authenticated user.
 * Only the `user_id` is stored in an httpOnly cookie to avoid exposing
 * identifying information or PII to client-side JavaScript.
 */
export async function setAuthCookies(cookieStore: MaybePromise<any>, user: { id: number | string; name?: string }) {
  // Récupérer le store puis écrire la cookie `user_id` en httpOnly
  const store = await resolveStore(cookieStore)
  // Stocke uniquement l'identifiant dans une cookie httpOnly pour la sécurité
  store.set('user_id', String(user.id), COOKIE_OPTIONS)
}

/**
 * Clear any auth-related cookies. We keep deleting `user_name` for backward
 * compatibility in case older clients or sessions still wrote it.
 */
export async function clearAuthCookies(cookieStore: MaybePromise<any>) {
  // Supprimer les cookies liées à l'authentification
  const store = await resolveStore(cookieStore)
  // Supprime l'ID de session
  store.delete('user_id')
  // Supprime aussi le user_name par compatibilité ascendante
  store.delete('user_name')
}

/**
 * Read the current session from the provided `cookies()` store.
 * Returns the numeric user id or `null` when not present/invalid.
 */
export async function getSessionFromCookieStore(cookieStore: MaybePromise<any>): Promise<number | null> {
  // Lire la cookie `user_id` et la transformer en nombre
  const store = await resolveStore(cookieStore)
  const userId = store.get('user_id')?.value
  if (!userId) return null
  const n = Number(userId)
  // Retourne null si la conversion échoue
  return Number.isNaN(n) ? null : n
}
