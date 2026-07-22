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
    startsAt?: string | string[]
    endsAt?: string | string[]
    mode?: string | string[]
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
  const initialStartsAt = Array.isArray(params.startsAt)
    ? params.startsAt[0]
    : params.startsAt
  const initialEndsAt = Array.isArray(params.endsAt)
    ? params.endsAt[0]
    : params.endsAt
  const rawMode = Array.isArray(params.mode) ? params.mode[0] : params.mode
  const initialBookingMode =
    rawMode === "fixed" || rawMode === "hourly" ? rawMode : undefined

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
      "id, space_name, description, photo_url, user_id, pricing_type, fixed_price, hourly_price"
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
        }}
        initialStartsAt={initialStartsAt}
        initialEndsAt={initialEndsAt}
        initialBookingMode={initialBookingMode}
      />
    </div>
  )
}
