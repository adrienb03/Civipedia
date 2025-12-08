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
  const [adminFiles, setAdminFiles] = useState<Array<{ name: string; size: number; mtime: number }>>([]);

  useEffect(() => {
    // If user is admin, fetch list of uploaded files
    if (user?.email === 'admin@gmail.com') {
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
    if (!files || files.length === 0) return setStatus("Aucun fichier sélectionné.");

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

  return (
    <div className="max-w-3xl mx-auto mt-8 p-6 bg-white rounded-2xl shadow">
      <h1 className="text-2xl font-semibold mb-4">Contribuer — déposer des PDF</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Sélectionner des fichiers PDF</label>
          <input type="file" accept="application/pdf" multiple onChange={handleChange} className="mt-2" />
        </div>

        <div>
          <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">Téléverser</button>
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

      {/* Section visible uniquement pour l'admin */}
      {user?.email === 'admin@gmail.com' && (
        <div className="mt-8">
          <h2 className="text-lg font-medium">Documents téléversés (admin)</h2>
          {adminFiles.length === 0 ? (
            <p className="text-sm text-gray-500 mt-2">Aucun fichier trouvé.</p>
          ) : (
            <ul className="mt-3 space-y-2 text-sm text-gray-700">
              {adminFiles.map((f) => (
                <li key={f.name} className="flex items-center justify-between">
                  <div>
                    <strong className="mr-2">{f.name}</strong>
                    <span className="text-xs text-gray-500">{Math.round(f.size/1024)} KB</span>
                  </div>
                  <div>
                    <a href={`/api/uploads/${encodeURIComponent(f.name)}`} className="text-blue-600 hover:underline mr-4">Télécharger</a>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
