// Route API: /api/search
// Implémentation minimale du moteur de recherche + compteur pour utilisateurs anonymes
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getSessionFromCookieStore } from '@/lib/server/auth'
import { db } from '@/db'
import { anon_counters } from '@/db/schema'
import { eq } from 'drizzle-orm'

const MAX_ANON_REQUESTS = 3

function genAnonId() {
  try {
    // Node 18+: crypto.randomUUID
    return (globalThis as any).crypto?.randomUUID?.() ?? `anon_${Date.now()}_${Math.floor(Math.random() * 1e6)}`
  } catch (e) {
    return `anon_${Date.now()}_${Math.floor(Math.random() * 1e6)}`
  }
}

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies()
    const userId = await getSessionFromCookieStore(cookieStore)

    const body = await request.json().catch(() => ({}))
    const query = typeof body?.query === 'string' ? body.query : ''

    // Utilisateur connecté -> autorisé sans limite
    if (userId) {
      // Try to proxy to the Python FastAPI backend which provides the vector search.
      try {
        const resp = await fetch(process.env.PYTHON_API_URL ?? 'http://127.0.0.1:8000/ask', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: query, collection: 'Base_de_connaissance', n: 2 }),
        })
        if (resp.ok) {
          const data = await resp.json()
          // Normalize Python backend response: it may return an object with
          // { answer: { response, source_nodes, metadata } } — extract the
          // textual part so the frontend receives a string under `answer`.
          let answerText: string
          const sources = Array.isArray(data?.sources) ? data.sources : []
          if (typeof data?.answer === 'string') {
            answerText = data.answer
          } else if (data?.answer && typeof data.answer === 'object') {
            answerText = data.answer.response ?? data.answer.text ?? JSON.stringify(data.answer)
          } else {
            answerText = ''
          }
          return NextResponse.json({ answer: answerText, sources, ...('remaining' in data ? { remaining: data.remaining } : {}) })
        }
        console.warn('Python API returned non-OK status', resp.status)
      } catch (e) {
        console.warn('Could not reach Python API, falling back to simulated response', e)
      }
      return NextResponse.json({ answer: `Réponse simulée pour: ${query}`, sources: [] })
    }

    // Anonyme: s'identifier via cookie `anon_id` (création si absent)
    const existingAnon = cookieStore.get('anon_id')?.value
    const anonId = existingAnon ?? genAnonId()
    if (!existingAnon) {
      try {
        cookieStore.set('anon_id', anonId, { path: '/', maxAge: 60 * 60 * 24 * 365 })
      } catch (e) {
        if (process.env.NODE_ENV !== 'production') console.debug('Could not set anon_id cookie', e)
      }
    }

    // Chercher le compteur côté serveur
    const rows = await db.select().from(anon_counters).where(eq(anon_counters.id, anonId)).limit(1)
    let count = 0
    if (rows.length > 0) {
      count = rows[0].count ?? 0
    }

    if (count >= MAX_ANON_REQUESTS) {
      return NextResponse.json({ error: 'limit', message: 'Vous avez atteint la limite de recherches pour les utilisateurs non connectés. Veuillez vous connecter.' }, { status: 401 })
    }

    count += 1

    const now = Date.now()
    // Upsert: insert or update depending on existence
    if (rows.length === 0) {
      await db.insert(anon_counters).values({ id: anonId, count, updated_at: now })
    } else {
      await db.update(anon_counters).set({ count, updated_at: now }).where(eq(anon_counters.id, anonId))
    }

    const remaining = Math.max(0, MAX_ANON_REQUESTS - count)

    // For anonymous users, also try to proxy to Python API but include remaining counter.
    try {
      const resp = await fetch(process.env.PYTHON_API_URL ?? 'http://127.0.0.1:8000/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: query, collection: 'Base_de_connaissance', n: 2 }),
      })
      if (resp.ok) {
        const data = await resp.json()
        let answerText: string
        const sources = Array.isArray(data?.sources) ? data.sources : []
        if (typeof data?.answer === 'string') {
          answerText = data.answer
        } else if (data?.answer && typeof data.answer === 'object') {
          answerText = data.answer.response ?? data.answer.text ?? JSON.stringify(data.answer)
        } else {
          answerText = ''
        }
        // merge remaining info for frontend usage
        return NextResponse.json({ answer: answerText, sources, remaining })
      }
      console.warn('Python API returned non-OK status for anonymous request', resp.status)
    } catch (e) {
      console.warn('Could not reach Python API for anonymous request, falling back to simulated response', e)
    }

    return NextResponse.json({ answer: `Réponse simulée pour: ${query}`, sources: [], remaining })
  } catch (error) {
    console.error('Error in /api/search:', error)
    return NextResponse.json({ error: 'server_error', message: 'Erreur interne du serveur' }, { status: 500 })
  }
}
