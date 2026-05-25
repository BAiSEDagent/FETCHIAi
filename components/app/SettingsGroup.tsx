import * as React from 'react'
import { SectionCard } from './SectionCard'
import { cn } from '@/lib/utils'

type Props = {
  title: React.ReactNode
  description?: React.ReactNode
  actions?: React.ReactNode
  children: React.ReactNode
  className?: string
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
}: Props) {
  return (
    <SectionCard
      title={title}
      description={description}
      actions={actions}
      className={cn(className)}
      bodyClassName="space-y-4"
    >
      {children}
    </SectionCard>
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
    <div className="flex items-center justify-between gap-3 py-1.5">
      <div className="min-w-0">
        <div className="text-[13.5px] text-text">{label}</div>
        {hint && (
          <div className="text-[12px] text-text/55 mt-0.5">
            {hint}
          </div>
        )}
      </div>
      <div className="flex-shrink-0">{value}</div>
    </div>
  )
}
