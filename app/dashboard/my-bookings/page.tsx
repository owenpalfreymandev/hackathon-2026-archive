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
import { formatPounds } from "@/lib/parking"

type Booking = {
  id: string
  space_id: number
  starts_at: string
  ends_at: string
  status: string
  total_price_pence: number
}

type Space = {
  id: number
  space_name: string
  description: string | null
  photo_url: string | null
  latitude: number | string
  longitude: number | string
}

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  weekday: "short",
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "Europe/Jersey",
})

const timeFormatter = new Intl.DateTimeFormat("en-GB", {
  hour: "numeric",
  minute: "2-digit",
  timeZone: "Europe/Jersey",
})

function bookingDateRange(startsAt: string, endsAt: string) {
  const start = new Date(startsAt)
  const end = new Date(endsAt)

  return {
    date: dateFormatter.format(start),
    time: `${timeFormatter.format(start)} – ${timeFormatter.format(end)}`,
  }
}

function directionsUrl(space: Space) {
  return `https://www.google.com/maps/dir//${Number(space.latitude)},${Number(space.longitude)}/`
}

function statusClassName(status: string) {
  switch (status) {
    case "confirmed":
      return "bg-green-500/10 text-green-700 dark:text-green-400"
    case "pending":
      return "bg-amber-500/10 text-amber-700 dark:text-amber-400"
    case "cancelled":
    case "rejected":
      return "bg-destructive/10 text-destructive"
    case "completed":
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

  const { data: bookingRows, error: bookingError } = await supabase
    .from("bookings")
    .select("id, space_id, starts_at, ends_at, status, total_price_pence")
    .eq("driver_id", user.id)
    .order("starts_at", { ascending: true })

  const bookings = (bookingRows ?? []) as Booking[]
  const spaceIds = [...new Set(bookings.map((booking) => booking.space_id))]
  const { data: spaceRows, error: spaceError } = spaceIds.length
    ? await supabase
        .from("spaces")
        .select("id, space_name, description, photo_url, latitude, longitude")
        .in("id", spaceIds)
    : { data: [], error: null }

  const spaces = new Map(
    ((spaceRows ?? []) as Space[]).map((space) => [space.id, space])
  )

  const error = bookingError ?? spaceError
  const now = Date.now()

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      <div>
        <p className="text-sm font-medium text-muted-foreground">
          Parking plans
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">My bookings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Review upcoming reservations or cancel one before it begins.
        </p>
      </div>

      {error ? (
        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle>Couldn’t load your bookings</CardTitle>
            <CardDescription>Please refresh the page and try again.</CardDescription>
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
              When you reserve a parking space, it will appear here.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {bookings.map((booking) => {
            const space = spaces.get(booking.space_id)
            if (!space) return null

            const schedule = bookingDateRange(
              booking.starts_at,
              booking.ends_at
            )
            const canCancel =
              (booking.status === "pending" ||
                booking.status === "confirmed") &&
              new Date(booking.starts_at).getTime() > now

            return (
              <Card key={booking.id} className="h-full">
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <CardTitle className="text-lg">
                        {space.space_name}
                      </CardTitle>
                      {space.description && (
                        <CardDescription className="mt-1 line-clamp-2">
                          {space.description}
                        </CardDescription>
                      )}
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium capitalize ${statusClassName(
                        booking.status
                      )}`}
                    >
                      {booking.status}
                    </span>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 text-sm">
                      <CalendarDaysIcon className="size-4 text-muted-foreground" />
                      <span>{schedule.date}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <Clock3Icon className="size-4 text-muted-foreground" />
                      <span>{schedule.time}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t pt-3 text-sm">
                    <span className="font-medium">
                      {formatPounds(booking.total_price_pence / 100)}
                    </span>
                    <a
                      href={directionsUrl(space)}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1.5 font-medium text-primary hover:underline focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30"
                      aria-label={`Get directions to ${space.space_name}`}
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
