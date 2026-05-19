import { db, prompts } from '@/db'
import { asc, desc } from 'drizzle-orm'
import Link from 'next/link'
import { PromptEditor } from './PromptEditor'
import { ActivateButton } from './ActivateButton'

export const dynamic = 'force-dynamic'

type SearchParams = { name?: string }

export default async function AdminPromptsPage({
  searchParams,
}: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams
  const all = await db
    .select()
    .from(prompts)
    .orderBy(asc(prompts.name), desc(prompts.version))

  const names = Array.from(new Set(all.map(p => p.name)))
  const selectedName = params.name ?? names[0] ?? null
  const versions = selectedName ? all.filter(p => p.name === selectedName) : []
  const activeForSelected = versions.find(v => v.isActive) ?? versions[0]

  return (
    <div className="p-7 max-w-[1300px]">
      <div className="mb-5">
        <h1 className="font-outfit text-[22px] font-semibold">Prompts</h1>
        <p className="text-[12px] text-brand-near-black/55 mt-1">
          Versioned prompt store. Saving creates a new version row; old versions are preserved.
          Only one version per name is active at a time.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-4">
        <aside className="bg-white border border-brand-near-black/10 rounded-[10px] overflow-hidden">
          <header className="px-3 py-2 bg-[#faf9f6] border-b border-brand-near-black/10 text-[11px] uppercase tracking-[0.08em] text-brand-near-black/55">
            Prompt slugs
          </header>
          <ul>
            {names.map(name => {
              const versionsForName = all.filter(p => p.name === name)
              const active = versionsForName.find(v => v.isActive)
              return (
                <li key={name}>
                  <Link
                    href={`/admin/prompts?name=${encodeURIComponent(name)}`}
                    className={`flex flex-col gap-0.5 px-3 py-2.5 min-h-[44px] border-b border-brand-near-black/5 text-[12px] ${
                      name === selectedName
                        ? 'bg-brand-light text-brand-dark'
                        : 'hover:bg-[#faf9f6] text-brand-near-black/80'
                    }`}
                  >
                    <span className="font-mono">{name}</span>
                    <span className="text-[10px] text-brand-near-black/50">
                      {versionsForName.length} version{versionsForName.length === 1 ? '' : 's'} ·
                      active v{active?.version ?? '—'}
                    </span>
                  </Link>
                </li>
              )
            })}
            {names.length === 0 && (
              <li className="px-3 py-4 text-[12px] text-brand-near-black/50">No prompts seeded.</li>
            )}
          </ul>
        </aside>

        <section className="space-y-4">
          {activeForSelected ? (
            <>
              <PromptEditor active={activeForSelected} />
              <div className="bg-white border border-brand-near-black/10 rounded-[10px] overflow-hidden">
                <header className="px-4 py-2.5 bg-[#faf9f6] border-b border-brand-near-black/10 text-[12px] font-medium">
                  Version history — <span className="font-mono">{selectedName}</span>
                </header>
                <ul className="divide-y divide-brand-near-black/5">
                  {versions.map(v => (
                    <li key={v.id} className="px-4 py-3 flex items-center gap-3 text-[12px]">
                      <span className="font-mono text-brand-near-black/65 w-12">v{v.version}</span>
                      <span className="font-mono text-[11px] text-brand-near-black/45">
                        {v.modelTarget ?? '—'}
                      </span>
                      <span className="text-brand-near-black/55 flex-1 truncate">
                        {v.content.slice(0, 100).replace(/\s+/g, ' ')}…
                      </span>
                      <span className="text-[10px] text-brand-near-black/40">
                        {v.createdAt ? new Date(v.createdAt).toLocaleDateString() : '—'}
                      </span>
                      {v.isActive ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-brand-light text-brand-dark">
                          Active
                        </span>
                      ) : (
                        <ActivateButton id={v.id} name={v.name} />
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            </>
          ) : (
            <div className="bg-white border border-brand-near-black/10 rounded-[10px] p-6 text-[13px] text-brand-near-black/55">
              Select a prompt to view and edit.
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
