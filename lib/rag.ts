// app/lib/rag.ts

export async function runRAGPipeline(query: string) {
  // 1️⃣ Simule un petit corpus de documents
  const documents = [
    { id: 1, text: "Le ciel est bleu et le soleil brille." },
    { id: 2, text: "Next.js permet de créer des applications React facilement." },
    { id: 3, text: "Civipedia est un projet de moteur de recherche expérimental." },
  ];

  // 2️⃣ Simule la récupération du document le plus pertinent
  const doc = documents.find(d =>
    query.toLowerCase().includes(d.text.split(" ")[0].toLowerCase())
  );

  // 3️⃣ Génération simulée de la réponse
  const answer = doc
    ? `Pipeline RAG : j'ai trouvé un document pertinent -> "${doc.text}"`
    : `Pipeline RAG : aucun document pertinent trouvé pour "${query}"`;

  // 4️⃣ Petit délai pour simuler le traitement
  await new Promise(res => setTimeout(res, 500));

  return answer;
}
