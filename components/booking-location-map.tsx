import { LocationPicker } from "@/components/location-picker"

type BookingLocationMapProps = {
  latitude: number
  longitude: number
  spaceName: string
}

export function BookingLocationMap({
  latitude,
  longitude,
  spaceName,
}: BookingLocationMapProps) {
  return (
    <div
      className="overflow-hidden rounded-xl border bg-muted"
      aria-label={`Map showing ${spaceName}`}
    >
      <LocationPicker
        value={null}
        interactive={false}
        className="h-72"
        markers={[
          {
            id: `booking-${latitude}-${longitude}`,
            lat: latitude,
            lng: longitude,
            colour: "blue",
            title: spaceName,
          },
        ]}
      />
    </div>
  )
}
