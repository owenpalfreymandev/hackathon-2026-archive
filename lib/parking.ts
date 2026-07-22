import type { Coordinates } from "@/lib/coordinates"

const EARTH_RADIUS_KM = 6371.0088

export function distanceBetweenKm(
  first: Coordinates,
  second: Coordinates
): number {
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180
  const latitudeDifference = toRadians(second.lat - first.lat)
  const longitudeDifference = toRadians(second.lng - first.lng)
  const firstLatitude = toRadians(first.lat)
  const secondLatitude = toRadians(second.lat)

  const haversine =
    Math.sin(latitudeDifference / 2) ** 2 +
    Math.cos(firstLatitude) *
      Math.cos(secondLatitude) *
      Math.sin(longitudeDifference / 2) ** 2

  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(haversine))
}

export function formatDistance(distanceKm: number): string {
  if (distanceKm < 1) {
    return `${Math.max(1, Math.round(distanceKm * 1000))} m away`
  }

  return `${distanceKm.toFixed(distanceKm < 10 ? 1 : 0)} km away`
}

export function formatPounds(value: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(value)
}
