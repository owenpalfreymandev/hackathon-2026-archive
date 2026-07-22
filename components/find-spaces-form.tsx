"use client"

import dynamic from "next/dynamic"
import { useMemo, useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import {
  CarFrontIcon,
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
import type { Coordinates } from "@/lib/coordinates"
import { parseGoogleMapsCoordinates } from "@/lib/coordinates"
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

type NearbySpace = SpaceRow & {
  coordinates: Coordinates
  distanceKm: number
}

type GeocodeResult = {
  id: string
  displayName: string
  lat: number
  lng: number
}

function getSpacePriceLabel(space: SpaceRow): string {
  const labels: string[] = []

  if (
    (space.pricing_type === "hourly" || space.pricing_type === "both") &&
    space.hourly_price !== null
  ) {
    labels.push(`${formatPounds(space.hourly_price)}/hr`)
  }

  if (
    (space.pricing_type === "fixed" || space.pricing_type === "both") &&
    space.fixed_price !== null
  ) {
    labels.push(`${formatPounds(space.fixed_price)} fixed`)
  }

  return labels.length > 0 ? labels.join(" · ") : "Price unavailable"
}

export function FindSpacesForm() {
  const router = useRouter()
  const [address, setAddress] = useState("")
  const [addressResults, setAddressResults] = useState<GeocodeResult[]>([])
  const [isSearchingAddress, setIsSearchingAddress] = useState(false)
  const [coordinateInput, setCoordinateInput] = useState("")
  const [location, setLocation] = useState<Coordinates | null>(null)
  const [nearbySpaces, setNearbySpaces] = useState<NearbySpace[]>([])
  const [selectedSpaceId, setSelectedSpaceId] = useState<number | null>(null)
  const [isLocating, setIsLocating] = useState(false)
  const [isLoadingSpaces, setIsLoadingSpaces] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const selectedSpace =
    nearbySpaces.find((space) => space.id === selectedSpaceId) ?? null

  const mapMarkers = useMemo<LocationMarker[]>(
    () =>
      nearbySpaces.map((space) => ({
        id: String(space.id),
        lat: space.coordinates.lat,
        lng: space.coordinates.lng,
        colour: space.id === selectedSpaceId ? "blue" : "red",
        title: `${space.space_name} — ${getSpacePriceLabel(space)}`,
      })),
    [nearbySpaces, selectedSpaceId]
  )

  const updateLocation = (coordinates: Coordinates) => {
    setLocation(coordinates)
    setNearbySpaces([])
    setSelectedSpaceId(null)
    setHasSearched(false)
    setAddressResults([])
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
        updateLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        })
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

    setIsLoadingSpaces(true)
    setHasSearched(false)
    setSelectedSpaceId(null)
    setError(null)

    try {
      const supabase = createClient()
      const { data, error: queryError } = await supabase
        .from("spaces")
        .select(
          "id, space_name, description, latitude, longitude, pricing_type, fixed_price, hourly_price, photo_url, user_id"
        )
        .limit(1000)

      if (queryError) throw queryError

      const nearest = ((data ?? []) as SpaceRow[])
        .map((space) => {
          const latitude = Number(space.latitude)
          const longitude = Number(space.longitude)

          if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
            return null
          }

          const coordinates = { lat: latitude, lng: longitude }

          return {
            ...space,
            coordinates,
            distanceKm: distanceBetweenKm(location, coordinates),
          }
        })
        .filter((space): space is NearbySpace => space !== null)
        .sort((first, second) => first.distanceKm - second.distanceKm)
        .slice(0, 5)

      setNearbySpaces(nearest)
      setHasSearched(true)

      if (nearest.length === 0) {
        setError("No valid parking spaces are currently available.")
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

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Find a parking space</CardTitle>
          <CardDescription>
            Choose where you are travelling to, then compare the five nearest
            listed spaces.
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
                You can also click or drag the green pin on the map.
              </FieldDescription>
            </Field>
          </FieldGroup>

          <LocationPicker
            value={location}
            onChange={updateLocation}
            markers={mapMarkers}
            onMarkerClick={(id) => setSelectedSpaceId(Number(id))}
          />

          <div className="flex justify-end">
            <Button
              type="button"
              size="lg"
              onClick={handleFindSpaces}
              disabled={!location || isLoadingSpaces}
            >
              <NavigationIcon />
              {isLoadingSpaces ? "Finding spaces…" : "Find nearest spaces"}
            </Button>
          </div>

          {error && (
            <p className="rounded-2xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </p>
          )}
        </CardContent>
      </Card>

      {hasSearched && nearbySpaces.length > 0 && (
        <section className="space-y-3">
          <div>
            <h2 className="text-xl font-semibold">Nearest spaces</h2>
            <p className="text-sm text-muted-foreground">
              Select a result card or its marker on the map.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {nearbySpaces.map((space) => {
              const isSelected = space.id === selectedSpaceId

              return (
                <Card
                  key={space.id}
                  className={cn(
                    "cursor-pointer transition-[box-shadow,transform] hover:-translate-y-0.5",
                    isSelected && "ring-2 ring-primary"
                  )}
                  onClick={() => setSelectedSpaceId(space.id)}
                >
                  <img
                    src={space.photo_url}
                    alt={space.space_name}
                    className="h-44 w-full object-cover"
                  />
                  <CardHeader>
                    <CardTitle>{space.space_name}</CardTitle>
                    <CardDescription className="line-clamp-2">
                      {space.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <p className="flex items-center gap-2 font-medium">
                      <CarFrontIcon className="size-4" />
                      {getSpacePriceLabel(space)}
                    </p>
                    <p className="flex items-center gap-2 text-muted-foreground">
                      <NavigationIcon className="size-4" />
                      {formatDistance(space.distanceKm)}
                    </p>
                  </CardContent>
                  <CardFooter>
                    <Button
                      type="button"
                      className="w-full"
                      variant={isSelected ? "default" : "outline"}
                      aria-pressed={isSelected}
                      onClick={(event) => {
                        event.stopPropagation()
                        setSelectedSpaceId(space.id)
                      }}
                    >
                      {isSelected ? "Selected" : "Select space"}
                    </Button>
                  </CardFooter>
                </Card>
              )
            })}
          </div>
        </section>
      )}

      {selectedSpace && (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader>
            <CardTitle>Selected: {selectedSpace.space_name}</CardTitle>
            <CardDescription>
              {getSpacePriceLabel(selectedSpace)} · {formatDistance(selectedSpace.distanceKm)}
            </CardDescription>
          </CardHeader>
          <CardFooter className="justify-end">
            <Button
              type="button"
              size="lg"
              onClick={() => {
                const params = new URLSearchParams()
                params.set("spaceId", String(selectedSpace.id))
                if (location) {
                  params.set("userLat", String(location.lat))
                  params.set("userLng", String(location.lng))
                }
                router.push(`/dashboard/book-space?${params.toString()}`)
              }}
            >
              Book this space
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  )
}
