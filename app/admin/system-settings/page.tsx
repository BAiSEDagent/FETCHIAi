import { db, systemSettings } from '@/db'
import { asc } from 'drizzle-orm'
import { SettingRow } from './SettingRow'

export const dynamic = 'force-dynamic'

export default async function AdminSystemSettingsPage() {
  const rows = await db
    .select()
    .from(systemSettings)
    .orderBy(asc(systemSettings.category), asc(systemSettings.key))

  const grouped = new Map<string, typeof rows>()
  for (const row of rows) {
    const arr = grouped.get(row.category) ?? []
    arr.push(row)
    grouped.set(row.category, arr)
  }

  return (
    <div className="p-7 max-w-[1100px]">
      <div className="mb-5">
        <h1 className="font-outfit text-[22px] font-semibold">System settings</h1>
        <p className="text-[12px] text-brand-near-black/55 mt-1">
          Global tunables. Code reads these at runtime with fallback defaults. Grouped by category.
        </p>
      </div>

      {Array.from(grouped.entries()).map(([category, items]) => (
        <section
          key={category}
          className="bg-white border border-brand-near-black/10 rounded-[10px] mb-4 overflow-hidden"
        >
          <header className="px-5 py-2.5 bg-[#faf9f6] border-b border-brand-near-black/10 flex items-center justify-between">
            <h2 className="font-outfit font-semibold text-[13px] uppercase tracking-[0.06em] text-brand-near-black/70">
              {category}
            </h2>
            <span className="text-[11px] text-brand-near-black/45">{items.length} settings</span>
          </header>
          <ul>
            {items.map(s => (
              <SettingRow key={s.key} setting={s} />
            ))}
          </ul>
        </section>
      ))}

      {rows.length === 0 && (
        <div className="text-[13px] text-brand-near-black/55 p-6 bg-white border border-brand-near-black/10 rounded">
          No system settings seeded. Run <code className="font-mono">npx tsx db/seed.ts</code>.
        </div>
      )}
    </div>
  )
}
