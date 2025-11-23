"use client"

import type { ZodSchema } from 'zod'

export default function useFormValidation(schema: ZodSchema<any>) {
  function validateForm(formData: FormData) {
    const obj = Object.fromEntries(formData.entries())
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
