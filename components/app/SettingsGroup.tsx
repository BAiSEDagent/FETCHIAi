import * as React from 'react'
import { SectionCard } from './SectionCard'
import { cn } from '@/lib/utils'

type Props = {
  title: React.ReactNode
  description?: React.ReactNode
  actions?: React.ReactNode
  children: React.ReactNode
  className?: string
  mode?: 'form' | 'rows'
}

/**
 * A SectionCard preset for settings forms — children get consistent vertical
 * rhythm so label/input stacks read evenly without each form re-inventing
 * the spacing.
 */
export function SettingsGroup({
  title,
  description,
  actions,
  children,
  className,
  mode = 'form',
}: Props) {
  return (
    <div data-fetchi-settings-group-v5 data-fetchi-settings-mode={mode}>
      <SectionCard
        title={title}
        description={description}
        actions={actions}
        className={cn(className)}
        density="compact"
        bodyClassName={mode === 'rows' ? 'space-y-0' : 'space-y-4'}
      >
        {children}
      </SectionCard>
    </div>
  )
}

export function SettingsRow({
  label,
  value,
  hint,
}: {
  label: React.ReactNode
  value: React.ReactNode
  hint?: React.ReactNode
}) {
  return (
    <div
      data-fetchi-settings-row-v5
      className="flex min-h-[44px] items-center justify-between gap-3 py-3 border-t border-text/10 first:border-t-0"
    >
      <div className="min-w-0">
        <div className="text-[14px] font-medium leading-5 text-text">{label}</div>
        {hint && (
          <div className="mt-0.5 text-[12px] leading-[1.4] text-text/55">
            {hint}
          </div>
        )}
      </div>
      <div className="flex-shrink-0">{value}</div>
    </div>
  )
}
