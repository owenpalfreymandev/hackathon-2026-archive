"use client"

import dynamic from "next/dynamic"
import { useEffect, useMemo, useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import {
  AlertTriangleIcon,
  CalendarClockIcon,
  CarFrontIcon,
  ClockIcon,
  LocateFixedIcon,
  MapPinIcon,
  NavigationIcon,
  SearchIcon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import type { LocationMarker } from "@/components/location-picker"
import {
  isWithinJersey,
  parseGoogleMapsCoordinates,
  type Coordinates,
} from "@/lib/coordinates"
import {
  distanceBetweenKm,
  formatDistance,
  formatPounds,
} from "@/lib/parking"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"

const LocationPicker = dynamic(
  () =>
    import("@/components/location-picker").then((module) =>
      module.LocationPicker
    ),
  {
    ssr: false,
    loading: () => (
      <div className="h-80 animate-pulse rounded-md border bg-muted" />
    ),
  }
)

type SpaceRow = {
  id: number
  space_name: string
  description: string
  latitude: string
  longitude: string
  pricing_type: string
  fixed_price: number | null
  hourly_price: number | null
  photo_url: string
  user_id: string
}

type AvailabilityRow = {
  space_id: number
  is_available: boolean
  availability_reason: string | null
}

type PriceQuote = {
  total: number
  effectiveHourly: number
}

type NearbySpace = SpaceRow & {
  coordinates: Coordinates
  distanceKm: number
  isAvailable: boolean
  availabilityReason: string | null
  quote: PriceQuote | null
}

type GeocodeResult = {
  id: string
  displayName: string
  lat: number
  lng: number
}

function getDurationHours(startsAt: Date, endsAt: Date): number {
  return (endsAt.getTime() - startsAt.getTime()) / 3_600_000
}

function getPriceQuote(space: SpaceRow, durationHours: number): PriceQuote | null {
  const fixedPrice = space.fixed_price
  const hourlyPrice = space.hourly_price
  const billedHours = Math.ceil(durationHours * 4) / 4

  if (space.pricing_type === "both") {
    if (!fixedPrice || !hourlyPrice) return null

    return {
      total: fixedPrice + billedHours * hourlyPrice,
      effectiveHourly: hourlyPrice,
    }
  }

  if (space.pricing_type === "hourly" && hourlyPrice) {
    return { total: billedHours * hourlyPrice, effectiveHourly: hourlyPrice }
  }

  if (space.pricing_type === "fixed" && fixedPrice) {
    return { total: fixedPrice, effectiveHourly: fixedPrice / durationHours }
  }

  return null
}

function getMapPriceLabel(space: NearbySpace): string {
  if (!space.quote) return "No price"

  if (space.pricing_type === "both" && space.fixed_price && space.hourly_price) {
    return `${formatPounds(space.fixed_price)} + ${formatPounds(space.hourly_price)}/hr`
  }

  const suffix = space.pricing_type === "fixed" ? "/hr eq." : "/hr"
  return `${formatPounds(space.quote.effectiveHourly)}${suffix}`
}

function getPriceDetail(space: NearbySpace): string {
  if (!space.quote) return "Price unavailable"

  const suffix = space.pricing_type === "fixed" ? "fixed rate" : "for your stay"
  return `${formatPounds(space.quote.total)} ${suffix}`
}

function buildRequestedTimes(
  bookingDate: string,
  startTime: string,
  endTime: string
): { startsAt: Date; endsAt: Date } | null {
  if (!bookingDate || !startTime || !endTime) return null

  const startsAt = new Date(`${bookingDate}T${startTime}`)
  const endsAt = new Date(`${bookingDate}T${endTime}`)

  if (
    !Number.isFinite(startsAt.getTime()) ||
    !Number.isFinite(endsAt.getTime()) ||
    endsAt <= startsAt
  ) {
    return null
  }

  return { startsAt, endsAt }
}

function toLocalDateInput(date: Date): string {
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return localDate.toISOString().slice(0, 10)
}

function toLocalTimeInput(date: Date): string {
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return localDate.toISOString().slice(11, 16)
}

export function FindSpacesForm() {
  const router = useRouter()
  const [address, setAddress] = useState("")
  const [addressResults, setAddressResults] = useState<GeocodeResult[]>([])
  const [isSearchingAddress, setIsSearchingAddress] = useState(false)
  const [coordinateInput, setCoordinateInput] = useState("")
  const [location, setLocation] = useState<Coordinates | null>(null)
  const [bookingDate, setBookingDate] = useState("")
  const [startTime, setStartTime] = useState("")
  const [endTime, setEndTime] = useState("")
  const [availableSpaces, setAvailableSpaces] = useState<NearbySpace[]>([])
  const [unavailableSpaces, setUnavailableSpaces] = useState<NearbySpace[]>([])
  const [selectedSpaceId, setSelectedSpaceId] = useState<number | null>(null)
  const [isLocating, setIsLocating] = useState(false)
  const [isLoadingSpaces, setIsLoadingSpaces] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [now, setNow] = useState<Date | null>(null)

  useEffect(() => {
    const initialization = window.setTimeout(() => {
      const initialNow = new Date()
      setNow(initialNow)
      setBookingDate(toLocalDateInput(initialNow))
    }, 0)

    const interval = window.setInterval(() => setNow(new Date()), 60_000)
    return () => {
      window.clearTimeout(initialization)
      window.clearInterval(interval)
    }
  }, [])

  const requestedTimes = useMemo(
    () => buildRequestedTimes(bookingDate, startTime, endTime),
    [bookingDate, startTime, endTime]
  )

  const selectedSpace =
    availableSpaces.find((space) => space.id === selectedSpaceId) ?? null

  const mapMarkers = useMemo<LocationMarker[]>(
    () => [
      ...availableSpaces.map((space) => ({
        id: String(space.id),
        lat: space.coordinates.lat,
        lng: space.coordinates.lng,
        colour: "green" as const,
        label: getMapPriceLabel(space),
        title: `${space.id === selectedSpaceId ? "Selected: " : ""}${space.space_name} — available — ${getPriceDetail(space)} — ${formatDistance(space.distanceKm)}`,
        selected: space.id === selectedSpaceId,
      })),
      ...unavailableSpaces.map((space) => ({
        id: `unavailable-${space.id}`,
        lat: space.coordinates.lat,
        lng: space.coordinates.lng,
        colour: "amber" as const,
        label: getMapPriceLabel(space),
        title: `${space.space_name} — ${space.availabilityReason ?? "Unavailable at your selected time"}`,
        disabled: true,
      })),
    ],
    [availableSpaces, unavailableSpaces, selectedSpaceId]
  )

  const resetResults = () => {
    setAvailableSpaces([])
    setUnavailableSpaces([])
    setSelectedSpaceId(null)
    setHasSearched(false)
  }

  const updateLocation = (coordinates: Coordinates) => {
    setLocation(coordinates)
    resetResults()
    setAddressResults([])
    setError(null)
  }

  const updateAvailabilityInput = (setter: (value: string) => void, value: string) => {
    setter(value)
    resetResults()
    setError(null)
  }

  const handleAddressSearch = async (event: FormEvent) => {
    event.preventDefault()
    const query = address.trim()

    if (query.length < 3) {
      setError("Enter at least three characters of the address.")
      return
    }

    setIsSearchingAddress(true)
    setAddressResults([])
    setError(null)

    try {
      const response = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`)
      const body = (await response.json()) as {
        results?: GeocodeResult[]
        error?: string
      }

      if (!response.ok) {
        throw new Error(body.error ?? "Address search failed.")
      }

      const results = body.results ?? []
      setAddressResults(results)

      if (results.length === 0) {
        setError("No Jersey address matched that search.")
      }
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Address search failed."
      )
    } finally {
      setIsSearchingAddress(false)
    }
  }

  const handleApplyCoordinates = () => {
    const result = parseGoogleMapsCoordinates(coordinateInput)

    if (!result.ok) {
      setError(result.error)
      return
    }

    updateLocation(result.coordinates)
  }

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by this browser.")
      return
    }

    setIsLocating(true)
    setError(null)

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coordinates = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        }
        if (!isWithinJersey(coordinates)) {
          setError("Your current location is outside Jersey.")
          setIsLocating(false)
          return
        }
        updateLocation(coordinates)
        setIsLocating(false)
      },
      () => {
        setError("Could not get your location. Choose it on the map instead.")
        setIsLocating(false)
      }
    )
  }

  const handleFindSpaces = async () => {
    if (!location) {
      setError("Choose a search location first.")
      return
    }

    if (!requestedTimes) {
      setError("Choose a valid date, start time and end time before searching.")
      return
    }

    if (requestedTimes.startsAt.getTime() <= Date.now()) {
      setError("Choose a start time in the future.")
      return
    }

    setIsLoadingSpaces(true)
    setHasSearched(false)
    setSelectedSpaceId(null)
    setError(null)

    try {
      const supabase = createClient()
      const [spacesResult, availabilityResult, userResult] = await Promise.all([
        supabase
          .from("spaces")
          .select(
            "id, space_name, description, latitude, longitude, pricing_type, fixed_price, hourly_price, photo_url, user_id"
          )
          .limit(1000),
        supabase.rpc("search_space_availability", {
          p_starts_at: requestedTimes.startsAt.toISOString(),
          p_ends_at: requestedTimes.endsAt.toISOString(),
        }),
        supabase.auth.getUser(),
      ])

      if (spacesResult.error) throw spacesResult.error
      if (availabilityResult.error) throw availabilityResult.error

      const availabilityBySpace = new Map<number, AvailabilityRow>()
      for (const row of (availabilityResult.data ?? []) as AvailabilityRow[]) {
        availabilityBySpace.set(Number(row.space_id), {
          ...row,
          space_id: Number(row.space_id),
        })
      }

      const durationHours = getDurationHours(
        requestedTimes.startsAt,
        requestedTimes.endsAt
      )
      const currentUserId = userResult.data.user?.id ?? null

      const candidates = ((spacesResult.data ?? []) as SpaceRow[])
        .filter((space) => space.user_id !== currentUserId)
        .map((space) => {
          const latitude = Number(space.latitude)
          const longitude = Number(space.longitude)

          if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
            return null
          }

          const coordinates = { lat: latitude, lng: longitude }
          const availability = availabilityBySpace.get(Number(space.id))

          return {
            ...space,
            id: Number(space.id),
            coordinates,
            distanceKm: distanceBetweenKm(location, coordinates),
            isAvailable: availability?.is_available ?? false,
            availabilityReason: availability
              ? availability.availability_reason
              : "Availability could not be confirmed",
            quote: getPriceQuote(space, durationHours),
          }
        })
        .filter((space): space is NearbySpace => space !== null && space.quote !== null)
        .sort((first, second) => first.distanceKm - second.distanceKm)

      const nearestAvailable = candidates
        .filter((space) => space.isAvailable)
        .slice(0, 5)
      const nearestUnavailable = candidates
        .filter((space) => !space.isAvailable)
        .slice(0, 5)

      setAvailableSpaces(nearestAvailable)
      setUnavailableSpaces(nearestUnavailable)
      setHasSearched(true)

      if (nearestAvailable.length === 0) {
        setError(
          nearestUnavailable.length > 0
            ? "No nearby spaces are free for that time. Amber pins show the closest alternatives that are unavailable."
            : "No valid parking spaces were found near that location."
        )
      }
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Could not fetch parking spaces."
      )
    } finally {
      setIsLoadingSpaces(false)
    }
  }

  const openBooking = (space: NearbySpace) => {
    if (!requestedTimes || !space.quote) return

    const params = new URLSearchParams({
      spaceId: String(space.id),
      startsAt: requestedTimes.startsAt.toISOString(),
      endsAt: requestedTimes.endsAt.toISOString(),
    })

    router.push(`/dashboard/book-space?${params.toString()}`)
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Find a parking space</CardTitle>
          <CardDescription>
            Choose your destination and the exact time you need it. Prices and
            availability are then compared directly on the map.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="address">Search by address</FieldLabel>
              <form
                className="flex flex-col gap-2 sm:flex-row"
                onSubmit={handleAddressSearch}
              >
                <Input
                  id="address"
                  value={address}
                  onChange={(event) => setAddress(event.target.value)}
                  placeholder="King Street, St Helier"
                  autoComplete="street-address"
                />
                <Button type="submit" disabled={isSearchingAddress}>
                  <SearchIcon />
                  {isSearchingAddress ? "Searching…" : "Search"}
                </Button>
              </form>

              {addressResults.length > 0 && (
                <div className="overflow-hidden rounded-2xl border">
                  {addressResults.map((result) => (
                    <button
                      key={result.id}
                      type="button"
                      className="flex w-full items-start gap-2 border-b px-3 py-2 text-left text-sm transition-colors last:border-b-0 hover:bg-muted"
                      onClick={() => {
                        setAddress(result.displayName)
                        updateLocation({ lat: result.lat, lng: result.lng })
                      }}
                    >
                      <MapPinIcon className="mt-0.5 size-4 shrink-0" />
                      <span>{result.displayName}</span>
                    </button>
                  ))}
                </div>
              )}
            </Field>

            <Field>
              <FieldLabel htmlFor="coordinates">
                Or paste coordinates
              </FieldLabel>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  id="coordinates"
                  value={coordinateInput}
                  onChange={(event) => setCoordinateInput(event.target.value)}
                  placeholder={'49°11\'37.9"N 2°06\'32.8"W or 49.1939, -2.1091'}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleApplyCoordinates}
                >
                  Apply
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleUseCurrentLocation}
                  disabled={isLocating}
                >
                  <LocateFixedIcon />
                  {isLocating ? "Locating…" : "Use my location"}
                </Button>
              </div>
              <FieldDescription>
                You can also click the map or drag the blue target pin.
              </FieldDescription>
            </Field>
          </FieldGroup>

          <LocationPicker
            value={location}
            onChange={updateLocation}
            markers={mapMarkers}
            onMarkerClick={(id) => setSelectedSpaceId(Number(id))}
          />

          {location && (
            <div className="rounded-2xl border bg-muted/30 p-4">
              <div className="mb-4 flex items-start gap-3">
                <CalendarClockIcon className="mt-0.5 size-5 text-primary" />
                <div>
                  <h2 className="font-semibold">When do you need the space?</h2>
                  <p className="text-sm text-muted-foreground">
                    Only spaces free for this entire period will be selectable.
                  </p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <Field>
                  <FieldLabel htmlFor="booking-date">Date</FieldLabel>
                  <Input
                    id="booking-date"
                    type="date"
                    min={now ? toLocalDateInput(now) : undefined}
                    value={bookingDate}
                    onChange={(event) =>
                      updateAvailabilityInput(setBookingDate, event.target.value)
                    }
                    required
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="start-time">From</FieldLabel>
                  <Input
                    id="start-time"
                    type="time"
                    step={900}
                    min={
                      now && bookingDate === toLocalDateInput(now)
                        ? toLocalTimeInput(now)
                        : undefined
                    }
                    value={startTime}
                    onChange={(event) =>
                      updateAvailabilityInput(setStartTime, event.target.value)
                    }
                    required
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="end-time">Until</FieldLabel>
                  <Input
                    id="end-time"
                    type="time"
                    step={900}
                    value={endTime}
                    onChange={(event) =>
                      updateAvailabilityInput(setEndTime, event.target.value)
                    }
                    required
                  />
                </Field>
              </div>
            </div>
          )}

          <div className="flex justify-end">
            <Button
              type="button"
              size="lg"
              onClick={handleFindSpaces}
              disabled={!location || !requestedTimes || isLoadingSpaces}
            >
              <NavigationIcon />
              {isLoadingSpaces ? "Checking availability…" : "Find available spaces"}
            </Button>
          </div>

          {error && (
            <p className="rounded-2xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </p>
          )}

          {hasSearched && availableSpaces.length > 0 && (
            <div className="rounded-2xl border bg-background p-4">
              <div className="mb-3 flex items-center justify-between gap-4">
                <div>
                  <h2 className="font-semibold">Available at your time</h2>
                  <p className="text-sm text-muted-foreground">
                    Compare the price bubbles on the green pins, then select one.
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700 dark:bg-green-950 dark:text-green-200">
                  {availableSpaces.length} available
                </span>
              </div>

              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
                {availableSpaces.map((space) => {
                  const isSelected = space.id === selectedSpaceId

                  return (
                    <button
                      key={space.id}
                      type="button"
                      className={cn(
                        "rounded-xl border p-3 text-left transition-colors hover:bg-muted",
                        isSelected && "border-primary bg-primary/5 ring-1 ring-primary"
                      )}
                      onClick={() => setSelectedSpaceId(space.id)}
                    >
                      <p className="truncate text-sm font-semibold">
                        {space.space_name}
                      </p>
                      <p className="mt-1 text-lg font-bold">
                        {getMapPriceLabel(space)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {getPriceDetail(space)} · {formatDistance(space.distanceKm)}
                      </p>
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedSpace && (
        <Card className="border-primary/30 bg-primary/5">
          <div className="grid md:grid-cols-[220px_1fr]">
            <img
              src={selectedSpace.photo_url}
              alt={selectedSpace.space_name}
              className="h-48 w-full object-cover md:h-full"
            />
            <div>
              <CardHeader>
                <CardTitle>{selectedSpace.space_name}</CardTitle>
                <CardDescription className="line-clamp-2">
                  {selectedSpace.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-2 sm:grid-cols-3">
                <p className="flex items-center gap-2 font-medium">
                  <CarFrontIcon className="size-4" />
                  {getMapPriceLabel(selectedSpace)}
                </p>
                <p className="flex items-center gap-2 text-muted-foreground">
                  <ClockIcon className="size-4" />
                  {getPriceDetail(selectedSpace)}
                </p>
                <p className="flex items-center gap-2 text-muted-foreground">
                  <NavigationIcon className="size-4" />
                  {formatDistance(selectedSpace.distanceKm)}
                </p>
              </CardContent>
              <CardFooter className="justify-end">
                <Button
                  type="button"
                  size="lg"
                  onClick={() => openBooking(selectedSpace)}
                >
                  Book this space
                </Button>
              </CardFooter>
            </div>
          </div>
        </Card>
      )}

      {hasSearched && unavailableSpaces.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-start gap-3">
            <AlertTriangleIcon className="mt-0.5 size-5 text-amber-600" />
            <div>
              <h2 className="text-lg font-semibold">Nearby, but unavailable</h2>
              <p className="text-sm text-muted-foreground">
                These amber spaces are close to your destination, but do not
                cover the time you selected.
              </p>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {unavailableSpaces.map((space) => (
              <Card key={space.id} className="border-amber-300/60 bg-amber-50/40 opacity-80 dark:bg-amber-950/10">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{space.space_name}</CardTitle>
                  <CardDescription>
                    {space.availabilityReason ?? "Unavailable at your selected time"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex items-center justify-between gap-4 text-sm">
                  <span className="font-medium">{getMapPriceLabel(space)}</span>
                  <span className="text-muted-foreground">
                    {formatDistance(space.distanceKm)}
                  </span>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
