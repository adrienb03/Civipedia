import type { NextConfig } from "next";

// Configuration Next.js
// Fichier de configuration pour le serveur Next
const nextConfig: NextConfig = {
  images: {
    formats: ['image/avif', 'image/webp'],
    qualities: [100, 75], // ← Ajoutez cette ligne
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
  },
};

export default nextConfig;