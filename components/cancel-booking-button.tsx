"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2Icon, XCircleIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"

type CancelBookingButtonProps = {
  bookingId: string
  spaceName: string
}

export function CancelBookingButton({
  bookingId,
  spaceName,
}: CancelBookingButtonProps) {
  const router = useRouter()
  const [isCancelling, setIsCancelling] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function cancelBooking() {
    const confirmed = window.confirm(
      `Cancel your booking for "${spaceName}"? The space will become available again.`
    )

    if (!confirmed) return

    setError(null)
    setIsCancelling(true)

    try {
      const supabase = createClient()
      const { error: cancelError } = await supabase.rpc(
        "cancel_own_booking",
        { p_booking_id: bookingId }
      )

      if (cancelError) throw cancelError

      router.refresh()
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Could not cancel this booking."
      )
    } finally {
      setIsCancelling(false)
    }
  }

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="destructive"
        size="sm"
        onClick={cancelBooking}
        disabled={isCancelling}
      >
        {isCancelling ? (
          <>
            <Loader2Icon className="size-4 animate-spin" />
            Cancelling…
          </>
        ) : (
          <>
            <XCircleIcon className="size-4" />
            Cancel booking
          </>
        )}
      </Button>

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
