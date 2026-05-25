'use server'

import { revalidatePath } from 'next/cache'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { db, workspaceSettings, serviceProfiles } from '@/db'
import { requireWorkspaceContext } from '@/lib/workspace'

// Website is optional — accepts bare domain or full URL, blank stored as null.
const websiteField = z
  .string()
  .trim()
  .max(255)
  .optional()
  .nullable()
  .transform(v => (v && v.length > 0 ? v : null))
  .refine(
    v => v === null || /^([a-z][a-z0-9+\-.]*:\/\/)?[^\s]+\.[^\s]+$/i.test(v),
    { message: 'Enter a valid website (e.g. example.com or https://example.com)' },
  )

const profileSchema = z.object({
  businessName: z.string().min(1).max(120),
  vertical: z.enum(['roofing', 'cleaning', 'hvac', 'landscaping', 'events', 'other']),
  serviceDescription: z.string().max(4000).optional().nullable(),
  locationCity: z.string().min(1).max(80),
  locationState: z.string().min(2).max(40),
  locationRadiusMiles: z.coerce.number().int().min(5).max(500),
  idealCustomerDescription: z.string().max(4000).optional().nullable(),
  website: websiteField,
})

export async function saveBusinessProfile(input: unknown) {
  const data = profileSchema.parse(input)
  const ctx = await requireWorkspaceContext()
  const ws = ctx.workspaceId

  await db
    .update(workspaceSettings)
    .set({ businessName: data.businessName, updatedAt: new Date() })
    .where(eq(workspaceSettings.workspaceId, ws))

  const existing = await db.query.serviceProfiles.findFirst({
    where: (t, { eq: e }) => e(t.workspaceId, ws),
  })

  if (existing) {
    await db
      .update(serviceProfiles)
      .set({
        vertical: data.vertical,
        serviceDescription: data.serviceDescription ?? null,
        locationCity: data.locationCity,
        locationState: data.locationState.toUpperCase(),
        locationRadiusMiles: data.locationRadiusMiles,
        idealCustomerDescription: data.idealCustomerDescription ?? null,
        website: data.website,
        updatedAt: new Date(),
      })
      .where(eq(serviceProfiles.id, existing.id))
  } else {
    await db.insert(serviceProfiles).values({
      workspaceId: ws,
      vertical: data.vertical,
      serviceDescription: data.serviceDescription ?? null,
      locationCity: data.locationCity,
      locationState: data.locationState.toUpperCase(),
      locationRadiusMiles: data.locationRadiusMiles,
      idealCustomerDescription: data.idealCustomerDescription ?? null,
      website: data.website,
    })
  }

  revalidatePath('/app/settings/profile')
  revalidatePath('/app')
  return { ok: true as const }
}
