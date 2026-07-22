"use client"

import dynamic from "next/dynamic"
import { useState, type ChangeEvent, type FormEvent } from "react"

import { createClient } from "@/lib/supabase/client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import type { Coordinates } from "@/lib/coordinates"
import { parseGoogleMapsCoordinates } from "@/lib/coordinates"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import { LocateFixedIcon } from "lucide-react"

type PricingType = "fixed" | "hourly" | "both"

const PRICING_OPTIONS: { value: PricingType; label: string }[] = [
  { value: "fixed", label: "Fixed price" },
  { value: "hourly", label: "Hourly rate" },
  { value: "both", label: "Booking fee + hourly rate" },
]

const LocationPicker = dynamic(
  () =>
    import("@/components/location-picker").then((mod) => mod.LocationPicker),
  {
    ssr: false,
    loading: () => (
      <div className="h-64 animate-pulse rounded-md border bg-muted" />
    ),
  }
)

export function RegisterSpaceForm() {
  const [supabase] = useState(() => createClient())
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [coordinates, setCoordinates] = useState<Coordinates | null>(null)
  const [coordinateInput, setCoordinateInput] = useState("")
  const [coordinateInputError, setCoordinateInputError] = useState<string | null>(
    null
  )
  const [isLocating, setIsLocating] = useState(false)
  const [pricingType, setPricingType] = useState<PricingType>("fixed")
  const [fixedPrice, setFixedPrice] = useState("")
  const [hourlyPrice, setHourlyPrice] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handlePhotoChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null
    setPhotoFile(file)
    setPhotoPreview(file ? URL.createObjectURL(file) : null)
  }

  const handleApplyCoordinates = () => {
    const result = parseGoogleMapsCoordinates(coordinateInput)

    if (!result.ok) {
      setCoordinateInputError(result.error)
      return
    }

    setCoordinateInputError(null)
    setError(null)
    setCoordinates(result.coordinates)
  }

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError("Geolocation isn't supported in this browser.")
      return
    }

    setIsLocating(true)
    setError(null)

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoordinates({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        })
        setIsLocating(false)
      },
      () => {
        setError("Couldn't get your location — drop a pin on the map instead.")
        setIsLocating(false)
      }
    )
  }

  const parsePrice = (value: string) => {
    const parsed = parseFloat(value)
    return Number.isNaN(parsed) ? null : parsed
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitted(false)

    if (!name.trim() || !description.trim() || !photoFile || !coordinates) {
      setError("Please fill in every field, including a photo and map pin.")
      return
    }

    const { lat, lng } = coordinates

    if (lat < -90 || lat > 90) {
      setError("Latitude must be between -90 and 90.")
      return
    }

    if (lng < -180 || lng > 180) {
      setError("Longitude must be between -180 and 180.")
      return
    }

    const parsedFixedPrice = parsePrice(fixedPrice)
    const parsedHourlyPrice = parsePrice(hourlyPrice)

    if (pricingType === "fixed" || pricingType === "both") {
      if (parsedFixedPrice === null || parsedFixedPrice <= 0) {
        setError("Enter a fixed price greater than 0.")
        return
      }
    }

    if (pricingType === "hourly" || pricingType === "both") {
      if (parsedHourlyPrice === null || parsedHourlyPrice <= 0) {
        setError("Enter an hourly rate greater than 0.")
        return
      }
    }

    setIsSubmitting(true)

    let uploadedPhotoPath: string | null = null

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError) throw userError
      if (!user) throw new Error("You must be signed in to register a space.")

      const extension = photoFile.name.split(".").pop()?.toLowerCase() || "jpg"
      uploadedPhotoPath = `${user.id}/${crypto.randomUUID()}.${extension}`

      const { error: uploadError } = await supabase.storage
        .from("space-photos")
        .upload(uploadedPhotoPath, photoFile, {
          cacheControl: "3600",
          contentType: photoFile.type || undefined,
          upsert: false,
        })

      if (uploadError) throw uploadError

      const { data: publicUrlData } = supabase.storage
        .from("space-photos")
        .getPublicUrl(uploadedPhotoPath)

      const { error: insertError } = await supabase.from("spaces").insert({
        space_name: name.trim(),
        description: description.trim(),
        latitude: String(lat),
        longitude: String(lng),
        pricing_type: pricingType,
        fixed_price:
          pricingType === "fixed" || pricingType === "both"
            ? parsedFixedPrice
            : null,
        hourly_price:
          pricingType === "hourly" || pricingType === "both"
            ? parsedHourlyPrice
            : null,
        photo_url: publicUrlData.publicUrl,
        user_id: user.id,
      })

      if (insertError) throw insertError

      setSubmitted(true)
      setName("")
      setDescription("")
      setPhotoFile(null)
      setPhotoPreview(null)
      setCoordinates(null)
      setCoordinateInput("")
      setPricingType("fixed")
      setFixedPrice("")
      setHourlyPrice("")
    } catch (caughtError) {
      if (uploadedPhotoPath) {
        await supabase.storage.from("space-photos").remove([uploadedPhotoPath])
      }

      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "The space could not be registered."
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card className="mx-auto w-full max-w-2xl">
      <CardHeader>
        <CardTitle>Register a Parking Space</CardTitle>
        <CardDescription>All fields below are required.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <FieldGroup className="gap-4">
            <Field>
              <FieldLabel htmlFor="space-name">Space Name</FieldLabel>
              <Input
                id="space-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Driveway on Elm Street"
                required
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="space-description">
                Description / Instructions
              </FieldLabel>
              <Textarea
                id="space-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Park behind the white gate, don't block the bins"
                rows={4}
                required
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="space-photo">Photo</FieldLabel>
              <Input
                id="space-photo"
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                required
              />
              {photoPreview && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={photoPreview}
                  alt="Space preview"
                  className="mt-2 h-40 w-full rounded-md object-cover"
                />
              )}
            </Field>

            <Field>
              <div className="flex items-center justify-between">
                <FieldLabel>Location</FieldLabel>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleUseCurrentLocation}
                  disabled={isLocating}
                >
                  <LocateFixedIcon className="size-4" />
                  {isLocating ? "Locating..." : "Use current location"}
                </Button>
              </div>
              <FieldDescription>
                Drop a pin on the map, use your current location, or paste
                coordinates from a Google Maps pin.
              </FieldDescription>

              <LocationPicker value={coordinates} onChange={setCoordinates} />

              <div className="flex flex-col gap-2 pt-1">
                <FieldLabel htmlFor="space-coordinates">
                  Or paste Google Maps coordinates
                </FieldLabel>
                <div className="flex gap-2">
                  <Input
                    id="space-coordinates"
                    value={coordinateInput}
                    onChange={(e) => {
                      setCoordinateInput(e.target.value)
                      setCoordinateInputError(null)
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault()
                        handleApplyCoordinates()
                      }
                    }}
                    placeholder={'49°11\'37.9"N 2°06\'32.8"W'}
                    className="font-mono text-sm"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleApplyCoordinates}
                  >
                    Apply
                  </Button>
                </div>
                <FieldDescription>
                  Right-click a pin in Google Maps and copy the coordinates,
                  then paste them here.
                </FieldDescription>
                {coordinateInputError && (
                  <p className="text-sm text-destructive">{coordinateInputError}</p>
                )}
              </div>
            </Field>

            <Field>
              <FieldLabel>Pricing</FieldLabel>
              <FieldDescription>
                Choose how this space is priced and enter the amounts in GBP. A
                booking fee plus hourly rate charges both amounts.
              </FieldDescription>

              <div className="flex flex-col gap-4">
                <Field>
                  <FieldLabel htmlFor="pricing-type">Pricing type</FieldLabel>
                  <Select
                    value={pricingType}
                    onValueChange={(value) => setPricingType(value as PricingType)}
                  >
                    <SelectTrigger id="pricing-type" className="w-full">
                      <SelectValue placeholder="Select pricing type" />
                    </SelectTrigger>
                    <SelectContent>
                      {PRICING_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                {(pricingType === "fixed" || pricingType === "both") && (
                  <Field>
                    <FieldLabel htmlFor="fixed-price">
                      {pricingType === "both" ? "Booking fee" : "Fixed price"}
                    </FieldLabel>
                    <Input
                      id="fixed-price"
                      type="number"
                      min={0}
                      step="0.01"
                      value={fixedPrice}
                      onChange={(e) => setFixedPrice(e.target.value)}
                      placeholder="e.g. 15.00"
                      required
                    />
                    <FieldDescription>
                      {pricingType === "both"
                        ? "One-off fee added to the hourly charge (GBP)."
                        : "One-off price for the booking (GBP)."}
                    </FieldDescription>
                  </Field>
                )}

                {(pricingType === "hourly" || pricingType === "both") && (
                  <Field>
                    <FieldLabel htmlFor="hourly-price">Hourly rate</FieldLabel>
                    <Input
                      id="hourly-price"
                      type="number"
                      min={0}
                      step="0.01"
                      value={hourlyPrice}
                      onChange={(e) => setHourlyPrice(e.target.value)}
                      placeholder="e.g. 3.50"
                      required
                    />
                    <FieldDescription>
                      Price charged per hour (GBP).
                    </FieldDescription>
                  </Field>
                )}
              </div>
            </Field>
          </FieldGroup>

          {error && <p className="text-sm text-destructive">{error}</p>}

          {submitted && (
            <p className="text-sm text-emerald-600">
              Space registered successfully.
            </p>
          )}

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Registering..." : "Register Space"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}