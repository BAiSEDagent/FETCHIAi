import { and, desc, eq } from 'drizzle-orm'
import { cache } from 'react'
import { db, prompts } from '@/db'

export interface ActivePrompt {
  id: string
  name: string
  version: number
  content: string
  modelTarget: string | null
}

/**
 * Loads the active prompt for a given name (slug).
 * Wrapped in React `cache()` so repeated lookups within the same request
 * hit a request-scoped cache instead of re-querying Postgres.
 *
 * If multiple versions are marked active (A/B test), returns the highest version.
 */
export const getActivePrompt = cache(
  async (name: string): Promise<ActivePrompt | null> => {
    const rows = await db
      .select({
        id: prompts.id,
        name: prompts.name,
        version: prompts.version,
        content: prompts.content,
        modelTarget: prompts.modelTarget,
      })
      .from(prompts)
      .where(and(eq(prompts.name, name), eq(prompts.isActive, true)))
      .orderBy(desc(prompts.version))
      .limit(1)
    return rows[0] ?? null
  },
)

/**
 * Substitutes `{variable}` placeholders in a prompt template.
 * Missing keys are left as-is so the operator can spot them in logs.
 */
export function renderPrompt(template: string, vars: Record<string, string | number | null | undefined>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => {
    const v = vars[key]
    if (v === undefined || v === null) return `{${key}}`
    return String(v)
  })
}
