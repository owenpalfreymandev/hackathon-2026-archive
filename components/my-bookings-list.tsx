"use client"

import { useMemo, useState } from "react"
import {
  CalendarDaysIcon,
  Clock3Icon,
  EyeIcon,
  ExternalLinkIcon,
  ImageIcon,
  InfoIcon,
  MapPinIcon,
  NavigationIcon,
  ParkingSquareIcon,
  TimerIcon,
  WalletCardsIcon,
} from "lucide-react"

import type { BookingDetails } from "@/app/dashboard/my-bookings/page"
import { BookingLocationMap } from "@/components/booking-location-map"
import { CancelBookingButton } from "@/components/cancel-booking-button"
import { RemoveBookingButton } from "@/components/remove-booking-button"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { cn } from "@/lib/utils"

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
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
  year: "numeric",
  timeZone: "Europe/Jersey",
})

const timeFormatter = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Jersey",
})

function formatPrice(totalPricePence: number | null) {
  if (totalPricePence == null) return "Price unavailable"

  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
  }).format(totalPricePence / 100)
}

function formatRate(value: number | null) {
  if (value == null) return null

  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
  }).format(value)
}

function directionsUrl(booking: BookingDetails) {
  return `https://www.google.com/maps/dir//${booking.latitude},${booking.longitude}/`
}

function durationLabel(startsAt: string, endsAt: string) {
  const milliseconds =
    new Date(endsAt).getTime() - new Date(startsAt).getTime()
  const totalMinutes = Math.max(0, Math.round(milliseconds / 60_000))
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60

  if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`
  if (hours > 0) return `${hours}h`
  return `${minutes}m`
}

function statusClasses(status: string, isPast: boolean) {
  if (isPast) return "bg-muted text-muted-foreground"

  switch (status) {
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

function pricingDescription(booking: BookingDetails) {
  const fixed = formatRate(booking.fixedPrice)
  const hourly = formatRate(booking.hourlyPrice)

  if (booking.pricingType === "both" && fixed && hourly) {
    return `${fixed} fixed fee + ${hourly} per hour`
  }

  if (booking.pricingType === "hourly" && hourly) {
    return `${hourly} per hour`
  }

  if (booking.pricingType === "fixed" && fixed) {
    return `${fixed} fixed price`
  }

  return null
}

type MyBookingsListProps = {
  bookings: BookingDetails[]
}

export function MyBookingsList({ bookings }: MyBookingsListProps) {
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(
    null
  )
  const [hiddenBookingIds, setHiddenBookingIds] = useState<Set<string>>(
    () => new Set()
  )
  const [removalMessage, setRemovalMessage] = useState<string | null>(null)
  const [now] = useState(() => Date.now())

  const visibleBookings = useMemo(
    () => bookings.filter((booking) => !hiddenBookingIds.has(booking.id)),
    [bookings, hiddenBookingIds]
  )

  const selectedBooking = useMemo(
    () =>
      visibleBookings.find((booking) => booking.id === selectedBookingId) ??
      null,
    [selectedBookingId, visibleBookings]
  )

  function handleBookingRemoved(bookingId: string) {
    setHiddenBookingIds((currentIds) => {
      const nextIds = new Set(currentIds)
      nextIds.add(bookingId)
      return nextIds
    })
    setSelectedBookingId(null)
    setRemovalMessage("Cancelled booking removed from My Bookings.")
  }

  return (
    <>
      {removalMessage && (
        <p
          className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-400"
          role="status"
        >
          {removalMessage}
        </p>
      )}

      <div className="grid gap-4 xl:grid-cols-2">
        {visibleBookings.map((booking) => {
          const startsAt = new Date(booking.startsAt)
          const endsAt = new Date(booking.endsAt)
          const isPast = endsAt.getTime() <= now
          const canCancel =
            !isPast &&
            ["pending", "confirmed"].includes(booking.status)

          return (
            <Card
              key={booking.id}
              className={cn(
                "h-full",
                isPast && "border-muted bg-muted/20 opacity-65"
              )}
            >
              {booking.photoUrl ? (
                <div className="aspect-[16/6] overflow-hidden rounded-t-xl border-b bg-muted">
                  <img
                    src={booking.photoUrl}
                    alt={booking.spaceName}
                    className="h-full w-full object-cover"
                  />
                </div>
              ) : null}

              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <CardTitle
                      className={cn(
                        "text-lg",
                        isPast && "text-muted-foreground"
                      )}
                    >
                      {booking.spaceName}
                    </CardTitle>

                    {booking.description && (
                      <CardDescription className="mt-1 line-clamp-2">
                        {booking.description}
                      </CardDescription>
                    )}
                  </div>

                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2.5 py-1 text-xs font-medium capitalize",
                      statusClasses(booking.status, isPast)
                    )}
                  >
                    {isPast ? "Past" : booking.status}
                  </span>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-sm">
                    <CalendarDaysIcon className="size-4 text-muted-foreground" />
                    <span>{shortDateFormatter.format(startsAt)}</span>
                  </div>

                  <div className="flex items-center gap-3 text-sm">
                    <Clock3Icon className="size-4 text-muted-foreground" />
                    <span>
                      {timeFormatter.format(startsAt)} –{" "}
                      {timeFormatter.format(endsAt)}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-sm">
                    <MapPinIcon className="size-4 text-muted-foreground" />
                    <span>
                      {booking.latitude.toFixed(5)},{" "}
                      {booking.longitude.toFixed(5)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t pt-4">
                  <span className="font-medium">
                    {formatPrice(booking.totalPricePence)}
                  </span>

                  <a
                    href={directionsUrl(booking)}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                  >
                    <NavigationIcon className="size-4" />
                    Take me there
                  </a>
                </div>

                {canCancel && (
                  <div className="border-t pt-4">
                    <CancelBookingButton
                      bookingId={booking.id}
                      spaceName={booking.spaceName}
                    />
                  </div>
                )}

                {(booking.status === "cancelled" || isPast) && (
                  <div className="border-t pt-4">
                    <RemoveBookingButton
                      bookingId={booking.id}
                      spaceName={booking.spaceName}
                      bookingState={isPast ? "past" : "cancelled"}
                      onRemoved={handleBookingRemoved}
                    />
                  </div>
                )}

                <div className="border-t pt-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => setSelectedBookingId(booking.id)}
                  >
                    <EyeIcon />
                    View booking details
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Sheet
        open={selectedBooking !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedBookingId(null)
        }}
      >
        {selectedBooking && (
          <BookingDetailsSheet booking={selectedBooking} now={now} />
        )}
      </Sheet>
    </>
  )
}

function BookingDetailsSheet({
  booking,
  now,
}: {
  booking: BookingDetails
  now: number
}) {
  const startsAt = new Date(booking.startsAt)
  const endsAt = new Date(booking.endsAt)
  const isPast = endsAt.getTime() <= now
  const canCancel =
    !isPast && ["pending", "confirmed"].includes(booking.status)
  const rateDescription = pricingDescription(booking)

  return (
    <SheetContent className="w-full overflow-y-auto sm:!max-w-xl">
      <SheetHeader className="border-b">
        <div className="flex items-center gap-2 pr-10">
          <ParkingSquareIcon className="size-5 text-primary" />
          <SheetTitle className="text-xl">{booking.spaceName}</SheetTitle>
        </div>
        <SheetDescription>
          Full details for your parking reservation.
        </SheetDescription>
      </SheetHeader>

      <div className="space-y-6 p-6">
        {booking.photoUrl ? (
          <div className="aspect-video overflow-hidden rounded-xl border bg-muted">
            <img
              src={booking.photoUrl}
              alt={`Parking space at ${booking.spaceName}`}
              className="h-full w-full object-cover"
            />
          </div>
        ) : (
          <div className="flex aspect-video items-center justify-center rounded-xl border bg-muted">
            <div className="text-center text-muted-foreground">
              <ImageIcon className="mx-auto mb-2 size-8" />
              <p className="text-sm">No parking image supplied</p>
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "rounded-full px-2.5 py-1 text-xs font-medium capitalize",
              statusClasses(booking.status, isPast)
            )}
          >
            {isPast ? "Past" : booking.status}
          </span>

          <span className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
            Booking #{booking.id.slice(0, 8)}
          </span>
        </div>

        <section className="grid gap-3 sm:grid-cols-2">
          <DetailItem
            icon={CalendarDaysIcon}
            label="Date"
            value={dateFormatter.format(startsAt)}
          />
          <DetailItem
            icon={Clock3Icon}
            label="Time"
            value={`${timeFormatter.format(startsAt)} – ${timeFormatter.format(
              endsAt
            )}`}
          />
          <DetailItem
            icon={TimerIcon}
            label="Duration"
            value={durationLabel(booking.startsAt, booking.endsAt)}
          />
          <DetailItem
            icon={WalletCardsIcon}
            label="Total price"
            value={formatPrice(booking.totalPricePence)}
            secondary={rateDescription}
          />
        </section>

        <section className="space-y-3">
          <div>
            <h3 className="font-medium">Location</h3>
            <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
              <MapPinIcon className="size-4 shrink-0" />
              {booking.latitude.toFixed(6)}, {booking.longitude.toFixed(6)}
            </p>
          </div>

          <BookingLocationMap
            latitude={booking.latitude}
            longitude={booking.longitude}
            spaceName={booking.spaceName}
          />

          <Button
            className="w-full"
            nativeButton={false}
            render={
              <a
                href={directionsUrl(booking)}
                target="_blank"
                rel="noreferrer"
              />
            }
          >
            <NavigationIcon className="size-4" />
            Take me there
            <ExternalLinkIcon className="size-3.5" />
          </Button>
        </section>

        <section className="rounded-xl border p-4">
          <div className="flex items-center gap-2">
            <InfoIcon className="size-4 text-muted-foreground" />
            <h3 className="font-medium">Additional information</h3>
          </div>
          <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
            {booking.description?.trim() ||
              "The space owner has not provided any additional information."}
          </p>
        </section>

        {canCancel && (
          <section className="border-t pt-5">
            <CancelBookingButton
              bookingId={booking.id}
              spaceName={booking.spaceName}
            />
          </section>
        )}
      </div>
    </SheetContent>
  )
}

function DetailItem({
  icon: Icon,
  label,
  value,
  secondary,
}: {
  icon: typeof CalendarDaysIcon
  label: string
  value: string
  secondary?: string | null
}) {
  return (
    <div className="rounded-xl border p-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Icon className="size-4" />
        {label}
      </div>
      <p className="mt-2 font-medium">{value}</p>
      {secondary && (
        <p className="mt-1 text-xs text-muted-foreground">{secondary}</p>
      )}
    </div>
  )
}
