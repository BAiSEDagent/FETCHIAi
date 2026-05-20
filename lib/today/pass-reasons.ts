export const TODAYS_RUN_PASS_REASONS = [
  'wrong_contact',
  'already_has_vendor',
  'too_small',
  'out_of_area',
  'bad_signal',
] as const

export type TodaysRunPassReason = (typeof TODAYS_RUN_PASS_REASONS)[number]
