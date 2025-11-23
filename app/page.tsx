"use client";

import { useState } from "react";
import Image from 'next/image';
import AuthButtons from './components/AuthButtons';
import RagSearch from './components/RagSearch';

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

        {/* Conteneur principal pour le formulaire et les résultats */}
        <RagSearch />
      </div>
    </main>
  );
}