"use client"

import { useState, useEffect } from "react";
import { useRouter } from 'next/navigation';
import useSession from '@/lib/hooks/useSession';

export default function ContribuerPage() {
  const router = useRouter();
  const [files, setFiles] = useState<FileList | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [uploaded, setUploaded] = useState<Array<{ name: string; path: string }>>([]);
  const { user, isLoading } = useSession()
  const [adminFiles, setAdminFiles] = useState<Array<{ name: string; size: number; mtime: number; status?: string; reviewedBy?: string | null; reviewedAt?: number | null }>>([]);
  const allowedAdmins = ['admin@gmail.com', 'admin2@gmail.com']

  useEffect(() => {
    // If user is admin, fetch list of uploaded files
    if (user?.email && allowedAdmins.includes(user.email)) {
      fetch('/api/uploads/list')
        .then((r) => r.json())
        .then((data) => {
          if (data?.files) setAdminFiles(data.files)
        })
        .catch((e) => console.error('Could not fetch uploads list', e))
    }
  }, [user])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFiles(e.target.files);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!files || files.length === 0) return; // button is disabled until files are selected

    setStatus("Envoi en cours...");

    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append("files", files[i]);
    }

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Erreur serveur");

      setUploaded(data.saved || []);
      setStatus("Téléversement terminé. Redirection vers le moteur de recherche...");

      // Petit délai pour que l'utilisateur voie le message, puis redirige vers la page d'accueil (moteur de recherche)
      setTimeout(() => {
        router.push('/');
      }, 1400);
    } catch (err: any) {
      console.error(err);
      setStatus(err?.message || "Erreur lors du téléversement.");
    }
  };

  if (user?.email && allowedAdmins.includes(user.email)) {
    // Admin-only view: list uploaded files, no upload controls
    return (
      <div className="max-w-3xl mx-auto mt-8 p-6 bg-white rounded-2xl shadow">
        
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-black mb-4" style={{ color: '#000' }}>Documents des contributeurs</h1>
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/')}
              className="inline-flex items-center bg-blue-600 text-white px-3 py-2 rounded hover:bg-blue-700"
            >
              Moteur
            </button>

            <button
              onClick={async () => {
                if (!confirm('Voulez-vous vraiment supprimer tous les documents téléversés ? Cette action est irréversible.')) return;
                try {
                  setStatus('Suppression en cours...');
                  const res = await fetch('/api/uploads/clear', { method: 'DELETE' });
                  const data = await res.json();
                  if (!res.ok) throw new Error(data?.error || 'Erreur');
                  setStatus(`Suppression terminée (${data.deleted || 0} fichiers).`);
                  // refresh list
                  const listRes = await fetch('/api/uploads/list');
                  const listData = await listRes.json();
                  setAdminFiles(listData?.files || []);
                } catch (e: any) {
                  console.error(e);
                  setStatus(e?.message || 'Erreur lors de la suppression.');
                }
              }}
              className="ml-4 inline-flex items-center bg-red-600 text-white px-3 py-2 rounded hover:bg-red-700"
            >
              Vider
            </button>
          </div>
        </div>

        {adminFiles.length === 0 ? (
          <p className="text-sm text-gray-500 mt-2">Aucun fichier trouvé.</p>
        ) : (
          <ul className="mt-3 space-y-2 text-sm text-gray-700">
            {adminFiles.map((f) => (
              <li
                key={f.name}
                className={`flex items-center justify-between ${f.status === 'accepted' ? 'bg-green-50 border border-green-200 rounded p-3' : (f.status === 'refused' ? 'bg-red-50 border border-red-200 rounded p-3' : '')}`}
              >
                <div>
                  <strong className="mr-2">{f.name}</strong>
                  <span className="text-xs text-gray-500">{Math.round(f.size/1024)} KB</span>
                          <div className="mt-1">
                            <span className="text-xs mr-2">État: <strong>{(!f.status || f.status === 'pending') ? "Document en attente d'être traité" : (f.status === 'accepted' ? 'Accepté' : (f.status === 'refused' ? 'Refusé' : f.status))}</strong></span>
                            {f.reviewedBy && <span className="text-xs text-gray-500"> — par {f.reviewedBy}</span>}
                          </div>
                </div>
                <div className="flex items-center gap-3">
                  <a href={`/api/uploads/${encodeURIComponent(f.name)}`} className="text-blue-600 hover:underline">Télécharger</a>
                  {(!f.status || f.status === 'pending') && (
                    <>
                      <button
                        onClick={async () => {
                          if (!confirm(`Marquer ${f.name} comme accepté ?`)) return
                          try {
                            setStatus('Mise à jour en cours...')
                            const res = await fetch('/api/uploads/mark', { method: 'POST', body: JSON.stringify({ name: f.name, status: 'accepted' }), headers: { 'Content-Type': 'application/json' } })
                            const data = await res.json()
                            if (!res.ok) throw new Error(data?.error || 'Erreur')
                            // refresh list
                            const listRes = await fetch('/api/uploads/list')
                            const listData = await listRes.json()
                            setAdminFiles(listData?.files || [])
                            setStatus('Mise à jour terminée.')
                          } catch (e: any) {
                            console.error(e)
                            setStatus(e?.message || 'Erreur lors de la mise à jour.')
                          }
                        }}
                        className="inline-flex items-center bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 text-xs border border-green-800"
                      >
                        Accepter
                      </button>

                      <button
                        onClick={async () => {
                          if (!confirm(`Marquer ${f.name} comme refusé ?`)) return
                          try {
                            setStatus('Mise à jour en cours...')
                            const res = await fetch('/api/uploads/mark', { method: 'POST', body: JSON.stringify({ name: f.name, status: 'refused' }), headers: { 'Content-Type': 'application/json' } })
                            const data = await res.json()
                            if (!res.ok) throw new Error(data?.error || 'Erreur')
                            // refresh list
                            const listRes = await fetch('/api/uploads/list')
                            const listData = await listRes.json()
                            setAdminFiles(listData?.files || [])
                            setStatus('Mise à jour terminée.')
                          } catch (e: any) {
                            console.error(e)
                            setStatus(e?.message || 'Erreur lors de la mise à jour.')
                          }
                        }}
                        className="inline-flex items-center bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 text-xs"
                      >
                        Refuser
                      </button>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    )
  }

  // Non-admin view: upload UI
  return (
    <div className="max-w-3xl mx-auto mt-8 p-6 bg-white rounded-2xl shadow">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-black">Contribuer : déposer des PDF</h1>
        <div>
          <button
            onClick={() => router.push('/')}
            className="inline-flex items-center bg-blue-600 text-white px-3 py-2 rounded hover:bg-blue-700"
          >
            Moteur
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <input id="file-input" type="file" accept="application/pdf" multiple onChange={handleChange} className="hidden" />
          <label htmlFor="file-input" className="inline-flex items-center bg-blue-600 text-white px-4 py-2 rounded cursor-pointer hover:bg-blue-700">
            Choisir les fichiers
          </label>

          {files && files.length > 0 && (
            <div className="mt-2 text-sm text-gray-700">
              {Array.from(files).map((f, i) => (
                <div key={i}>{f.name}</div>
              ))}
            </div>
          )}
        </div>

        <div>
          <button
            type="submit"
            disabled={!(files && files.length > 0)}
            className={`bg-blue-600 text-white px-4 py-2 rounded ${!(files && files.length > 0) ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-700'}`}
          >
            Téléverser
          </button>
        </div>
      </form>

      {status && <p className="mt-4 text-gray-700">{status}</p>}

      {uploaded.length > 0 && (
        <div className="mt-6">
          <h2 className="font-medium">Fichiers sauvegardés :</h2>
          <ul className="mt-2 list-disc list-inside text-sm text-gray-700">
            {uploaded.map((f, i) => (
              <li key={i}><strong>{f.name}</strong> — {f.path}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
