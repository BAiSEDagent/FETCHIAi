'use server'

import { revalidatePath } from 'next/cache'
import { and, eq, max, ne, sql } from 'drizzle-orm'
import { db, prompts } from '@/db'
import { requireAdmin } from '@/lib/admin'

/**
 * Create a NEW prompt version with the supplied content. Old versions remain.
 * If `setActive` is true, deactivate all other versions of this name and
 * activate the new one. Otherwise the new version is created inactive.
 *
 * Wrapped in a transaction with a per-name advisory lock so concurrent saves
 * cannot collide on the (name, version) unique index or leave multiple
 * active versions for the same name.
 */
export async function createPromptVersion(input: {
  name: string
  content: string
  modelTarget: string | null
  setActive: boolean
}) {
  const admin = await requireAdmin()

  await db.transaction(async (tx) => {
    // Serialize all writes for this prompt name for the duration of the txn.
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${'prompts:' + input.name}))`)

    const [{ maxVersion }] = await tx
      .select({ maxVersion: max(prompts.version) })
      .from(prompts)
      .where(eq(prompts.name, input.name))

    const nextVersion = (maxVersion ?? 0) + 1

    if (input.setActive) {
      await tx
        .update(prompts)
        .set({ isActive: false })
        .where(eq(prompts.name, input.name))
    }

    await tx.insert(prompts).values({
      name: input.name,
      version: nextVersion,
      content: input.content,
      modelTarget: input.modelTarget,
      isActive: input.setActive,
      trafficPercentage: 100,
      createdBy: admin.userId,
    })
  })

  revalidatePath('/admin/prompts')
  revalidatePath('/admin/agents')
}

/**
 * Make a specific prompt version the active one for its name. Atomic — wrapped
 * in a transaction with the same per-name advisory lock so it cannot interleave
 * with createPromptVersion or another activation. Verifies that `id` actually
 * belongs to `name` to prevent cross-family activation bugs.
 */
export async function activatePromptVersion(id: string, name: string) {
  await requireAdmin()

  await db.transaction(async (tx) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${'prompts:' + name}))`)

    const target = await tx.query.prompts.findFirst({
      where: (t, { eq: e, and: a }) => a(e(t.id, id), e(t.name, name)),
    })
    if (!target) {
      throw new Error('Prompt version not found for this slug')
    }

    await tx
      .update(prompts)
      .set({ isActive: false })
      .where(and(eq(prompts.name, name), ne(prompts.id, id)))

    await tx
      .update(prompts)
      .set({ isActive: true })
      .where(eq(prompts.id, id))
  })

  revalidatePath('/admin/prompts')
  revalidatePath('/admin/agents')
}
