'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { logout } from '@/app/actions/auth'

interface UserSession {
  id: string
  name: string
  email: string
}

export default function AuthButtons() {
  const [user, setUser] = useState<UserSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [showProfile, setShowProfile] = useState(false)

  useEffect(() => {
    async function checkAuth() {
      try {
        const response = await fetch('/api/auth/check')
        if (response.ok) {
          const userData = await response.json()
          setUser(userData)
        } else {
          setUser(null)
        }
      } catch (error) {
        console.error('Error checking auth:', error)
        setUser(null)
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [])

  const handleLogout = async () => {
    try {
      await logout()
      setUser(null)
      setShowProfile(false)
      window.location.href = '/'
    } catch (error) {
      console.error('Error during logout:', error)
    }
  }

  if (loading) {
    return <div className="w-12 h-12 bg-gray-200 rounded-full animate-pulse"></div>
  }

  if (user) {
    return (
      <div className="relative">
        <button 
          onClick={() => setShowProfile(!showProfile)}
          className="w-12 h-12 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-full flex items-center justify-center shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 font-semibold text-lg"
        >
          {user.name.charAt(0).toUpperCase()}
        </button>
        
        {/* Menu déroulant du profil - SIMPLIFIÉ */}
        {showProfile && (
          <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-gray-200 py-4 z-10">
            <div className="px-4 py-2 border-b border-gray-100">
              <p className="font-semibold text-gray-900">{user.name}</p>
              <p className="text-sm text-gray-600">{user.email}</p>
            </div>
            
            <div className="px-4 py-2">
              <Link 
                href="/profile"
                className="block text-sm text-gray-700 hover:text-gray-900 mb-3 font-medium"
                onClick={() => setShowProfile(false)}
              >
                👤 Mon profil complet
              </Link>
              <button 
                onClick={handleLogout}
                className="block text-sm text-red-600 hover:text-red-800 font-medium w-full text-left"
              >
                🚪 Déconnexion
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="flex space-x-4">
      <Link 
        href="/login"
        className="bg-white text-blue-600 border border-blue-600 px-6 py-3 rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 font-semibold text-sm hover:bg-blue-50"
      >
        Connexion
      </Link>
      <Link 
        href="/signup"
        className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 font-semibold text-sm"
      >
        Inscription
      </Link>
    </div>
  )
}