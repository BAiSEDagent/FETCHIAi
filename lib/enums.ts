/**
 * Safe narrowing helpers for string enum columns. The DB stores these as
 * plain `text`, so consumers must validate before passing them to UI props
 * that expect strict unions.
 */

export type Vertical =
  | 'roofing'
  | 'cleaning'
  | 'hvac'
  | 'landscaping'
  | 'events'
  | 'other'

const VERTICALS: readonly Vertical[] = [
  'roofing',
  'cleaning',
  'hvac',
  'landscaping',
  'events',
  'other',
] as const

export function parseVertical(input: string | null | undefined): Vertical | null {
  if (!input) return null
  return (VERTICALS as readonly string[]).includes(input) ? (input as Vertical) : null
}

export type ScoutMode = 'off' | 'once_daily' | 'three_daily' | 'custom'

const SCOUT_MODES: readonly ScoutMode[] = [
  'off',
  'once_daily',
  'three_daily',
  'custom',
] as const

export function parseScoutMode(
  input: string | null | undefined,
): ScoutMode | null {
  if (!input) return null
  return (SCOUT_MODES as readonly string[]).includes(input)
    ? (input as ScoutMode)
    : null
}

/** Best-effort message extractor for thrown values typed as `unknown`. */
export function errorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message) return err.message
  if (typeof err === 'string') return err
  if (err && typeof err === 'object' && 'message' in err) {
    const m = (err as { message?: unknown }).message
    if (typeof m === 'string') return m
  }
  return fallback
}
