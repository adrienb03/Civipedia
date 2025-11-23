"use client";

import { useState } from "react";
import Image from 'next/image';
import AuthButtons from '../components/AuthButtons';
import useSession from '@/lib/hooks/useSession'

interface UserData {
  id: string;
  name: string;
  email: string;
}

export default function Dashboard() {
  const [query, setQuery] = useState("");
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);
  const [userData, setUserData] = useState<UserData | null>(null);
  const { user, isLoading } = useSession()

  // keep local typed alias for template
  const sessionUser = user as UserData | null

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

  const handleToolClick = (toolName: string) => {
    console.log(`Outil cliqué: ${toolName}`);
    // Fonctionnalité à implémenter ultérieurement
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Auth buttons moved to layout for server-side rendering */}

      <div className="w-full max-w-4xl">
        {/* Section d'affichage du logo Civipedia */}
        <div className="flex justify-center items-center -mb-4">
          <div className="w-50 h-50 relative">
            <Image
              src="/civipedia-logo.png"
              alt="Civipedia Logo"
              width={1812}
              height={474}
              className="rounded-lg"
              priority
              quality={100}
            />
          </div>
        </div>

        {/* Message de bienvenue avec les VRAIES données */}
        {sessionUser && (
          <div className="text-center mb-6">
            <p className="text-gray-600 text-lg">
              Bienvenue, <span className="font-semibold text-blue-600">{sessionUser.name}</span> !
            </p>
            <p className="text-gray-500 text-sm">
              {sessionUser.email}
            </p>
          </div>
        )}

        {/* Conteneur principal pour le formulaire et les résultats */}
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl p-8 border border-white/20">
          {/* Formulaire de recherche avec champ et bouton */}
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

          {/* BARRE D'OUTILS - MÊME QUE SUR LA PAGE D'ACCUEIL */}
          <div className="flex justify-center space-x-6 pt-4 border-t border-gray-200">
            {/* Bouton pour accéder aux modèles DIA */}
            <button 
              onClick={() => handleToolClick("Modèles DIA")}
              className="p-3 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-all duration-200 flex flex-col items-center"
            >
              <div className="w-6 h-6 mb-1">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <span className="text-xs">Modèles</span>
            </button>

            {/* Bouton pour consulter les sources */}
            <button 
              onClick={() => handleToolClick("Sources")}
              className="p-3 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-all duration-200 flex flex-col items-center"
            >
              <div className="w-6 h-6 mb-1">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
                </svg>
              </div>
              <span className="text-xs">Sources</span>
            </button>

            {/* Bouton pour ajouter un fichier */}
            <button 
              onClick={() => handleToolClick("Ajouter fichier")}
              className="p-3 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-all duration-200 flex flex-col items-center"
            >
              <div className="w-6 h-6 mb-1">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
                </svg>
              </div>
              <span className="text-xs">Fichier</span>
            </button>

            {/* Bouton pour la dictée vocale */}
            <button 
              onClick={() => handleToolClick("Dicter")}
              className="p-3 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-all duration-200 flex flex-col items-center"
            >
              <div className="w-6 h-6 mb-1">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
                  <path d="M19 10v2a7 7 0 01-14 0v-2" />
                  <line x1="12" y1="19" x2="12" y2="23" />
                  <line x1="8" y1="23" x2="16" y2="23" />
                </svg>
              </div>
              <span className="text-xs">Dicter</span>
            </button>
          </div>

          {/* Affichage de la réponse de l'API */}
          {response && (
            <div className="mt-6 p-6 bg-white rounded-2xl shadow-md border border-gray-100">
              <h2 className="font-semibold text-gray-900 text-lg mb-3">Réponse :</h2>
              <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{response}</p>
            </div>
          )}

          {/* Message pour les utilisateurs connectés */}
          {!response && (
            <div className="text-center pt-6">
              <p className="text-gray-500 text-sm">
                Utilisez le moteur de recherche pour explorer la base de connaissances Civipedia
              </p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}