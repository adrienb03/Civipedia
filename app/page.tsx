export default function Home() {
  return (
    <main style={{ padding: '2rem', fontFamily: 'Arial, sans-serif' }}>
      <h1> Civipedia - Test Next.js </h1>
      <p>Environnement Next.js fonctionnel !</p>
      
      <div style={{ marginTop: '2rem', padding: '1rem', background: '#f5f5f5', borderRadius: '8px' }}>
        <h2> Statut du projet :</h2>
        <ul>
          <li>Next.js 16.0.1 ✓</li>
          <li>Serveur local : http://localhost:3000 ✓</li>
          <li>Environnement de développement ✓</li>
        </ul>
      </div>

      <div style={{ marginTop: '2rem' }}>
        <h3>Prochaines étapes :</h3>
        <ol>
          <li>Configurer Qdrant</li>
          <li>Intégrer Mistral AI</li>
          <li>Créer le moteur de recherche</li>
        </ol>
      </div>
    </main>
  );
}
