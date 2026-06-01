export type EvidenceKind =
  | 'storm'
  | 'property'
  | 'permit'
  | 'ownership'
  | 'market'
  | 'other'

export type EvidenceItem = {
  id: string
  kind: EvidenceKind
  /** Bold one-liner shown on the back of card. */
  title: string
  /** Short suffix shown after the kind label on the front chip,
   *  e.g. "MAY 14", "2007", "SOS". Null = render kind label only. */
  chipSuffix: string | null
  sourceDomain: string | null
  recencyLabel: string | null
  /** Detail line shown on the back of card under the title. */
  detailLine: string | null
  /** 0-100. Drives the confidence dots on the back evidence row. */
  confidence: number
  accent: 'green' | 'blue'
}

export type ContactItem = {
  name: string
  title: string | null
  email: string | null
  phone: string | null
  confidence: number // 0-100
  isBest: boolean
}

export type DraftPreview = {
  subjectLine: string | null
  bodyFirstLines: string
}

export type TodayRunCardData = {
  opportunityId: string
  score: number
  signalType: string | null
  signalLabel: string
  signalToken: string | null
  signalAgeLabel: string | null
  /** Previous status, captured for undo */
  status: 'new' | 'saved'
  /** Previous outcome_notes value, captured for undo */
  outcomeNotesSnapshot: string | null
  businessName: string
  cityState: string | null
  vertical: string | null
  squareFootageLabel: string | null
  claimStatusLabel: string | null
  reason: string | null
  evidence: EvidenceItem[]
  contacts: ContactItem[]
  draftPreview: DraftPreview | null
}
