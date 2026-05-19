'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import {
  db,
  workspaceSettings,
  serviceProfiles,
  scoutSchedules,
  workspaceLearning,
} from '@/db'
import { requireWorkspaceContext, setOnboardingStep } from '@/lib/workspace'

const stepSchema = z.object({
  vertical: z.enum(['roofing', 'cleaning', 'hvac', 'landscaping', 'events', 'other']).optional(),
  businessName: z.string().min(1).max(120).optional(),
  locationCity: z.string().min(1).max(80).optional(),
  locationState: z.string().min(2).max(40).optional(),
  locationRadiusMiles: z.number().int().min(5).max(500).optional(),
  idealCustomerDescription: z.string().min(1).max(2000).optional(),
  scoutMode: z.enum(['off', 'once_daily', 'three_daily', 'custom']).optional(),
})

async function upsertServiceProfile(
  workspaceId: string,
  patch: Partial<typeof serviceProfiles.$inferInsert>,
) {
  const existing = await db.query.serviceProfiles.findFirst({
    where: (t, { eq: e }) => e(t.workspaceId, workspaceId),
  })
  if (existing) {
    await db
      .update(serviceProfiles)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(serviceProfiles.id, existing.id))
  } else {
    await db.insert(serviceProfiles).values({
      workspaceId,
      ...patch,
    })
  }
}

export async function saveOnboardingStep(input: unknown) {
  const data = stepSchema.parse(input)
  const ctx = await requireWorkspaceContext()
  const ws = ctx.workspaceId

  if (data.vertical || data.businessName) {
    await upsertServiceProfile(ws, {
      vertical: data.vertical,
    })
    if (data.businessName) {
      await db
        .update(workspaceSettings)
        .set({ businessName: data.businessName, updatedAt: new Date() })
        .where(eq(workspaceSettings.workspaceId, ws))
    }
    await setOnboardingStep(ws, 1)
  }

  if (data.locationCity || data.locationState || data.locationRadiusMiles) {
    await upsertServiceProfile(ws, {
      locationCity: data.locationCity,
      locationState: data.locationState,
      locationRadiusMiles: data.locationRadiusMiles ?? 50,
    })
    await setOnboardingStep(ws, 2)
  }

  if (data.idealCustomerDescription) {
    await upsertServiceProfile(ws, {
      idealCustomerDescription: data.idealCustomerDescription,
    })
    // Seed the workspace_learning prompt-injection context from the
    // onboarding answers. The learning agent will replace this string as
    // real outcomes accrue (CP6), but having an initial context means every
    // agent prompt is grounded from day one.
    const sp = await db.query.serviceProfiles.findFirst({
      where: (t, { eq: e }) => e(t.workspaceId, ws),
    })
    const ws_row = await db.query.workspaceSettings.findFirst({
      where: (t, { eq: e }) => e(t.workspaceId, ws),
    })
    const learningContext = [
      ws_row?.businessName ? `Business: ${ws_row.businessName}` : null,
      sp?.vertical ? `Vertical: ${sp.vertical}` : null,
      sp?.locationCity || sp?.locationState
        ? `Service area: ${[sp?.locationCity, sp?.locationState].filter(Boolean).join(', ')}${
            sp?.locationRadiusMiles ? ` (${sp.locationRadiusMiles} mi radius)` : ''
          }`
        : null,
      `Ideal customer: ${data.idealCustomerDescription}`,
      'Outcomes counted: 0 (onboarding seed)',
    ]
      .filter(Boolean)
      .join('\n')
    await db
      .insert(workspaceLearning)
      .values({
        workspaceId: ws,
        learningContext,
        outcomesCounted: 0,
      })
      .onConflictDoUpdate({
        target: workspaceLearning.workspaceId,
        set: { learningContext, updatedAt: new Date() },
      })
    await setOnboardingStep(ws, 3)
  }

  if (data.scoutMode) {
    const cron =
      data.scoutMode === 'once_daily'
        ? ['0 7 * * *']
        : data.scoutMode === 'three_daily'
          ? ['0 7,12,17 * * *']
          : []
    const existing = await db.query.scoutSchedules.findFirst({
      where: (t, { eq: e }) => e(t.workspaceId, ws),
    })
    if (existing) {
      await db
        .update(scoutSchedules)
        .set({ mode: data.scoutMode, cronExpressions: cron, updatedAt: new Date() })
        .where(eq(scoutSchedules.workspaceId, ws))
    } else {
      await db.insert(scoutSchedules).values({
        workspaceId: ws,
        mode: data.scoutMode,
        cronExpressions: cron,
        timezone: 'UTC',
      })
    }
    await setOnboardingStep(ws, 4)
  }

  revalidatePath('/app')
  return { ok: true as const }
}

export async function completeOnboarding() {
  const ctx = await requireWorkspaceContext()
  await setOnboardingStep(ctx.workspaceId, 4)
  revalidatePath('/app')
  redirect('/app/chat')
}
