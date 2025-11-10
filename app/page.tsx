"use client";

import { useState } from "react";

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
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-gray-50">
      <div className="w-full max-w-2xl bg-white shadow-md rounded-2xl p-6">
        <h1 className="text-3xl font-bold mb-6 text-center">Civipedia 🔍</h1>

        <form onSubmit={handleSearch} className="flex space-x-3">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Pose ta question ici..."
            className="flex-grow p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 text-white px-5 py-3 rounded-xl hover:bg-blue-700 disabled:bg-gray-400"
          >
            {loading ? "Recherche..." : "Rechercher"}
          </button>
        </form>

        {response && (
          <div className="mt-6 p-4 bg-gray-100 rounded-lg">
            <h2 className="font-semibold text-lg mb-2">Réponse :</h2>
            <p>{response}</p>
          </div>
        )}
      </div>
    </main>
  );
}

