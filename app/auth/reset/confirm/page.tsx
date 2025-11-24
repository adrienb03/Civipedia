"use client"

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'

export default function ConfirmResetPage() {
  const [newPassword, setNewPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const params = useSearchParams()
  const token = params?.get('token') ?? ''

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPassword !== confirm) {
      setMessage('Les mots de passe ne correspondent pas')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/auth/confirm-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword }),
      })
      const data = await res.json()
      if (data?.ok) {
        setMessage('Mot de passe mis à jour. Vous pouvez vous connecter.')
      } else {
        setMessage('Erreur: ' + (data?.error || 'inconnue'))
      }
    } catch (e) {
      setMessage('Erreur interne')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="p-8 max-w-xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Définir un nouveau mot de passe</h1>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="block text-sm text-gray-700">Nouveau mot de passe</label>
          <input type="password" required value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full p-2 border rounded" />
        </div>
        <div>
          <label className="block text-sm text-gray-700">Confirmer</label>
          <input type="password" required value={confirm} onChange={e => setConfirm(e.target.value)} className="w-full p-2 border rounded" />
        </div>
        <div>
          <button className="px-4 py-2 bg-blue-600 text-white rounded" disabled={loading}>{loading ? '...' : 'Enregistrer'}</button>
        </div>
      </form>

      {message && <p className="mt-4 text-sm text-gray-700">{message}</p>}
    </main>
  )
}
