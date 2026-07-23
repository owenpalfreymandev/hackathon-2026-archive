import {
  CalendarDaysIcon,
  Clock3Icon,
  NavigationIcon,
  ParkingSquareIcon,
} from "lucide-react"

import { CancelBookingButton } from "@/components/cancel-booking-button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { createClient } from "@/lib/supabase/server"

type BookingRow = {
  id: string
  space_id: number
  starts_at: string
  ends_at: string
  status: string
  total_price_pence: number | null
}

type SpaceRow = {
  id: number
  space_name: string
  description: string | null
  latitude: string | number
  longitude: string | number
}

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
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

function getDirectionsUrl(space: SpaceRow) {
  return `https://www.google.com/maps/dir//${Number(
    space.latitude
  )},${Number(space.longitude)}/`
}

function statusClasses(status: string) {
  switch (status) {
    case "confirmed":
      return "bg-green-500/10 text-green-700 dark:text-green-400"
    case "pending":
      return "bg-amber-500/10 text-amber-700 dark:text-amber-400"
    case "cancelled":
    case "rejected":
      return "bg-destructive/10 text-destructive"
    case "past":
      return "bg-muted text-muted-foreground"
    default:
      return "bg-muted text-muted-foreground"
  }
}

export default async function MyBookingsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data: bookingData, error: bookingError } = await supabase
    .from("bookings")
    .select("id, space_id, starts_at, ends_at, status, total_price_pence")
    .eq("driver_id", user.id)
    .order("starts_at", { ascending: true })

  const bookings = (bookingData ?? []) as BookingRow[]
  const spaceIds = [...new Set(bookings.map((booking) => booking.space_id))]

  const { data: spaceData, error: spaceError } =
    spaceIds.length > 0
      ? await supabase
          .from("spaces")
          .select("id, space_name, description, latitude, longitude")
          .in("id", spaceIds)
      : { data: [], error: null }

  const spaces = new Map(
    ((spaceData ?? []) as SpaceRow[]).map((space) => [space.id, space])
  )

  const loadError = bookingError ?? spaceError
  const now = Date.now()

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      <div>
        <p className="text-sm font-medium text-muted-foreground">
          Parking plans
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">
          My bookings
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          View and manage the parking spaces you have booked.
        </p>
      </div>

      {loadError ? (
        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle>Could not load your bookings</CardTitle>
            <CardDescription>
              Refresh the page and try again.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : bookings.length === 0 ? (
        <Card className="max-w-2xl">
          <CardHeader>
            <div className="mb-2 flex size-10 items-center justify-center rounded-xl bg-muted">
              <ParkingSquareIcon className="size-5 text-muted-foreground" />
            </div>
            <CardTitle>No bookings yet</CardTitle>
            <CardDescription>
              Your booked parking spaces will appear here.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {bookings.map((booking) => {
            const space = spaces.get(booking.space_id)
            if (!space) return null

            const startsAt = new Date(booking.starts_at)
            const endsAt = new Date(booking.ends_at)
            const isPast = endsAt.getTime() <= now

            const canCancel =
              !isPast &&
              ["pending", "confirmed"].includes(booking.status)

            const displayStatus = isPast ? "Past" : booking.status

            return (
              <Card
                key={booking.id}
                className={
                  isPast
                    ? "border-muted bg-muted/20 opacity-60"
                    : undefined
                }
              >
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <CardTitle
                        className={
                          isPast
                            ? "text-lg text-muted-foreground"
                            : "text-lg"
                        }
                      >
                        {space.space_name}
                      </CardTitle>

                      {space.description && (
                        <CardDescription className="mt-1">
                          {space.description}
                        </CardDescription>
                      )}
                    </div>

                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${statusClasses(
                        isPast ? "past" : booking.status
                      )}`}
                    >
                      {displayStatus}
                    </span>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 text-sm">
                      <CalendarDaysIcon className="size-4 text-muted-foreground" />
                      <span>{dateFormatter.format(startsAt)}</span>
                    </div>

                    <div className="flex items-center gap-3 text-sm">
                      <Clock3Icon className="size-4 text-muted-foreground" />
                      <span>
                        {timeFormatter.format(startsAt)} –{" "}
                        {timeFormatter.format(endsAt)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t pt-4">
                    <span className="font-medium">
                      {formatPrice(booking.total_price_pence)}
                    </span>

                    <a
                      href={getDirectionsUrl(space)}
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
                        spaceName={space.space_name}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
