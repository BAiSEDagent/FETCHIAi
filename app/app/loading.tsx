import { LoadingState } from '@/components/app/LoadingState'

export default function AppLoading() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <LoadingState label="Loading…" />
    </div>
  )
}
