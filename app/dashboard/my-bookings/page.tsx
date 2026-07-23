import { ParkingSquareIcon } from "lucide-react"

import { MyBookingsList } from "@/components/my-bookings-list"
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { createClient } from "@/lib/supabase/server"

export type BookingDetails = {
  id: string
  spaceId: number
  startsAt: string
  endsAt: string
  status: string
  totalPricePence: number | null
  spaceName: string
  description: string | null
  photoUrl: string | null
  latitude: number
  longitude: number
  pricingType: string | null
  fixedPrice: number | null
  hourlyPrice: number | null
}

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
  photo_url: string | null
  latitude: string | number
  longitude: string | number
  pricing_type: string | null
  fixed_price: number | null
  hourly_price: number | null
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
    .is("driver_hidden_at", null)
    .order("starts_at", { ascending: true })

  const rawBookings = (bookingRows ?? []) as BookingRow[]
  const spaceIds = [...new Set(rawBookings.map((booking) => booking.space_id))]

  const { data: spaceRows, error: spaceError } =
    spaceIds.length > 0
      ? await supabase
          .from("spaces")
          .select(
            "id, space_name, description, photo_url, latitude, longitude, pricing_type, fixed_price, hourly_price"
          )
          .in("id", spaceIds)
      : { data: [], error: null }

  const spacesById = new Map(
    ((spaceRows ?? []) as SpaceRow[]).map((space) => [space.id, space])
  )

  const bookings: BookingDetails[] = rawBookings.flatMap((booking) => {
    const space = spacesById.get(booking.space_id)
    if (!space) return []

    return [
      {
        id: booking.id,
        spaceId: booking.space_id,
        startsAt: booking.starts_at,
        endsAt: booking.ends_at,
        status: booking.status,
        totalPricePence: booking.total_price_pence,
        spaceName: space.space_name,
        description: space.description,
        photoUrl: space.photo_url,
        latitude: Number(space.latitude),
        longitude: Number(space.longitude),
        pricingType: space.pricing_type,
        fixedPrice: space.fixed_price,
        hourlyPrice: space.hourly_price,
      },
    ]
  })

  const error = bookingError ?? spaceError

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
          Select a booking to view its full details, location and directions.
        </p>
      </div>

      {error ? (
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
        <MyBookingsList bookings={bookings} />
      )}
    </div>
  )
}
