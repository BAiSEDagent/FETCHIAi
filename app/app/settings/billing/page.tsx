import { requireWorkspaceContext } from '@/lib/workspace'
import { db } from '@/db'
import { MobileScreenHeader } from '@/components/app/MobileScreenHeader'
import { SettingsGroup, SettingsRow } from '@/components/app/SettingsGroup'

export const dynamic = 'force-dynamic'

export default async function BillingPage() {
  const ctx = await requireWorkspaceContext()
  const sub = await db.query.workspaceSubscriptions.findFirst({
    where: (t, { eq }) => eq(t.workspaceId, ctx.workspaceId),
  })
  const tier = sub?.tier ?? 'trial'
  const status = sub?.status ?? 'trialing'

  return (
    <div className="max-w-3xl">
      <MobileScreenHeader
        title="Plan & Billing"
        description="Stripe checkout, the billing portal, and top-ups land in Checkpoint 4."
      />
      <div className="px-4 lg:px-7 pb-10 space-y-3 lg:space-y-4">
        <SettingsGroup title="Current subscription">
          <SettingsRow
            label="Plan"
            value={
              <span className="font-outfit text-[17px] font-semibold text-text capitalize">
                {tier}
              </span>
            }
          />
          <SettingsRow
            label="Billing interval"
            value={
              <span className="text-[13.5px] text-text capitalize">
                {sub?.billingInterval ?? 'monthly'}
              </span>
            }
          />
          <SettingsRow
            label="Status"
            value={
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold border ${
                  status === 'active'
                    ? 'bg-ok/15 text-text2 border-ok/30'
                    : status === 'trialing'
                    ? 'bg-amber-50 text-amber-900 border-amber-200'
                    : 'bg-raised text-text/65 border-text/10'
                }`}
              >
                {status.replace(/_/g, ' ')}
              </span>
            }
          />
          {sub?.trialEndsAt && (
            <SettingsRow
              label="Trial ends"
              value={
                <span className="text-[13.5px] text-text">
                  {new Date(sub.trialEndsAt).toLocaleDateString()}
                </span>
              }
            />
          )}
        </SettingsGroup>
      </div>
    </div>
  )
}
