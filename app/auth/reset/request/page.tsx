"use client"

import { useState } from 'react'

export default function RequestResetPage() {
  const [identifier, setIdentifier] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const SITEKEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITEKEY || ''

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')
    let recaptchaToken = ''
    try {
      if (SITEKEY && (globalThis as any).grecaptcha?.execute) {
        // If grecaptcha is loaded, attempt to get a token (v3)
        recaptchaToken = await (globalThis as any).grecaptcha.execute(SITEKEY, { action: 'reset_request' })
      }
    } catch (err) {
      // ignore: we'll still send the request without token if not available
      console.debug('reCAPTCHA execute failed', err)
    }
    try {
      const res = await fetch('/api/auth/request-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, recaptchaToken }),
      })
      const data = await res.json()
      setMessage('Si ce compte existe, vous recevrez un e-mail avec les instructions.')
      if (data?.info && data.info.resetUrl) {
        setMessage(m => m + ` (DEV: reset URL: ${data.info.resetUrl})`)
      }
    } catch (e) {
      setMessage('Erreur lors de la demande. Réessayez.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="p-8 max-w-xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Réinitialiser votre mot de passe</h1>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="block text-sm text-gray-700">Email</label>
          <input type="email" required value={identifier} onChange={e => setIdentifier(e.target.value)} className="w-full p-2 border rounded" />
        </div>
        <div>
          <button className="px-4 py-2 bg-blue-600 text-white rounded" disabled={loading}>{loading ? 'Envoi...' : 'Envoyer le lien'}</button>
        </div>
      </form>

      {message && <p className="mt-4 text-sm text-gray-700">{message}</p>}
    </main>
  )
}
