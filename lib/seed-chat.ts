/**
 * Static seed conversation for the chat screen.
 * The live `conversations`/`messages` tables land in CP5/CP6 alongside the
 * conversation agent. Until then, the chat screen renders this deterministic
 * thread so the UX, layout, and interactions are testable end-to-end.
 */

export type ChatRole = 'user' | 'assistant'

export type ChatLeadCard = {
  opportunityId: string
  businessName: string
  signalLabel: string
  score: number
}

export type ChatMessage = {
  id: string
  role: ChatRole
  content: string
  createdAt: string
  leads?: ChatLeadCard[]
}

export const SEEDED_CHAT_MESSAGES: ChatMessage[] = [
  {
    id: 'm1',
    role: 'assistant',
    content:
      "Morning — I scouted Dallas–Fort Worth overnight. Tuesday's hail event in the Irving/Las Colinas corridor lit up some strong commercial roofing signals. Want to see the top five?",
    createdAt: '2026-05-18T06:14:00Z',
  },
  {
    id: 'm2',
    role: 'user',
    content: 'Yeah, show me anything tied to the Irving storm.',
    createdAt: '2026-05-18T06:15:00Z',
  },
  {
    id: 'm3',
    role: 'assistant',
    content:
      'Two stand out — both flat-roof commercial complexes inside the hail footprint. Parkview is the cleanest opportunity; their property manager is reachable and they own the whole site.',
    createdAt: '2026-05-18T06:15:08Z',
    leads: [
      {
        opportunityId: '40000000-0000-0000-0000-000000000001',
        businessName: 'Parkview Office Complex',
        signalLabel: '1.8" hail · Irving TX · 3 days ago',
        score: 94,
      },
      {
        opportunityId: '40000000-0000-0000-0000-000000000002',
        businessName: 'Addison Corporate Park',
        signalLabel: '1.8" hail · Addison TX · 3 days ago',
        score: 88,
      },
    ],
  },
  {
    id: 'm4',
    role: 'user',
    content: 'Draft the outreach for Parkview.',
    createdAt: '2026-05-18T06:16:00Z',
  },
  {
    id: 'm5',
    role: 'assistant',
    content:
      "Draft is ready under Parkview's lead profile — short, references the hail event, and asks Michael Torres (property manager) for a 30-minute inspection slot this week. Want me to tighten the subject line?",
    createdAt: '2026-05-18T06:16:09Z',
  },
]

export const PLACEHOLDER_REPLY =
  "I'm holding off on a live answer until the conversation agent is wired up (Checkpoint 6). Your message was saved locally — try the seeded leads in the meantime."
