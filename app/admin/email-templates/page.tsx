import { db, emailTemplates } from '@/db'
import { asc, desc } from 'drizzle-orm'
import Link from 'next/link'
import { TemplateEditor } from './TemplateEditor'

export const dynamic = 'force-dynamic'

type SearchParams = { slug?: string }

export default async function AdminEmailTemplatesPage({
  searchParams,
}: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams
  const all = await db
    .select()
    .from(emailTemplates)
    .orderBy(asc(emailTemplates.slug), desc(emailTemplates.version))

  // Latest version per slug for list
  const seen = new Set<string>()
  const latestPerSlug = all.filter(t => {
    if (seen.has(t.slug)) return false
    seen.add(t.slug)
    return true
  })

  const selectedSlug = params.slug ?? latestPerSlug[0]?.slug ?? null
  const selected = selectedSlug
    ? all.find(t => t.slug === selectedSlug && t.isActive) ?? all.find(t => t.slug === selectedSlug)
    : null

  return (
    <div className="p-7 max-w-[1300px]">
      <div className="mb-5">
        <h1 className="font-outfit text-[22px] font-semibold">Email templates</h1>
        <p className="text-[12px] text-brand-near-black/55 mt-1">
          Editable email content with <code className="font-mono">&#123;&#123;variable&#125;&#125;</code> substitution.
          Resend reads these at send time.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-4">
        <aside className="bg-white border border-brand-near-black/10 rounded-[10px] overflow-hidden">
          <header className="px-3 py-2 bg-[#faf9f6] border-b border-brand-near-black/10 text-[11px] uppercase tracking-[0.08em] text-brand-near-black/55">
            Templates
          </header>
          <ul>
            {latestPerSlug.map(t => (
              <li key={t.slug}>
                <Link
                  href={`/admin/email-templates?slug=${encodeURIComponent(t.slug)}`}
                  className={`flex flex-col gap-0.5 px-3 py-2.5 min-h-[44px] border-b border-brand-near-black/5 text-[12px] ${
                    t.slug === selectedSlug
                      ? 'bg-brand-light text-brand-dark'
                      : 'hover:bg-[#faf9f6] text-brand-near-black/80'
                  }`}
                >
                  <span className="font-medium">{t.name}</span>
                  <span className="font-mono text-[10px] text-brand-near-black/45">{t.slug} v{t.version}</span>
                </Link>
              </li>
            ))}
            {latestPerSlug.length === 0 && (
              <li className="px-3 py-4 text-[12px] text-brand-near-black/50">No templates seeded.</li>
            )}
          </ul>
        </aside>

        <section className="bg-white border border-brand-near-black/10 rounded-[10px] p-5 min-h-[400px]">
          {selected ? (
            <TemplateEditor template={selected} />
          ) : (
            <div className="text-[13px] text-brand-near-black/55">
              Pick a template from the left.
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
