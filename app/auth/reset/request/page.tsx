"use client"

import { useState } from 'react'

export default function RequestResetPage() {
  const [identifier, setIdentifier] = useState('')
  const [message, setMessage] = useState('')
  const [resetUrl, setResetUrl] = useState('')
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
      // Generic message shown to user to avoid user enumeration
      setMessage('Si ce compte existe, vous recevrez un e-mail avec les instructions.')

      // In development mode we may get back a mock resetUrl; show it clearly
      if (data?.info?.resetUrl) {
        const url = String(data.info.resetUrl)
        setResetUrl(url)
        // Auto-redirect in dev for convenience: open the reset link so user can set a new password immediately
        if (process.env.NODE_ENV !== 'production') {
          try {
            // small delay so the user sees the confirmation message briefly
            setTimeout(() => {
              window.location.href = url
            }, 600)
          } catch (e) {
            // ignore if window not available
            console.debug('Auto-redirect to resetUrl failed', e)
          }
        }
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

      {resetUrl && (
        <div className="mt-4 p-4 border rounded bg-gray-50">
          <p className="text-sm text-gray-700 mb-2">DEV: lien de réinitialisation (ne sera pas envoyé en prod sans SendGrid):</p>
          <div className="flex items-center gap-2">
            <a href={resetUrl} className="text-blue-600 break-all" target="_blank" rel="noreferrer">{resetUrl}</a>
            <button type="button" className="ml-2 px-2 py-1 bg-gray-200 rounded" onClick={() => { navigator.clipboard?.writeText(resetUrl) }}>Copier</button>
          </div>
        </div>
      )}
    </main>
  )
}
