"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import useSession from '@/lib/hooks/useSession'

interface UserData {
  id: string
  name: string
  email: string
}

export default function ProfilePage() {
  const [user, setUser] = useState<UserData | null>(null)
  const router = useRouter()
  const { user: sessionUser, isLoading, error } = useSession()

  useEffect(() => {
    if (!isLoading) {
      if (!sessionUser) {
        router.push('/login')
      } else {
        setUser(sessionUser as UserData)
      }
    }
  }, [isLoading, sessionUser, router])

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement de votre profil...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null // La redirection est gérée dans le useEffect
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Bouton retour en haut à gauche */}
      <div className="absolute top-6 left-6">
        <Link 
          href="/dashboard"
          className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 font-semibold text-sm"
        >
          ← Retour
        </Link>
      </div>

      <div className="w-full max-w-md">
        {/* Section du logo Civipedia */}
        <div className="flex justify-center items-center mb-8">
          <div className="w-40 h-40 relative">
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

        {/* Conteneur principal du profil */}
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl p-8 border border-white/20">
          <h1 className="text-3xl font-bold text-center text-gray-900 mb-2">
            Mon Profil
          </h1>
          <p className="text-gray-600 text-center mb-8">
            Informations de votre compte
          </p>

          {/* Carte des informations utilisateur */}
          <div className="space-y-6">
            {/* Photo de profil */}
            <div className="flex justify-center">
              <div className="w-24 h-24 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-full flex items-center justify-center text-2xl font-bold shadow-lg">
                {user.name.charAt(0).toUpperCase()}
              </div>
            </div>

            {/* Informations */}
            <div className="space-y-4">
              <div className="bg-white rounded-2xl p-4 shadow-md border border-gray-100">
                <label className="block text-sm font-medium text-gray-500 mb-1">
                  Nom complet
                </label>
                <p className="text-lg font-semibold text-gray-900">{user.name}</p>
              </div>

              <div className="bg-white rounded-2xl p-4 shadow-md border border-gray-100">
                <label className="block text-sm font-medium text-gray-500 mb-1">
                  Adresse email
                </label>
                <p className="text-lg font-semibold text-gray-900">{user.email}</p>
              </div>

              <div className="bg-white rounded-2xl p-4 shadow-md border border-gray-100">
                <label className="block text-sm font-medium text-gray-500 mb-1">
                  ID utilisateur
                </label>
                <p className="text-lg font-semibold text-gray-900">{user.id}</p>
              </div>
            </div>

            {/* Boutons d'action */}
            <div className="flex space-x-4 pt-4">
              <Link 
                href="/dashboard"
                className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-center py-3 rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 font-semibold"
              >
                Retour au tableau de bord
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}