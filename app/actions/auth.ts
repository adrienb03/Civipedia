'use server'

import { db } from '@/db';
import { users } from '@/db/schema'
import { SignupFormSchema, FormState } from '@/lib/definitions'
import bcrypt from 'bcryptjs'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { eq } from 'drizzle-orm'

export async function signup(state: FormState, formData: FormData) {
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
    cookieStore.set('user_id', user.id.toString(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    })

    cookieStore.set('user_name', user.name, {
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    })

  } catch (error) {
    console.error('Error during signup:', error)
    return {
      message: 'An error occurred while creating your account.',
    }
  }

  redirect('/dashboard')
}

export async function login(state: FormState, formData: FormData) {
  const email = formData.get('email')
  const password = formData.get('password')

  if (!email || !password) {
    return {
      message: 'Email and password are required.',
    }
  }

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
    cookieStore.set('user_id', user[0].id.toString(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    })

    cookieStore.set('user_name', user[0].name, {
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    })

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
  const userId = cookieStore.get('user_id')?.value
  const userName = cookieStore.get('user_name')?.value

  if (!userId || !userName) {
    return null
  }

  return {
    id: userId,
    name: userName,
  }
}

// CORRECTION : Fonction de déconnexion
export async function logout() {
  'use server'
  
  const cookieStore = await cookies()
  cookieStore.delete('user_id')
  cookieStore.delete('user_name')
  redirect('/')
}