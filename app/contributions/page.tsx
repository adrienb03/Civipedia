"use client"

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import useSession from '@/lib/hooks/useSession'

export default function ContributionsPage() {
  const { user, isLoading } = useSession()
  const [files, setFiles] = useState<Array<any>>([])
  const [summary, setSummary] = useState<{ total: number; accepted: number; refused: number } | null>(null)
  const [loading, setLoading] = useState(false)
  const [docs, setDocs] = useState<Array<any>>([])
  const [uploading, setUploading] = useState(false)
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

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

  // Admin: fetch source documents list
  useEffect(() => {
    let mounted = true
    if (!user) return
    const allowedAdmins = ['admin@gmail.com', 'admin2@gmail.com']
    const isAdmin = !!(user && allowedAdmins.includes((user as any).email))
    if (!isAdmin) return

    const fetchDocs = async () => {
      try {
        const res = await fetch('/api/admin/contributions/source-documents')
        if (!res.ok) throw new Error('Failed')
        const data = await res.json()
        if (!mounted) return
        setDocs(data.files || [])
      } catch (e) {
        console.error('Could not fetch source documents', e)
      }
    }

    fetchDocs()
  }, [user])

  const allowedAdmins = ['admin@gmail.com', 'admin2@gmail.com']
  const isAdmin = !!(user && allowedAdmins.includes((user as any).email))

  const router = useRouter()

  if (isLoading) return <div className="p-6">Chargement...</div>
  if (!user) return <div className="p-6">Veuillez vous connecter pour voir vos contributions.</div>

  return (
    <div className="max-w-4xl mx-auto mt-8 p-6 bg-white rounded-2xl shadow">
      {!isAdmin && (
        <>
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-semibold text-black">Mes contributions</h1>
            <div>
              <button
                onClick={() => router.push('/')}
                className="inline-flex items-center bg-blue-600 text-white px-3 py-2 rounded hover:bg-blue-700"
              >
                Moteur
              </button>
            </div>
          </div>

          <div className="mb-4 flex gap-4">
            <div className="p-3 bg-gray-50 rounded shadow-sm">
              <div className="text-sm text-black">Total</div>
              <div className="text-xl font-bold text-black">{summary?.total ?? files.length}</div>
            </div>
            <div className="p-3 bg-green-50 rounded shadow-sm">
              <div className="text-sm text-black">Acceptés</div>
              <div className="text-xl font-bold text-black">{summary?.accepted ?? files.filter(f => f.status === 'accepted').length}</div>
            </div>
            <div className="p-3 bg-red-50 rounded shadow-sm">
              <div className="text-sm text-black">Refusés</div>
              <div className="text-xl font-bold text-black">{summary?.refused ?? files.filter(f => f.status === 'refused').length}</div>
            </div>
          </div>
        </>
      )}

      {loading ? (
        <div>Chargement des contributions…</div>
      ) : (
        <ul className="space-y-3">
          {files.map((f: any) => (
            <li key={f.safeName} className={`flex items-center justify-between p-3 rounded ${f.status === 'accepted' ? 'bg-green-50 border border-green-200' : (f.status === 'refused' ? 'bg-red-50 border border-red-200' : 'bg-white border border-gray-100')}`}>
              <div>
                <div className="font-medium text-black">{f.originalName}</div>
                <div className="text-xs text-black">Téléversé: {f.uploadedAt ? new Date(f.uploadedAt).toLocaleString() : '-'}</div>
              </div>
              <div className="flex items-center gap-4">
                <a className="text-black hover:underline text-sm" href={`/api/uploads/${encodeURIComponent(f.safeName)}`}>Télécharger</a>
                <div className="text-sm text-black">{f.status === 'accepted' ? 'Accepté' : (f.status === 'refused' ? 'Refusé' : "En attente")}</div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Admin-only: Documents sources management */}
      {user && (() => {
        const allowedAdmins = ['admin@gmail.com', 'admin2@gmail.com']
        const isAdmin = allowedAdmins.includes((user as any).email)
        if (!isAdmin) return null
        return (
          <div className="mt-8 p-4 bg-gray-50 rounded-lg">
            <h2 className="text-xl font-semibold mb-3 text-black">Documents sources</h2>
            <p className="text-sm text-black mb-3">Fichiers PDF utilisés comme sources pour le moteur de recherche.</p>

            <form onSubmit={async (e) => {
              e.preventDefault()
              const inputEl = fileInputRef.current
              if (!inputEl || !inputEl.files || inputEl.files.length === 0) return
              const files = Array.from(inputEl.files)
              setUploading(true)
              try {
                const fd = new FormData()
                for (const f of files) fd.append('file', f)
                const res = await fetch('/api/admin/contributions/source-documents', { method: 'POST', body: fd })
                const data = await res.json()
                if (!res.ok) throw new Error(data?.error || 'Upload failed')
                // Refresh list
                const list = await fetch('/api/admin/contributions/source-documents')
                const li = await list.json()
                setDocs(li.files || [])
                if (fileInputRef.current) {
                  fileInputRef.current.value = ''
                  setSelectedFileName(null)
                }
              } catch (err) {
                console.error('Upload failed', err)
                alert('Upload échoué: ' + (err as any)?.message)
              } finally {
                setUploading(false)
              }
            }}>
              <div className="flex items-center gap-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    const files = e.target.files
                    if (!files || files.length === 0) {
                      setSelectedFileName(null)
                    } else if (files.length === 1) {
                      setSelectedFileName(files[0].name)
                    } else {
                      setSelectedFileName(`${files.length} fichiers sélectionnés`)
                    }
                  }}
                />
                <button type="button" onClick={() => fileInputRef.current?.click()} className="px-3 py-2 bg-white border border-gray-300 text-black rounded hover:bg-gray-100">Choisir des fichiers</button>
                {selectedFileName ? <div className="text-sm text-black">{selectedFileName}</div> : null}
                <button type="submit" disabled={uploading} className="px-3 py-2 bg-blue-600 text-white rounded">{uploading ? 'Upload...' : 'Ajouter les documents'}</button>
              </div>
            </form>

            <div className="mt-4">
              <h3 className="font-medium mb-2 text-black">Liste</h3>
              {docs.length === 0 ? (
                <div className="text-sm text-black">Aucun document</div>
              ) : (
                <ul className="space-y-2">
                  {docs.map((d: any) => (
                    <li key={d.name} className="flex items-center justify-between bg-white p-2 rounded border">
                      <div>
                        <div className="text-sm font-medium text-black">{d.name}</div>
                        <div className="text-xs text-black">{Math.round(d.size/1024)} KB — {new Date(d.mtime).toLocaleString()}</div>
                      </div>
                      <div>
                        <a className="text-blue-600 hover:underline text-sm" href={`/api/admin/contributions/source-documents/${encodeURIComponent(d.name)}`}>Télécharger</a>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )
      })()}
    </div>
  )
}
