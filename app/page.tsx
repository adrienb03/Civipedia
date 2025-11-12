"use client";

import { useState } from "react";
import Image from 'next/image';

export default function Home() {
  const [query, setQuery] = useState("");
  const [response, setResponse] = useState("");
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
      setResponse(data.answer);
    } catch (error) {
      console.error("Erreur:", error);
      setResponse("Erreur lors de la recherche.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="w-full max-w-4xl">
        {/* Logo Civipedia avec dimensions exactes */}
        <div className="flex justify-center items-center mb-12">
          <div className="w-40 h-40 relative">
            <Image
              src="/civipedia-logo.png"
              alt="Civipedia Logo"
              width={1802}
              height={488}
              className="rounded-2xl"
              priority
              quality={100}
            />
          </div>
        </div>

        {/* Encadré principal unifié */}
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl p-8 border border-white/20">
          <form onSubmit={handleSearch} className="mb-8">
            <div className="flex space-x-4">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Posez n'importe quelle question ou mentionnez un Espace"
                className="flex-grow p-4 text-lg border-0 rounded-2xl bg-white shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition-all duration-200"
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

          {response && (
            <div className="p-6 bg-white rounded-2xl shadow-md border border-gray-100">
              <h2 className="font-semibold text-gray-900 text-lg mb-3">Réponse :</h2>
              <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{response}</p>
            </div>
          )}

          {!response && (
            <div className="text-center pt-6 border-t border-gray-200">
              <p className="text-gray-500 text-sm">
                💡 Exemple : "Qu'est-ce que la démocratie participative ?"
              </p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}