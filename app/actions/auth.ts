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
    pseudo: formData.get('pseudo'),
    first_name: formData.get('first_name'),
    last_name: formData.get('last_name'),
    email: formData.get('email'),
    password: formData.get('password'),
    phone: formData.get('phone'),
    organization: formData.get('organization'),
  })

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
    }
  }

  const { pseudo, first_name, last_name, email, password, phone, organization } = validatedFields.data
  const hashedPassword = await bcrypt.hash(password, 10)
  // Normaliser l'email pour éviter les doublons causés par la casse/espaces
  const emailNormalized = (email || '').toString().trim().toLowerCase()

  try {
    // Conserver la compatibilité: on stocke aussi `name` comme combinaison prénom+nom
    const fullName = `${first_name} ${last_name}`
    // Vérifier si l'email est déjà utilisé (éviter violation de contrainte UNIQUE)
    const existing = await db
      .select()
      .from(users)
      .where(eq(users.email, emailNormalized))
      .limit(1)

    if (existing.length > 0) {
      return {
        message: 'This email is already registered. Did you mean to log in?'
      }
    }

    const data = await db
      .insert(users)
      .values({
        name: fullName,
        pseudo,
        first_name,
        last_name,
        email: emailNormalized,
        password: hashedPassword,
        phone: phone || null,
        organization: organization || null,
      })
      .returning({ 
        id: users.id, 
        name: users.name, 
        email: users.email,
        pseudo: users.pseudo,
        first_name: users.first_name,
        last_name: users.last_name,
        phone: users.phone,
        organization: users.organization,
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

  } catch (error: any) {
    // Si malgré la vérification préalable une contrainte UNIQUE est violée (race condition),
    // renvoyer un message lisible pour l'utilisateur.
    if (error && (error.code === 'SQLITE_CONSTRAINT_UNIQUE' || (error.message && error.message.includes('UNIQUE constraint failed: users.email')))) {
      console.error('Signup unique constraint (email) violated:', error)
      return {
        message: 'This email is already registered. Did you mean to log in?'
      }
    }

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
    // Normaliser l'email comme lors du signup (lowercase + trim)
    const emailNormalized = (email || '').toString().trim().toLowerCase()

    const user = await db
      .select()
      .from(users)
      .where(eq(users.email, emailNormalized))
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