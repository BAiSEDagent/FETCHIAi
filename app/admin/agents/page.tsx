import { db, agentRegistry, prompts } from '@/db'
import { asc } from 'drizzle-orm'
import { AgentRow } from './AgentRow'

export const dynamic = 'force-dynamic'

const PROVIDERS = ['anthropic', 'openai', 'google', 'groq', 'together', 'custom'] as const

export default async function AdminAgentsPage() {
  const [agents, promptList] = await Promise.all([
    db.select().from(agentRegistry).orderBy(asc(agentRegistry.slug)),
    // Show every prompt slug — even ones whose active version hasn't been
    // chosen yet — so admins can wire an agent to a slug they're still
    // staging.
    db.selectDistinct({ name: prompts.name }).from(prompts).orderBy(prompts.name),
  ])
  const promptSlugs = promptList.map(p => p.name)

  return (
    <div className="p-7 max-w-[1400px]">
      <div className="mb-5">
        <h1 className="font-outfit text-[22px] font-semibold">Agent registry</h1>
        <p className="text-[12px] text-brand-near-black/55 mt-1">
          All 10 agents read provider + model from this table at runtime.
          Never hardcoded — change here, the system picks it up on next call.
        </p>
      </div>

      <div className="bg-white border border-brand-near-black/10 rounded-[10px] overflow-x-auto">
        <table className="w-full text-[12px]">
          <thead>
            <tr className="text-left text-[11px] text-brand-near-black/55 border-b border-brand-near-black/10 bg-[#faf9f6]">
              <th className="py-2 px-3 font-normal">Agent</th>
              <th className="py-2 px-3 font-normal">Provider</th>
              <th className="py-2 px-3 font-normal">Model</th>
              <th className="py-2 px-3 font-normal">Esc. provider</th>
              <th className="py-2 px-3 font-normal">Esc. model</th>
              <th className="py-2 px-3 font-normal">Prompt key</th>
              <th className="py-2 px-3 font-normal">Max tok</th>
              <th className="py-2 px-3 font-normal">Temp</th>
              <th className="py-2 px-3 font-normal">Enabled</th>
              <th className="py-2 px-3 font-normal"></th>
            </tr>
          </thead>
          <tbody>
            {agents.map(a => (
              <AgentRow
                key={a.id}
                agent={a}
                providers={[...PROVIDERS]}
                promptSlugs={promptSlugs}
              />
            ))}
            {agents.length === 0 && (
              <tr>
                <td colSpan={10} className="px-4 py-6 text-[12px] text-brand-near-black/55">
                  No agents seeded — run <code className="font-mono">npx tsx db/seed.ts</code>.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
