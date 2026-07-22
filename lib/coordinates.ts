export type Coordinates = {
  lat: number
  lng: number
}

/** Default map view: Jersey, Channel Islands */
export const JERSEY_CENTER: Coordinates = { lat: 49.214, lng: -2.131 }

export const DEFAULT_MAP_ZOOM = 11
export const PIN_MAP_ZOOM = 15

type ParseResult =
  | { ok: true; coordinates: Coordinates }
  | { ok: false; error: string }

function dmsToDecimal(
  degrees: number,
  minutes: number,
  seconds: number,
  direction: string
): number {
  let decimal = degrees + minutes / 60 + seconds / 3600
  if (direction === "S" || direction === "W") {
    decimal = -decimal
  }
  return decimal
}

function isValidCoordinates(lat: number, lng: number): boolean {
  return (
    !Number.isNaN(lat) &&
    !Number.isNaN(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  )
}

function parseDmsComponents(input: string): Coordinates | null {
  const regex = /(\d+)[°º]\s*(\d+)['′]\s*([\d.]*)["″]?\s*([NSEW])/gi
  const matches = [...input.matchAll(regex)]

  if (matches.length < 2) {
    return null
  }

  let lat: number | null = null
  let lng: number | null = null

  for (const match of matches) {
    const degrees = Number(match[1])
    const minutes = Number(match[2])
    const seconds = match[3] ? Number(match[3]) : 0
    const direction = match[4].toUpperCase()
    const decimal = dmsToDecimal(degrees, minutes, seconds, direction)

    if (direction === "N" || direction === "S") {
      if (lat !== null) return null
      lat = decimal
    } else {
      if (lng !== null) return null
      lng = decimal
    }
  }

  if (lat === null || lng === null) {
    return null
  }

  return { lat, lng }
}

function parseDecimalCoordinates(input: string): Coordinates | null {
  const match =
    input.match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/) ??
    input.match(/^(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)$/)

  if (!match) {
    return null
  }

  const lat = parseFloat(match[1])
  const lng = parseFloat(match[2])

  if (!isValidCoordinates(lat, lng)) {
    return null
  }

  return { lat, lng }
}

export function parseGoogleMapsCoordinates(input: string): ParseResult {
  const trimmed = input.trim()

  if (!trimmed) {
    return { ok: false, error: "Enter coordinates copied from Google Maps." }
  }

  const dms = parseDmsComponents(trimmed)
  if (dms && isValidCoordinates(dms.lat, dms.lng)) {
    return { ok: true, coordinates: dms }
  }

  const decimal = parseDecimalCoordinates(trimmed)
  if (decimal) {
    return { ok: true, coordinates: decimal }
  }

  return {
    ok: false,
    error:
      'Could not read those coordinates. Paste them like 49°11\'37.9"N 2°06\'32.8"W.',
  }
}
