'use server'

import { revalidatePath } from 'next/cache'
import { eq } from 'drizzle-orm'
import { db, emailTemplates } from '@/db'
import { requireAdmin } from '@/lib/admin'

export async function updateEmailTemplate(input: {
  id: string
  name: string
  subject: string
  bodyHtml: string
  bodyText: string
  isActive: boolean
}) {
  const admin = await requireAdmin()
  await db
    .update(emailTemplates)
    .set({
      name: input.name,
      subject: input.subject,
      bodyHtml: input.bodyHtml,
      bodyText: input.bodyText,
      isActive: input.isActive,
      updatedBy: admin.userId,
      updatedAt: new Date(),
    })
    .where(eq(emailTemplates.id, input.id))
  revalidatePath('/admin/email-templates')
}
