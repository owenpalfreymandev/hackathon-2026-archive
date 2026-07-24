"use client"

import { useState } from "react"
import { Loader2Icon, Trash2Icon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"

type RemoveBookingButtonProps = {
  bookingId: string
  spaceName: string
  bookingState: "cancelled" | "past"
  onRemoved: (bookingId: string) => void
}

export function RemoveBookingButton({
  bookingId,
  spaceName,
  bookingState,
  onRemoved,
}: RemoveBookingButtonProps) {
  const [isRemoving, setIsRemoving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function removeBooking() {
    const confirmed = window.confirm(
      `Remove this ${bookingState} booking for "${spaceName}" from My Bookings?`
    )

    if (!confirmed) return

    setError(null)
    setIsRemoving(true)

    try {
      const supabase = createClient()
      const { error: removeError } = await supabase.rpc(
        "dismiss_own_booking",
        { p_booking_id: bookingId }
      )

      if (removeError) throw removeError

      onRemoved(bookingId)
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Could not remove this cancelled booking."
      )
    } finally {
      setIsRemoving(false)
    }
  }

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={removeBooking}
        disabled={isRemoving}
      >
        {isRemoving ? (
          <>
            <Loader2Icon className="size-4 animate-spin" />
            Removing…
          </>
        ) : (
          <>
            <Trash2Icon className="size-4" />
            Remove from My Bookings
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
