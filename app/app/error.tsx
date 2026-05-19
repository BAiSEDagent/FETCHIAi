'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { ErrorState } from '@/components/app/ErrorState'
import { errorMessage } from '@/lib/enums'

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Customer app error:', error)
  }, [error])

  return (
    <div className="max-w-3xl px-4 lg:px-7 py-8 lg:py-10">
      <ErrorState
        title="Something hiccupped"
        body={errorMessage(error, "We couldn't load that screen. Give it another try in a moment.")}
        retry={
          <Button onClick={() => reset()} size="sm">
            Try again
          </Button>
        }
      />
    </div>
  )
}
