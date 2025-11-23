import * as z from 'zod'

export const SignupFormSchema = z.object({
  name: z
    .string()
    .min(2, { error: 'Le nom doit comporter au moins 2 caractères.' })
    .trim(),
  email: z.email({ error: 'Veuillez saisir une adresse e-mail valide.' }).trim(),
  password: z
    .string()
    .min(8, { error: 'Doit comporter au moins 8 caractères' })
    .regex(/[a-zA-Z]/, { error: 'Doit contenir au moins une lettre.' })
    .regex(/[0-9]/, { error: 'Doit contenir au moins un nombre.' })
    .regex(/[^a-zA-Z0-9]/, {
      error: 'Doit contenir au moins un caractère spécial.',
    })
    .trim(),
})

export const LoginFormSchema = z.object({
  email: z.email({ error: 'Veuillez saisir une adresse e-mail valide.' }).trim(),
  password: z
    .string()
    .min(8, { error: 'Doit comporter au moins 8 caractères' })
    .trim(),
})

export type FormState =
  | {
      errors?: {
        name?: string[]
        email?: string[]
        password?: string[]
      }
      message?: string
    }
  | undefined