import * as z from 'zod'

// Définitions: schémas Zod pour les formulaires
// Fonction pour valider les données de signup/login côté client et serveur
export const SignupFormSchema = z.object({
  // Pseudo (nom d'utilisateur) — requis
  pseudo: z
    .string()
    .min(2, { error: 'Le pseudo doit comporter au moins 2 caractères.' })
    .trim(),
  // Prénom et nom — requis
  first_name: z.string().min(1, { error: 'Veuillez saisir votre prénom.' }).trim(),
  last_name: z.string().min(1, { error: 'Veuillez saisir votre nom.' }).trim(),
  // Champ `email` : adresse e-mail valide
  email: z.email({ error: 'Veuillez saisir une adresse e-mail valide.' }).trim(),
  // Champ `password` : règles minimales de complexité
  password: z
    .string()
    .min(8, { error: 'Doit comporter au moins 8 caractères' })
    .regex(/[a-zA-Z]/, { error: 'Doit contenir au moins une lettre.' })
    .regex(/[0-9]/, { error: 'Doit contenir au moins un nombre.' })
    .regex(/[^a-zA-Z0-9]/, {
      error: 'Doit contenir au moins un caractère spécial.',
    })
    .trim(),
  // Champs optionnels
  // Les champs optionnels ne peuvent pas appeler `.trim()` directement
  // après `optional()`/`nullable()` dans cette version de Zod. On utilise
  // une transformation pour appliquer `trim()` seulement si la valeur est une string.
  phone: z
    .string()
    .optional()
    .nullable()
    .transform((v) => (typeof v === 'string' ? v.trim() : v)),
  organization: z
    .string()
    .optional()
    .nullable()
    .transform((v) => (typeof v === 'string' ? v.trim() : v)),
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
        pseudo?: string[]
        first_name?: string[]
        last_name?: string[]
        email?: string[]
        password?: string[]
      }
      message?: string
    }
  | undefined