import { requireAdmin } from '@/lib/admin'
import { AdminSidebar } from '@/components/admin/AdminSidebar'

export const dynamic = 'force-dynamic'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const admin = await requireAdmin()
  return (
    <div className="min-h-screen flex bg-[#faf9f6] text-brand-near-black">
      <AdminSidebar />
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="border-b border-brand-near-black/10 bg-white px-7 py-3 flex items-center justify-between">
          <div className="text-[12px] text-brand-near-black/60">
            Signed in as <span className="font-medium text-brand-near-black/85">{admin.email ?? admin.userId}</span>
          </div>
          <div className="text-[11px] uppercase tracking-[0.08em] text-brand-near-black/40">
            Admin
          </div>
        </header>
        <main className="flex-1 overflow-x-auto">{children}</main>
      </div>
    </div>
  )
}
