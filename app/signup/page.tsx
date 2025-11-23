"use client"

// Page: Signup — formulaire d'inscription
// Fonction pour créer un nouvel utilisateur et définir la session
import { signup } from '@/app/actions/auth'
import { useActionState, startTransition } from 'react'
import { useState } from 'react'
import { SignupFormSchema } from '@/lib/definitions'
import useFormValidation from '@/lib/hooks/useFormValidation'
import Link from 'next/link'
import Image from 'next/image'

export default function SignupPage() {
  const [state, action, pending] = useActionState(signup, undefined)
  const [clientErrors, setClientErrors] = useState<Record<string, string[]>>({})

  const { validateForm } = useFormValidation(SignupFormSchema)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const formData = new FormData(form)
    // Valider le formulaire côté client avec Zod
    const parsed = validateForm(formData)

    if (!parsed.success) {
      // Afficher les erreurs client si nécessaire
      setClientErrors(parsed.errors)
      return
    }

    // Si tout est OK, effacer les erreurs et appeler l'action serveur
    setClientErrors({})
    // Appel de l'action serveur dans une transition (mise à jour non bloquante)
    startTransition(() => {
      void action(formData)
    })
  }

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
            Créer un compte
          </h1>
          <p className="text-gray-600 text-center mb-8">
            Rejoignez Civipedia dès aujourd'hui
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Champ Nom */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                Nom complet
              </label>
              <input 
                id="name" 
                name="name" 
                placeholder="Votre nom complet" 
                className="w-full p-4 text-lg border-0 rounded-2xl bg-white shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition-all duration-200 text-gray-900 placeholder-gray-400"
              />
              {clientErrors?.name && (
                <p className="text-red-500 text-sm mt-2 ml-2">{clientErrors.name}</p>
              )}
              {state?.errors?.name && (
                <p className="text-red-500 text-sm mt-2 ml-2">{state.errors.name}</p>
              )}
            </div>

            {/* Champ Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Adresse email
              </label>
              <input 
                id="email" 
                name="email" 
                placeholder="votre@email.com" 
                className="w-full p-4 text-lg border-0 rounded-2xl bg-white shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition-all duration-200 text-gray-900 placeholder-gray-400"
              />
              {clientErrors?.email && (
                <p className="text-red-500 text-sm mt-2 ml-2">{clientErrors.email}</p>
              )}
              {state?.errors?.email && (
                <p className="text-red-500 text-sm mt-2 ml-2">{state.errors.email}</p>
              )}
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
              />
              {clientErrors?.password && (
                <div className="text-red-500 text-sm mt-2 ml-2">
                  <p className="font-medium mb-1">Le mot de passe doit :</p>
                  <ul className="list-disc list-inside space-y-1">
                    {clientErrors.password.map((error) => (
                      <li key={error}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}
              {state?.errors?.password && (
                <div className="text-red-500 text-sm mt-2 ml-2">
                  <p className="font-medium mb-1">Le mot de passe doit :</p>
                  <ul className="list-disc list-inside space-y-1">
                    {state.errors.password.map((error) => (
                      <li key={error}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Bouton d'inscription */}
            <button 
              disabled={pending} 
              type="submit"
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4 rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-105 disabled:opacity-50 disabled:transform-none transition-all duration-200 font-semibold text-lg"
            >
              {pending ? "Création du compte..." : "S'inscrire"}
            </button>

            {/* Lien de connexion */}
            <div className="text-center pt-4 border-t border-gray-200">
              <p className="text-gray-600">
                Déjà un compte ?{' '}
                <Link 
                  href="/login"
                  className="text-blue-600 hover:text-blue-800 font-semibold transition-colors duration-200"
                >
                  Se connecter
                </Link>
              </p>
            </div>
          </form>
        </div>
      </div>
    </main>
  )
}