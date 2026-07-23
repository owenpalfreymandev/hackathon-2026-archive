"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  CalendarCheck2Icon,
  CalendarDaysIcon,
  Clock3Icon,
  Loader2Icon,
  MailIcon,
  ParkingSquareIcon,
  PoundSterlingIcon,
  UserRoundIcon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"

type OwnerBookingRow = {
  booking_id: string
  space_id: number
  driver_email: string | null
  starts_at: string
  ends_at: string
  booking_status: string
  total_price_pence: number | string | null
}

type SpaceBookingActivityProps = {
  spaceId: number
  spaceName: string
}

const fullDateFormatter = new Intl.DateTimeFormat("en-GB", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "Europe/Jersey",
})

const shortDateFormatter = new Intl.DateTimeFormat("en-GB", {
  weekday: "short",
  day: "numeric",
  month: "short",
  timeZone: "Europe/Jersey",
})

const timeFormatter = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Jersey",
})

function formatPrice(totalPricePence: OwnerBookingRow["total_price_pence"]) {
  if (totalPricePence === null) return "Price unavailable"

  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
  }).format(Number(totalPricePence) / 100)
}

function isActiveBooking(booking: OwnerBookingRow, now: number) {
  return (
    ["pending", "confirmed"].includes(booking.booking_status) &&
    new Date(booking.ends_at).getTime() > now
  )
}

function isOngoingBooking(booking: OwnerBookingRow, now: number) {
  return (
    isActiveBooking(booking, now) &&
    new Date(booking.starts_at).getTime() <= now
  )
}

function statusClasses(booking: OwnerBookingRow, now: number) {
  if (
    new Date(booking.ends_at).getTime() <= now &&
    ["pending", "confirmed"].includes(booking.booking_status)
  ) {
    return "bg-muted text-muted-foreground"
  }

  switch (booking.booking_status) {
    case "confirmed":
      return "bg-green-500/10 text-green-700 dark:text-green-400"
    case "pending":
      return "bg-amber-500/10 text-amber-700 dark:text-amber-400"
    case "cancelled":
    case "rejected":
      return "bg-destructive/10 text-destructive"
    default:
      return "bg-muted text-muted-foreground"
  }
}

function displayStatus(booking: OwnerBookingRow, now: number) {
  if (isOngoingBooking(booking, now)) return "In progress"

  if (
    new Date(booking.ends_at).getTime() <= now &&
    ["pending", "confirmed"].includes(booking.booking_status)
  ) {
    return "Past"
  }

  return booking.booking_status
}

function durationLabel(startsAt: string, endsAt: string) {
  const milliseconds =
    new Date(endsAt).getTime() - new Date(startsAt).getTime()
  const minutes = Math.max(0, Math.round(milliseconds / 60_000))
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60

  if (hours > 0 && remainingMinutes > 0) {
    return `${hours}h ${remainingMinutes}m`
  }

  if (hours > 0) return `${hours}h`
  return `${remainingMinutes}m`
}

export function SpaceBookingActivity({
  spaceId,
  spaceName,
}: SpaceBookingActivityProps) {
  const [bookings, setBookings] = useState<OwnerBookingRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isOpen, setIsOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadBookings = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      const { data, error: bookingError } = await supabase.rpc(
        "get_owned_space_bookings",
        { p_space_id: spaceId }
      )

      if (bookingError) throw bookingError
      setBookings((data ?? []) as OwnerBookingRow[])
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Could not load booking activity."
      )
    } finally {
      setIsLoading(false)
    }
  }, [spaceId])

  useEffect(() => {
    void loadBookings()
  }, [loadBookings])

  const now = Date.now()

  const activeBookings = useMemo(
    () =>
      bookings
        .filter((booking) => isActiveBooking(booking, now))
        .sort(
          (first, second) =>
            new Date(first.starts_at).getTime() -
            new Date(second.starts_at).getTime()
        ),
    [bookings, now]
  )

  const ongoingCount = activeBookings.filter((booking) =>
    isOngoingBooking(booking, now)
  ).length

  const nextBooking =
    activeBookings.find(
      (booking) => new Date(booking.starts_at).getTime() > now
    ) ?? null

  const sortedBookings = useMemo(
    () =>
      [...bookings].sort((first, second) => {
        const firstActive = isActiveBooking(first, now)
        const secondActive = isActiveBooking(second, now)

        if (firstActive !== secondActive) return firstActive ? -1 : 1

        if (firstActive) {
          return (
            new Date(first.starts_at).getTime() -
            new Date(second.starts_at).getTime()
          )
        }

        return (
          new Date(second.starts_at).getTime() -
          new Date(first.starts_at).getTime()
        )
      }),
    [bookings, now]
  )

  const summary =
    ongoingCount > 0
      ? `${ongoingCount} booking${ongoingCount === 1 ? "" : "s"} in progress`
      : activeBookings.length > 0
        ? `${activeBookings.length} active booking${
            activeBookings.length === 1 ? "" : "s"
          }`
        : "No active bookings"

  return (
    <>
      <button
        type="button"
        className={cn(
          "basis-full rounded-2xl border p-4 text-left text-foreground transition-colors",
          activeBookings.length > 0
            ? "border-primary/30 bg-primary/5 hover:bg-primary/10"
            : "border-border bg-muted/25 hover:bg-muted/50"
        )}
        onClick={() => setIsOpen(true)}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 gap-3">
            <div
              className={cn(
                "flex size-9 shrink-0 items-center justify-center rounded-xl",
                activeBookings.length > 0
                  ? "bg-primary/10 text-primary"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {isLoading ? (
                <Loader2Icon className="size-4 animate-spin" />
              ) : (
                <CalendarCheck2Icon className="size-4" />
              )}
            </div>

            <div className="min-w-0">
              <p className="font-medium">
                {isLoading ? "Checking bookings…" : summary}
              </p>

              {!isLoading && nextBooking && (
                <p className="mt-1 text-sm text-muted-foreground">
                  Next: {shortDateFormatter.format(
                    new Date(nextBooking.starts_at)
                  )},{" "}
                  {timeFormatter.format(new Date(nextBooking.starts_at))}–
                  {timeFormatter.format(new Date(nextBooking.ends_at))}
                </p>
              )}

              {!isLoading &&
                !nextBooking &&
                ongoingCount === 0 &&
                bookings.length > 0 && (
                  <p className="mt-1 text-sm text-muted-foreground">
                    {bookings.length} historical booking
                    {bookings.length === 1 ? "" : "s"} available to review
                  </p>
                )}

              {error && (
                <p className="mt-1 text-sm text-destructive">
                  Could not load booking activity
                </p>
              )}
            </div>
          </div>

          <span className="shrink-0 text-xs font-medium text-primary">
            View details
          </span>
        </div>
      </button>

      <Sheet
        open={isOpen}
        onOpenChange={(open) => {
          setIsOpen(open)
          if (open) void loadBookings()
        }}
      >
        <SheetContent className="w-full overflow-y-auto sm:!max-w-xl">
          <SheetHeader className="border-b">
            <div className="flex items-center gap-2 pr-10">
              <ParkingSquareIcon className="size-5 text-primary" />
              <SheetTitle className="text-xl">{spaceName}</SheetTitle>
            </div>
            <SheetDescription>
              Booking activity for this parking space.
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-5 p-6">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border bg-primary/5 p-4">
                <p className="text-sm text-muted-foreground">
                  Active bookings
                </p>
                <p className="mt-1 text-2xl font-semibold">
                  {activeBookings.length}
                </p>
              </div>

              <div className="rounded-xl border p-4">
                <p className="text-sm text-muted-foreground">
                  Total bookings
                </p>
                <p className="mt-1 text-2xl font-semibold">
                  {bookings.length}
                </p>
              </div>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center gap-2 rounded-xl border p-8 text-sm text-muted-foreground">
                <Loader2Icon className="size-4 animate-spin" />
                Loading bookings…
              </div>
            ) : error ? (
              <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4">
                <p className="text-sm text-destructive">{error}</p>
                <Button
                  type="button"
                  variant="outline"
                  className="mt-3"
                  onClick={() => void loadBookings()}
                >
                  Try again
                </Button>
              </div>
            ) : sortedBookings.length === 0 ? (
              <div className="rounded-xl border border-dashed p-8 text-center">
                <CalendarCheck2Icon className="mx-auto size-8 text-muted-foreground" />
                <p className="mt-3 font-medium">No bookings yet</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  New reservations for this space will appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {sortedBookings.map((booking) => {
                  const startsAt = new Date(booking.starts_at)
                  const endsAt = new Date(booking.ends_at)
                  const active = isActiveBooking(booking, now)

                  return (
                    <div
                      key={booking.booking_id}
                      className={cn(
                        "rounded-xl border p-4",
                        !active && "bg-muted/20 opacity-70"
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium">
                            {fullDateFormatter.format(startsAt)}
                          </p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {timeFormatter.format(startsAt)} –{" "}
                            {timeFormatter.format(endsAt)}
                          </p>
                        </div>

                        <span
                          className={cn(
                            "shrink-0 rounded-full px-2.5 py-1 text-xs font-medium capitalize",
                            statusClasses(booking, now)
                          )}
                        >
                          {displayStatus(booking, now)}
                        </span>
                      </div>

                      <div className="mt-4 grid gap-3 border-t pt-4 sm:grid-cols-2">
                        <BookingDetail
                          icon={UserRoundIcon}
                          label="Driver"
                          value={booking.driver_email ?? "Email unavailable"}
                        />
                        <BookingDetail
                          icon={PoundSterlingIcon}
                          label="Price"
                          value={formatPrice(booking.total_price_pence)}
                        />
                        <BookingDetail
                          icon={Clock3Icon}
                          label="Duration"
                          value={durationLabel(
                            booking.starts_at,
                            booking.ends_at
                          )}
                        />
                        <BookingDetail
                          icon={CalendarDaysIcon}
                          label="Reference"
                          value={`#${booking.booking_id.slice(0, 8)}`}
                        />
                      </div>

                      {booking.driver_email && (
                        <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                          <MailIcon className="size-3.5" />
                          {booking.driver_email}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}

function BookingDetail({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Clock3Icon
  label: string
  value: string
}) {
  return (
    <div>
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="size-3.5" />
        {label}
      </p>
      <p className="mt-1 break-words text-sm font-medium">{value}</p>
    </div>
  )
}
