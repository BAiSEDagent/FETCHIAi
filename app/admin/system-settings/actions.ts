'use server'

import { revalidatePath } from 'next/cache'
import { eq } from 'drizzle-orm'
import { db, systemSettings } from '@/db'
import { requireAdmin } from '@/lib/admin'

/**
 * Update a single system setting. Validates the supplied string value against
 * the column's declared `value_type` (number/boolean/json/string) server-side
 * so corrupt config can never be written even if a client bypasses our UI.
 */
export async function updateSystemSetting(key: string, value: string) {
  const admin = await requireAdmin()

  const existing = await db.query.systemSettings.findFirst({
    where: (t, { eq: e }) => e(t.key, key),
  })
  if (!existing) throw new Error(`Unknown setting "${key}"`)

  switch (existing.valueType) {
    case 'number':
      if (value.trim() === '' || !Number.isFinite(Number(value))) {
        throw new Error(`Setting "${key}" must be a number`)
      }
      break
    case 'boolean':
      if (!['true', 'false'].includes(value.trim().toLowerCase())) {
        throw new Error(`Setting "${key}" must be "true" or "false"`)
      }
      break
    case 'json':
      try { JSON.parse(value) }
      catch { throw new Error(`Setting "${key}" must be valid JSON`) }
      break
    case 'string':
      // Any string is valid; no-op
      break
    default:
      // Unknown value_type — accept as-is rather than blocking admins
      break
  }

  await db
    .update(systemSettings)
    .set({ value, updatedBy: admin.userId, updatedAt: new Date() })
    .where(eq(systemSettings.key, key))
  revalidatePath('/admin/system-settings')
}
