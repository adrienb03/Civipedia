"use server"

import { db } from '@/db';
import { users } from '@/db/schema'
import { SignupFormSchema, LoginFormSchema, FormState } from '@/lib/definitions'
// Actions serveur: signup/login/logout/getSession
// Fonctions serveur pour gérer l'authentification et les cookies
import bcrypt from 'bcryptjs'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { eq } from 'drizzle-orm'
import { setAuthCookies, clearAuthCookies, getSessionFromCookieStore } from '@/lib/server/auth'

export async function signup(state: FormState, formData: FormData) {
  // Fonction pour créer un utilisateur et définir le cookie de session
  const validatedFields = SignupFormSchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
    password: formData.get('password'),
  })

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
    }
  }

  const { name, email, password } = validatedFields.data
  const hashedPassword = await bcrypt.hash(password, 10)

  try {
    const data = await db
      .insert(users)
      .values({
        name,
        email,
        password: hashedPassword,
      })
      .returning({ 
        id: users.id, 
        name: users.name, 
        email: users.email 
      })

    const user = data[0]

    if (!user) {
      return {
        message: 'An error occurred while creating your account.',
      }
    }

    const cookieStore = await cookies()
    // Mettre la cookie de session côté serveur (httpOnly)
    console.log('Server action signup: setting auth cookies for user', user.id)
    await setAuthCookies(cookieStore, user)

  } catch (error) {
    console.error('Error during signup:', error)
    return {
      message: 'An error occurred while creating your account.',
    }
  }

  redirect('/dashboard')
}

export async function login(state: FormState, formData: FormData) {
  const parsed = LoginFormSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  })

  if (!parsed.success) {
    return {
      errors: parsed.error.flatten().fieldErrors,
    }
  }

  const { email, password } = parsed.data

  try {
    const user = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toString()))
      .limit(1)

    if (user.length === 0) {
      return {
        message: 'Invalid email or password.',
      }
    }

    const isValidPassword = await bcrypt.compare(password.toString(), user[0].password)

    if (!isValidPassword) {
      return {
        message: 'Invalid email or password.',
      }
    }

    const cookieStore = await cookies()
    // Après vérification des identifiants, définir la cookie de session
    console.log('Server action login: setting auth cookies for user', user[0].id)
    await setAuthCookies(cookieStore, { id: user[0].id, name: user[0].name })

  } catch (error) {
    console.error('Error during login:', error)
    return {
      message: 'An error occurred during login.',
    }
  }

  redirect('/dashboard')
}

export async function getSession() {
  const cookieStore = await cookies()
  // returns user id or null
  return await getSessionFromCookieStore(cookieStore)
}

// CORRECTION : Fonction de déconnexion
export async function logout() {
  const cookieStore = await cookies()
  console.log('Server action logout: clearing auth cookies')
  await clearAuthCookies(cookieStore)
  redirect('/')
}