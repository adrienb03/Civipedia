// Composant UI: RagSearch — recherche RAG et affichage des résultats
// Fonction pour gérer l'interface de recherche et l'affichage côté client

"use client"

import { useState } from "react";

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
        <button onClick={() => handleToolClick("Modèles DIA")} className="p-3 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-all duration-200 flex flex-col items-center">
          <div className="w-6 h-6 mb-1">⚙️</div>
          <span className="text-xs">Modèles</span>
        </button>
        <button onClick={() => handleToolClick("Sources")} className="p-3 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-all duration-200 flex flex-col items-center">
          <div className="w-6 h-6 mb-1">📚</div>
          <span className="text-xs">Sources</span>
        </button>
        <button onClick={() => handleToolClick("Ajouter fichier")} className="p-3 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-all duration-200 flex flex-col items-center">
          <div className="w-6 h-6 mb-1">📎</div>
          <span className="text-xs">Fichier</span>
        </button>
        <button onClick={() => handleToolClick("Dicter")} className="p-3 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-all duration-200 flex flex-col items-center">
          <div className="w-6 h-6 mb-1">🎙️</div>
          <span className="text-xs">Dicter</span>
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
          {remaining === null ? (
            <p className="text-gray-500 text-sm">Connectez-vous pour accéder à toutes les fonctionnalités de Civipedia</p>
          ) : remaining > 0 ? (
            <p className="text-gray-500 text-sm">Il vous reste {remaining} recherche{remaining > 1 ? 's' : ''} avant de devoir vous connecter.</p>
          ) : (
            <p className="text-gray-500 text-sm">Vous avez atteint la limite de recherches. <a href="/login" className="text-blue-600 hover:underline">Connectez-vous</a> pour continuer.</p>
          )}
        </div>
      )}
    </div>
  );
}
