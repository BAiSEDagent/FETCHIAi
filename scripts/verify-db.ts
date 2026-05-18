/**
 * scripts/verify-db.ts
 * Checkpoint 1 verification — confirms `drizzle-kit push` + `tsx db/seed.ts`
 * produced the expected schema and seed data.
 *
 * Run:  npx tsx scripts/verify-db.ts
 *
 * Expected (from db/seed.ts):
 *   tables           = 41
 *   pricing_tiers    = 4   (Starter, Growth, Pro, Scale)
 *   agent_registry   = 10
 *   system_settings  >= 47
 *   email_templates  = 12
 *   prompts          = 6
 *   opportunities    = 5
 *   market_coverage  = 3
 */

import postgres from 'postgres'

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set — Replit should auto-inject this.')
  process.exit(1)
}

const sql = postgres(process.env.DATABASE_URL, { max: 1, idle_timeout: 5 })

const expected: Record<string, number | { min: number }> = {
  tables: 41,
  pricing_tiers: 4,
  agent_registry: 10,
  system_settings: { min: 47 },
  email_templates: 12,
  prompts: 6,
  opportunities: 5,
  market_coverage: 3,
}

async function main() {
  const [row] = await sql<
    {
      tables: number
      pricing_tiers: number
      agent_registry: number
      system_settings: number
      email_templates: number
      prompts: number
      opportunities: number
      market_coverage: number
    }[]
  >`
    SELECT
      (SELECT count(*) FROM information_schema.tables
        WHERE table_schema = 'public')::int                        AS tables,
      (SELECT count(*) FROM pricing_tiers)::int                    AS pricing_tiers,
      (SELECT count(*) FROM agent_registry)::int                   AS agent_registry,
      (SELECT count(*) FROM system_settings)::int                  AS system_settings,
      (SELECT count(*) FROM email_templates)::int                  AS email_templates,
      (SELECT count(*) FROM prompts)::int                          AS prompts,
      (SELECT count(*) FROM opportunities)::int                    AS opportunities,
      (SELECT count(*) FROM market_coverage)::int                  AS market_coverage
  `

  let failed = 0
  console.log('CP1 — Database verification\n')
  for (const [key, exp] of Object.entries(expected)) {
    const actual = (row as Record<string, number>)[key]
    let ok: boolean
    let expStr: string
    if (typeof exp === 'number') {
      ok = actual === exp
      expStr = String(exp)
    } else {
      ok = actual >= exp.min
      expStr = `>= ${exp.min}`
    }
    if (!ok) failed++
    console.log(
      `  ${ok ? '✓' : '✗'} ${key.padEnd(18)} actual=${String(actual).padEnd(4)} expected=${expStr}`
    )
  }

  await sql.end()

  if (failed > 0) {
    console.error(`\n${failed} check(s) failed.`)
    process.exit(1)
  }
  console.log('\nAll checks passed.')
}

main().catch(async (err) => {
  console.error(err)
  await sql.end()
  process.exit(1)
})
