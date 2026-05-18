export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="max-w-xl w-full text-center space-y-8">
        <div className="flex items-center justify-center">
          <span
            className="fetchi-avatar"
            style={{ width: 88, height: 88, fontSize: 44, lineHeight: 1 }}
            aria-hidden="true"
          >
            ツ
          </span>
        </div>
        <div className="space-y-3">
          <h1 className="fetchi-wordmark text-5xl text-brand-near-black">
            Fetchi
          </h1>
          <p className="text-sm uppercase tracking-widest text-brand-dark font-semibold">
            Checkpoint 1 — Foundation
          </p>
        </div>
        <p className="text-lg text-brand-near-black/80 leading-relaxed">
          Tell us what your business sells — we&apos;ll find the buyers who need
          it this week.
        </p>
        <div className="mx-auto inline-flex items-center gap-2 rounded-full bg-brand-light px-4 py-2 text-sm font-medium text-brand-dark border border-brand-green/30">
          <span className="h-2 w-2 rounded-full bg-brand-green" />
          Foundation ready · awaiting CP2
        </div>
      </div>
    </main>
  )
}
