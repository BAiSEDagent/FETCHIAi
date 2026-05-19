'use server'

import { revalidatePath } from 'next/cache'
import { eq } from 'drizzle-orm'
import { db, systemSettings } from '@/db'
import { requireAdmin } from '@/lib/admin'

export async function updateSystemSetting(key: string, value: string) {
  const admin = await requireAdmin()
  await db
    .update(systemSettings)
    .set({ value, updatedBy: admin.userId, updatedAt: new Date() })
    .where(eq(systemSettings.key, key))
  revalidatePath('/admin/system-settings')
}
