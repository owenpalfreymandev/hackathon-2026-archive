import { BookSpaceForm } from "@/components/book-space-form"
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { createClient } from "@/lib/supabase/server"

type BookSpacePageProps = {
  searchParams: Promise<{
    spaceId?: string | string[]
    userLat?: string | string[]
    userLng?: string | string[]
  }>
}

export default async function BookSpacePage({
  searchParams,
}: BookSpacePageProps) {
  const params = await searchParams
  const rawSpaceId = Array.isArray(params.spaceId)
    ? params.spaceId[0]
    : params.spaceId
  const spaceId = Number(rawSpaceId)

  const rawUserLat = Array.isArray(params.userLat)
    ? params.userLat[0]
    : params.userLat
  const rawUserLng = Array.isArray(params.userLng)
    ? params.userLng[0]
    : params.userLng

  const parsedLat = rawUserLat ? parseFloat(rawUserLat) : NaN
  const parsedLng = rawUserLng ? parseFloat(rawUserLng) : NaN

  const initialUserLocation =
    Number.isFinite(parsedLat) && Number.isFinite(parsedLng)
      ? { lat: parsedLat, lng: parsedLng }
      : undefined

  if (!Number.isSafeInteger(spaceId) || spaceId <= 0) {
    return (
      <div className="p-4">
        <Card className="mx-auto max-w-2xl">
          <CardHeader>
            <CardTitle>Choose a parking space first</CardTitle>
            <CardDescription>
              Return to Find Spaces and select one of the results.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  const supabase = await createClient()
  const { data: space, error } = await supabase
    .from("spaces")
    .select(
      "id, space_name, description, photo_url, user_id, pricing_type, fixed_price, hourly_price, latitude, longitude"
    )
    .eq("id", spaceId)
    .single()

  if (error || !space) {
    return (
      <div className="p-4">
        <Card className="mx-auto max-w-2xl">
          <CardHeader>
            <CardTitle>Space not found</CardTitle>
            <CardDescription>
              This listing may have been removed or is not currently visible.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      <BookSpaceForm
        space={{
          id: space.id,
          spaceName: space.space_name,
          description: space.description,
          photoUrl: space.photo_url,
          ownerId: space.user_id,
          pricingType: space.pricing_type,
          fixedPrice: space.fixed_price,
          hourlyPrice: space.hourly_price,
          latitude: space.latitude,
          longitude: space.longitude,
        }}
        initialUserLocation={initialUserLocation}
      />
    </div>
  )
}
