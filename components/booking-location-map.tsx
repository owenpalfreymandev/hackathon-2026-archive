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
  const latitudeSpan = 0.0035
  const longitudeSpan = 0.006
  const bbox = [
    longitude - longitudeSpan,
    latitude - latitudeSpan,
    longitude + longitudeSpan,
    latitude + latitudeSpan,
  ].join(",")

  const source = `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(
    bbox
  )}&layer=mapnik&marker=${encodeURIComponent(`${latitude},${longitude}`)}`

  return (
    <div className="overflow-hidden rounded-xl border bg-muted">
      <iframe
        title={`Map showing ${spaceName}`}
        src={source}
        className="h-72 w-full"
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
      />
    </div>
  )
}
