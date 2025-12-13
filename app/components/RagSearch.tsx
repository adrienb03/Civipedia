// Composant UI: RagSearch — recherche RAG et affichage des résultats
// Fonction pour gérer l'interface de recherche et l'affichage côté client

"use client"

import { useState, useEffect } from "react";
import { useRouter } from 'next/navigation';
import useSession from '@/lib/hooks/useSession'

export default function RagSearch() {
  const [query, setQuery] = useState("");
  const [response, setResponse] = useState("");
  const [remaining, setRemaining] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setResponse("");

    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });

      const data = await res.json();

      if (res.status === 401 || data?.error === 'limit') {
        // Limite atteinte pour utilisateur anonyme
        setResponse(data?.message || 'Veuillez vous connecter pour continuer.')
        setRemaining(0)
        return
      }

      setResponse(data.answer ?? '')
      setRemaining(typeof data?.remaining === 'number' ? data.remaining : null)
    } catch (error) {
      console.error("Erreur:", error);
      setResponse("Erreur lors de la recherche.");
    } finally {
      setLoading(false);
    }
  };

  const handleToolClick = (toolName: string) => {
    console.log(`Outil cliqué: ${toolName}`);
  };

  // Navigation helper for client-side routing
  const router = useRouter();

  const { user, isLoading } = useSession()

  // Cleanup any leftover legacy buttons that might be injected by an older bundle
  // This ensures logged-in pages don't show the old 5-button layout.
  useEffect(() => {
    try {
      const legacy = ['Modèles', 'Sources', 'Dicter']
      legacy.forEach((text) => {
        const els = Array.from(document.querySelectorAll('button, a'))
          .filter((el) => (el.textContent || '').trim() === text)
        els.forEach((el) => {
          // remove the element from DOM
          el.remove()
          console.log('Removed legacy button:', text)
        })
      })
    } catch (e) {
      // ignore
    }
  }, [])

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl p-8 border border-white/20">
      <form onSubmit={handleSearch} className="mb-6">
        <div className="flex space-x-4">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Posez n'importe quelle question ou mentionnez un Espace"
            className="flex-grow p-4 text-lg border-0 rounded-2xl bg-white shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition-all duration-200 text-gray-900 placeholder-gray-400"
          />
          <button
            type="submit"
            disabled={loading}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-4 rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-105 disabled:opacity-50 disabled:transform-none transition-all duration-200 font-semibold text-lg"
          >
            {loading ? "🔍" : "Rechercher"}
          </button>
        </div>
      </form>

      <div className="flex justify-center space-x-6 pt-4 border-t border-gray-200">
        <button onClick={() => handleToolClick("Ajouter fichier")} className="p-3 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-all duration-200 flex flex-col items-center">
          <div className="w-6 h-6 mb-1">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
            </svg>
          </div>
          <span className="text-xs">Fichier</span>
        </button>

        <button onClick={() => { router.push('/contribuer'); handleToolClick('Contribuer'); }} aria-label="Contribuer" className="p-3 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-all duration-200 flex flex-col items-center">
          <div className="w-6 h-6 mb-1">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M3 7a2 2 0 012-2h4l2 2h6a2 2 0 012 2v7a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
              <path d="M3 7h6l2 2" opacity="0" />
            </svg>
          </div>
          <span className="text-xs">Contribuer</span>
        </button>

        <button onClick={() => { router.push('/contributions'); handleToolClick('Contributions'); }} aria-label="Contributions" className="p-3 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-all duration-200 flex flex-col items-center">
          <div className="w-6 h-6 mb-1">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 7h18M3 12h18M3 17h18" />
            </svg>
          </div>
          <span className="text-xs">Contributions</span>
        </button>

        
      </div>

      {response && (
        <div className="mt-6 p-6 bg-white rounded-2xl shadow-md border border-gray-100">
          <h2 className="font-semibold text-gray-900 text-lg mb-3">Réponse :</h2>
          <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{response}</p>
        </div>
      )}

      {!response && (
        <div className="text-center pt-6">
          {!user && !isLoading ? (
            <p className="text-gray-500 text-sm">Connectez-vous pour accéder à toutes les fonctionnalités de Civipedia</p>
          ) : (
            // If the user is logged in, only show remaining/limit when it's explicitly provided
            remaining === null ? null : (remaining > 0 ? (
              <p className="text-gray-500 text-sm">Il vous reste {remaining} recherche{remaining > 1 ? 's' : ''} avant de devoir vous connecter.</p>
            ) : (
              <p className="text-gray-500 text-sm">Vous avez atteint la limite de recherches. <a href="/login" className="text-blue-600 hover:underline">Connectez-vous</a> pour continuer.</p>
            ))
          )}
        </div>
      )}
    </div>
  );
}
