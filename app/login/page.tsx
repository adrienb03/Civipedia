'use client'

import { login } from '@/app/actions/auth'
import { useActionState } from 'react'
import Link from 'next/link'
import Image from 'next/image'

export default function LoginPage() {
  const [state, action, pending] = useActionState(login, undefined)

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Bouton retour en haut à gauche */}
      <div className="absolute top-6 left-6">
        <Link 
          href="/"
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

        {/* Conteneur principal du formulaire */}
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl p-8 border border-white/20">
          <h1 className="text-3xl font-bold text-center text-gray-900 mb-2">
            Se connecter
          </h1>
          <p className="text-gray-600 text-center mb-8">
            Accédez à votre compte Civipedia
          </p>

          {state?.message && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4">
              {state.message}
            </div>
          )}

          <form action={action} className="space-y-6">
            {/* Champ Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Adresse email
              </label>
              <input 
                id="email" 
                name="email" 
                type="email"
                placeholder="votre@email.com" 
                className="w-full p-4 text-lg border-0 rounded-2xl bg-white shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition-all duration-200 text-gray-900 placeholder-gray-400"
                required
              />
            </div>

            {/* Champ Mot de passe */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Mot de passe
              </label>
              <input 
                id="password" 
                name="password" 
                type="password" 
                placeholder="Votre mot de passe"
                className="w-full p-4 text-lg border-0 rounded-2xl bg-white shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition-all duration-200 text-gray-900 placeholder-gray-400"
                required
              />
            </div>

            {/* Bouton de connexion */}
            <button 
              disabled={pending} 
              type="submit"
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4 rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-105 disabled:opacity-50 disabled:transform-none transition-all duration-200 font-semibold text-lg"
            >
              {pending ? "Connexion..." : "Se connecter"}
            </button>

            {/* Lien d'inscription */}
            <div className="text-center pt-4 border-t border-gray-200">
              <p className="text-gray-600">
                Pas encore de compte ?{' '}
                <Link 
                  href="/signup"
                  className="text-blue-600 hover:text-blue-800 font-semibold transition-colors duration-200"
                >
                  S'inscrire
                </Link>
              </p>
            </div>
          </form>
        </div>
      </div>
    </main>
  )
}