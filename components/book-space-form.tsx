"use client"

import { useMemo, useState, type FormEvent } from "react"
import { CheckCircle2Icon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { formatPounds } from "@/lib/parking"
import { createClient } from "@/lib/supabase/client"

type BookSpaceFormProps = {
  space: {
    id: number
    spaceName: string
    description: string
    photoUrl: string
    ownerId: string
    pricingType: string
    fixedPrice: number | null
    hourlyPrice: number | null
  }
  initialStartsAt?: string
  initialEndsAt?: string
}

function toDateTimeLocal(value?: string): string {
  if (!value) return ""

  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return ""

  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return localDate.toISOString().slice(0, 16)
}

export function BookSpaceForm({
  space,
  initialStartsAt,
  initialEndsAt,
}: BookSpaceFormProps) {
  const router = useRouter()
  const [startsAt, setStartsAt] = useState(() => toDateTimeLocal(initialStartsAt))
  const [endsAt, setEndsAt] = useState(() => toDateTimeLocal(initialEndsAt))
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [bookingId, setBookingId] = useState<string | null>(null)

  const durationHours = useMemo(() => {
    if (!startsAt || !endsAt) return null

    const start = new Date(startsAt).getTime()
    const end = new Date(endsAt).getTime()
    const hours = (end - start) / 3_600_000

    return Number.isFinite(hours) && hours > 0 ? hours : null
  }, [startsAt, endsAt])

  const totalPrice = useMemo(() => {
    if (space.pricingType === "fixed") return space.fixedPrice
    if (space.hourlyPrice === null || durationHours === null) return null

    const hourlyTotal = (Math.ceil(durationHours * 4) / 4) * space.hourlyPrice
    if (space.pricingType === "both") {
      return space.fixedPrice === null ? null : space.fixedPrice + hourlyTotal
    }

    return hourlyTotal
  }, [durationHours, space.fixedPrice, space.hourlyPrice, space.pricingType])

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    setBookingId(null)

    if (!startsAt || !endsAt) {
      setError("Choose a start and end time.")
      return
    }

    const start = new Date(startsAt)
    const end = new Date(endsAt)

    if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime())) {
      setError("Enter valid booking times.")
      return
    }

    if (end <= start) {
      setError("The booking must end after it starts.")
      return
    }

    if (totalPrice === null || totalPrice <= 0) {
      setError("This pricing option is not available for the selected space.")
      return
    }

    setIsSubmitting(true)

    try {
      const supabase = createClient()
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser()

      if (authError || !user) {
        throw new Error("You must be signed in to make a booking.")
      }

      if (user.id === space.ownerId) {
        throw new Error("You cannot book your own parking space.")
      }

      const { data: availabilityRows, error: availabilityError } = await supabase.rpc(
        "search_space_availability",
        {
          p_starts_at: start.toISOString(),
          p_ends_at: end.toISOString(),
        }
      )

      if (availabilityError) throw availabilityError

      const availability = (
        (availabilityRows ?? []) as Array<{
          space_id: number
          is_available: boolean
          availability_reason: string | null
        }>
      ).find((row) => Number(row.space_id) === space.id)

      if (!availability?.is_available) {
        throw new Error(
          availability?.availability_reason ??
            "This space is no longer available for those times."
        )
      }

      const { data, error: insertError } = await supabase
        .from("bookings")
        .insert({
          space_id: space.id,
          driver_id: user.id,
          starts_at: start.toISOString(),
          ends_at: end.toISOString(),
          booking_type: space.pricingType === "fixed" ? "daily" : "hourly",
          total_price_pence: Math.round(totalPrice * 100),
          status: "confirmed",
        })
        .select("id")
        .single()

      if (insertError) {
        if (insertError.code === "23P01") {
          throw new Error("That space was just booked during those times.")
        }
        if (insertError.message.toLowerCase().includes("availability")) {
          throw new Error("That booking falls outside the host's available hours.")
        }
        throw insertError
      }

      setBookingId(data.id)
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Could not create the booking."
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  if (bookingId) {
    return (
      <Card className="mx-auto w-full max-w-2xl">
        <CardHeader>
          <CheckCircle2Icon className="size-10 text-green-600" />
          <CardTitle className="text-xl">Booking confirmed</CardTitle>
          <CardDescription>
            {space.spaceName} has been reserved for your selected times.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Booking reference: {bookingId}
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="mx-auto w-full max-w-2xl">
      <img
        src={space.photoUrl}
        alt={space.spaceName}
        className="h-64 w-full object-cover"
      />
      <CardHeader>
        <CardTitle className="text-xl">Book {space.spaceName}</CardTitle>
        <CardDescription>{space.description}</CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-6">
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="starts-at">Starts</FieldLabel>
              <Input
                id="starts-at"
                type="datetime-local"
                value={startsAt}
                onChange={(event) => setStartsAt(event.target.value)}
                required
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="ends-at">Ends</FieldLabel>
              <Input
                id="ends-at"
                type="datetime-local"
                value={endsAt}
                onChange={(event) => setEndsAt(event.target.value)}
                required
              />
            </Field>
          </FieldGroup>

          <div className="rounded-2xl bg-muted px-4 py-3">
            <p className="text-sm text-muted-foreground">Total</p>
            <p className="text-2xl font-semibold">
              {totalPrice === null ? "Choose valid times" : formatPounds(totalPrice)}
            </p>
            {space.pricingType === "both" &&
              space.fixedPrice !== null &&
              space.hourlyPrice !== null && (
                <p className="text-xs text-muted-foreground">
                  Includes a {formatPounds(space.fixedPrice)} booking fee plus {formatPounds(space.hourlyPrice)}/hr.
                </p>
              )}
            {(space.pricingType === "hourly" || space.pricingType === "both") &&
              durationHours !== null && (
              <p className="text-xs text-muted-foreground">
                Charged in quarter-hour increments.
              </p>
              )}
          </div>

          {error && (
            <p className="rounded-2xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </p>
          )}
        </CardContent>

        <CardFooter className="justify-end pt-6">
          <Button
            type="submit"
            size="lg"
            disabled={isSubmitting || totalPrice === null}
          >
            {isSubmitting ? "Booking…" : "Confirm booking"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
