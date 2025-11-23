"use client"

import type { ZodSchema } from 'zod'

// Hook: useFormValidation — validation Zod côté client
// Fonction pour valider un FormData et renvoyer les erreurs par champ
export default function useFormValidation(schema: ZodSchema<any>) {
  function validateForm(formData: FormData) {
    // Convertir FormData en objet JS simple pour validation Zod
    const obj = Object.fromEntries(formData.entries())
    // `safeParse` renvoie success=true ou l'objet d'erreurs
    const parsed = schema.safeParse(obj)
    if (parsed.success) {
      return { success: true, data: parsed.data, errors: {} as Record<string, string[]> }
    }
    const raw = parsed.error.flatten().fieldErrors
    // Normalize possible `undefined` entries into empty arrays so the
    // client code can always expect `string[]` values.
    const errors = Object.fromEntries(
      Object.entries(raw).map(([k, v]) => [k, (v ?? []) as string[]])
    ) as Record<string, string[]>
    return { success: false, errors }
  }

  return { validateForm }
}
