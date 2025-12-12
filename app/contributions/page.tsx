"use client"

import { useEffect, useState } from 'react'
import useSession from '@/lib/hooks/useSession'

export default function ContributionsPage() {
  const { user, isLoading } = useSession()
  const [files, setFiles] = useState<Array<any>>([])
  const [summary, setSummary] = useState<{ total: number; accepted: number; refused: number } | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let mounted = true
    if (!user) return
    const fetchData = () => {
      setLoading(true)
      fetch('/api/uploads/my')
        .then((r) => r.json())
        .then((data) => {
          if (!mounted) return
          if (data?.files) setFiles(data.files)
          if (data?.summary) setSummary(data.summary)
        })
        .catch((e) => console.error('Could not fetch contributions', e))
        .finally(() => mounted && setLoading(false))
    }

    fetchData()
    const iv = setInterval(fetchData, 5000) // poll every 5s to pick up admin changes
    return () => {
      mounted = false
      clearInterval(iv)
    }
  }, [user])

  if (isLoading) return <div className="p-6">Chargement...</div>
  if (!user) return <div className="p-6">Veuillez vous connecter pour voir vos contributions.</div>

  return (
    <div className="max-w-4xl mx-auto mt-8 p-6 bg-white rounded-2xl shadow">
      <h1 className="text-2xl font-semibold mb-4">Mes contributions</h1>

      <div className="mb-4 flex gap-4">
        <div className="p-3 bg-gray-50 rounded shadow-sm">
          <div className="text-sm text-gray-500">Total</div>
          <div className="text-xl font-bold">{summary?.total ?? files.length}</div>
        </div>
        <div className="p-3 bg-green-50 rounded shadow-sm">
          <div className="text-sm text-gray-500">Acceptés</div>
          <div className="text-xl font-bold">{summary?.accepted ?? files.filter(f => f.status === 'accepted').length}</div>
        </div>
        <div className="p-3 bg-red-50 rounded shadow-sm">
          <div className="text-sm text-gray-500">Refusés</div>
          <div className="text-xl font-bold">{summary?.refused ?? files.filter(f => f.status === 'refused').length}</div>
        </div>
      </div>

      {loading ? (
        <div>Chargement des contributions…</div>
      ) : (
        <ul className="space-y-3">
          {files.map((f: any) => (
            <li key={f.safeName} className={`flex items-center justify-between p-3 rounded ${f.status === 'accepted' ? 'bg-green-50 border border-green-200' : (f.status === 'refused' ? 'bg-red-50 border border-red-200' : 'bg-white border border-gray-100')}`}>
              <div>
                <div className="font-medium">{f.originalName}</div>
                <div className="text-xs text-gray-500">Téléversé: {f.uploadedAt ? new Date(f.uploadedAt).toLocaleString() : '-'}</div>
              </div>
              <div className="flex items-center gap-4">
                <a className="text-blue-600 hover:underline text-sm" href={`/api/uploads/${encodeURIComponent(f.safeName)}`}>Télécharger</a>
                <div className="text-sm text-gray-600">{f.status === 'accepted' ? 'Accepté' : (f.status === 'refused' ? 'Refusé' : "En attente")}</div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
