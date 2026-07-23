"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  CalendarDaysIcon,
  CheckCircle2Icon,
  ChevronDownIcon,
  ChevronUpIcon,
  Clock3Icon,
  MapPinIcon,
  PlusIcon,
  SaveIcon,
  Trash2Icon,
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
import { Input } from "@/components/ui/input"
import { formatPounds } from "@/lib/parking"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"

type AvailabilityMode = "always" | "schedule"

type WeeklyAvailabilityRow = {
  id: string
  day_of_week: number
  start_time: string
  end_time: string
}

type DateOverrideRow = {
  id: string
  availability_date: string
  is_available: boolean
  start_time: string | null
  end_time: string | null
  note: string | null
}

type SpaceRow = {
  id: number
  space_name: string
  description: string
  photo_url: string
  pricing_type: string
  fixed_price: number | null
  hourly_price: number | null
  latitude: string
  longitude: string
  availability_mode: AvailabilityMode | null
  space_availability: WeeklyAvailabilityRow[] | null
  space_availability_overrides: DateOverrideRow[] | null
}

type WeeklyDayDraft = {
  dayOfWeek: number
  enabled: boolean
  startTime: string
  endTime: string
}

type DateOverrideDraft = {
  key: string
  date: string
  isAvailable: boolean
  startTime: string
  endTime: string
  note: string
}

type AvailabilityDraft = {
  mode: AvailabilityMode
  weekly: WeeklyDayDraft[]
  overrides: DateOverrideDraft[]
}

const WEEKDAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const

function normaliseTime(value: string | null | undefined, fallback: string): string {
  return value?.slice(0, 5) || fallback
}

function createOverrideKey(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function buildDraft(space: SpaceRow): AvailabilityDraft {
  const recurringRows = space.space_availability ?? []

  return {
    mode:
      space.availability_mode ??
      (recurringRows.length > 0 ? "schedule" : "always"),
    weekly: WEEKDAYS.map((_, dayOfWeek) => {
      const row = recurringRows.find(
        (availability) => availability.day_of_week === dayOfWeek
      )

      return {
        dayOfWeek,
        enabled: Boolean(row),
        startTime: normaliseTime(row?.start_time, "08:00"),
        endTime: normaliseTime(row?.end_time, "18:00"),
      }
    }),
    overrides: (space.space_availability_overrides ?? [])
      .slice()
      .sort((first, second) =>
        first.availability_date.localeCompare(second.availability_date)
      )
      .map((override) => ({
        key: override.id,
        date: override.availability_date,
        isAvailable: override.is_available,
        startTime: normaliseTime(override.start_time, "08:00"),
        endTime: normaliseTime(override.end_time, "18:00"),
        note: override.note ?? "",
      })),
  }
}

function formatPrice(space: SpaceRow): string {
  const prices: string[] = []

  if (
    (space.pricing_type === "hourly" || space.pricing_type === "both") &&
    space.hourly_price !== null
  ) {
    prices.push(`${formatPounds(space.hourly_price)}/hr`)
  }

  if (
    (space.pricing_type === "fixed" || space.pricing_type === "both") &&
    space.fixed_price !== null
  ) {
    prices.push(`${formatPounds(space.fixed_price)} fixed`)
  }

  return prices.join(" · ") || "Price not set"
}

function validateDraft(draft: AvailabilityDraft): string | null {
  if (draft.mode === "schedule") {
    const enabledDays = draft.weekly.filter((day) => day.enabled)

    if (enabledDays.length === 0) {
      return "Select at least one available weekday or switch to always available."
    }

    for (const day of enabledDays) {
      if (!day.startTime || !day.endTime || day.endTime <= day.startTime) {
        return `${WEEKDAYS[day.dayOfWeek]} needs an end time after its start time.`
      }
    }
  }

  const dates = new Set<string>()

  for (const override of draft.overrides) {
    if (!override.date) {
      return "Every date override needs a date."
    }

    if (dates.has(override.date)) {
      return `Only one override can be set for ${override.date}.`
    }
    dates.add(override.date)

    if (
      override.isAvailable &&
      (!override.startTime ||
        !override.endTime ||
        override.endTime <= override.startTime)
    ) {
      return `The available window on ${override.date} needs a valid start and end time.`
    }
  }

  return null
}

function getPhotoStoragePath(photoUrl: string): string | null {
  const marker = "/storage/v1/object/public/space-photos/"
  const markerIndex = photoUrl.indexOf(marker)

  if (markerIndex < 0) return null

  const encodedPath = photoUrl.slice(markerIndex + marker.length)

  try {
    return decodeURIComponent(encodedPath)
  } catch {
    return encodedPath
  }
}

export function MySpacesManager() {
  const [spaces, setSpaces] = useState<SpaceRow[]>([])
  const [drafts, setDrafts] = useState<Record<number, AvailabilityDraft>>({})
  const [expandedSpaceId, setExpandedSpaceId] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [savingSpaceId, setSavingSpaceId] = useState<number | null>(null)
  const [deletingSpaceId, setDeletingSpaceId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [successSpaceId, setSuccessSpaceId] = useState<number | null>(null)

  const loadSpaces = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError) throw userError
      if (!user) throw new Error("You must be signed in to view your spaces.")

      const { data, error: spacesError } = await supabase
        .from("spaces")
        .select(
          `
            id,
            space_name,
            description,
            photo_url,
            pricing_type,
            fixed_price,
            hourly_price,
            latitude,
            longitude,
            availability_mode,
            space_availability (
              id,
              day_of_week,
              start_time,
              end_time
            ),
            space_availability_overrides (
              id,
              availability_date,
              is_available,
              start_time,
              end_time,
              note
            )
          `
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })

      if (spacesError) throw spacesError

      const rows = (data ?? []) as SpaceRow[]
      setSpaces(rows)
      setDrafts(
        Object.fromEntries(
          rows.map((space) => [space.id, buildDraft(space)])
        ) as Record<number, AvailabilityDraft>
      )
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Could not load your spaces."
      )
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadSpaces()
  }, [loadSpaces])

  const updateDraft = (
    spaceId: number,
    updater: (current: AvailabilityDraft) => AvailabilityDraft
  ) => {
    setDrafts((current) => {
      const draft = current[spaceId]
      if (!draft) return current

      return {
        ...current,
        [spaceId]: updater(draft),
      }
    })
    setSuccessSpaceId(null)
    setNotice(null)
    setError(null)
  }

  const updateWeeklyDay = (
    spaceId: number,
    dayOfWeek: number,
    patch: Partial<WeeklyDayDraft>
  ) => {
    updateDraft(spaceId, (draft) => ({
      ...draft,
      weekly: draft.weekly.map((day) =>
        day.dayOfWeek === dayOfWeek ? { ...day, ...patch } : day
      ),
    }))
  }

  const addOverride = (spaceId: number) => {
    updateDraft(spaceId, (draft) => ({
      ...draft,
      overrides: [
        ...draft.overrides,
        {
          key: createOverrideKey(),
          date: "",
          isAvailable: false,
          startTime: "08:00",
          endTime: "18:00",
          note: "",
        },
      ],
    }))
  }

  const updateOverride = (
    spaceId: number,
    key: string,
    patch: Partial<DateOverrideDraft>
  ) => {
    updateDraft(spaceId, (draft) => ({
      ...draft,
      overrides: draft.overrides.map((override) =>
        override.key === key ? { ...override, ...patch } : override
      ),
    }))
  }

  const removeOverride = (spaceId: number, key: string) => {
    updateDraft(spaceId, (draft) => ({
      ...draft,
      overrides: draft.overrides.filter((override) => override.key !== key),
    }))
  }

  const saveAvailability = async (spaceId: number) => {
    const draft = drafts[spaceId]
    if (!draft) return

    const validationError = validateDraft(draft)
    if (validationError) {
      setError(validationError)
      return
    }

    setSavingSpaceId(spaceId)
    setSuccessSpaceId(null)
    setNotice(null)
    setError(null)

    try {
      const supabase = createClient()
      const weekly =
        draft.mode === "schedule"
          ? draft.weekly
              .filter((day) => day.enabled)
              .map((day) => ({
                day_of_week: day.dayOfWeek,
                start_time: day.startTime,
                end_time: day.endTime,
              }))
          : []

      const overrides = draft.overrides.map((override) => ({
        availability_date: override.date,
        is_available: override.isAvailable,
        start_time: override.isAvailable ? override.startTime : null,
        end_time: override.isAvailable ? override.endTime : null,
        note: override.note.trim() || null,
      }))

      const { error: saveError } = await supabase.rpc(
        "replace_space_availability",
        {
          p_space_id: spaceId,
          p_mode: draft.mode,
          p_weekly: weekly,
          p_overrides: overrides,
        }
      )

      if (saveError) throw saveError

      setSuccessSpaceId(spaceId)
      await loadSpaces()
      setExpandedSpaceId(spaceId)
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Could not save this availability schedule."
      )
    } finally {
      setSavingSpaceId(null)
    }
  }

  const deleteSpace = async (space: SpaceRow) => {
    const confirmed = window.confirm(
      `Delete “${space.space_name}”?\n\nThis permanently removes the space and every booking attached to it. This cannot be undone.`
    )

    if (!confirmed) return

    setDeletingSpaceId(space.id)
    setSuccessSpaceId(null)
    setNotice(null)
    setError(null)

    try {
      const supabase = createClient()
      const { data, error: deleteError } = await supabase.rpc(
        "delete_owned_space",
        { p_space_id: space.id }
      )

      if (deleteError) throw deleteError

      const result = Array.isArray(data) ? data[0] : data
      const deletedBookings = Number(result?.deleted_bookings ?? 0)
      const deletedPhotoUrl = String(result?.deleted_photo_url ?? space.photo_url)
      const photoPath = getPhotoStoragePath(deletedPhotoUrl)

      let photoWarning = ""
      if (photoPath) {
        const { error: photoError } = await supabase.storage
          .from("space-photos")
          .remove([photoPath])

        if (photoError) {
          photoWarning = " The listing was deleted, but its uploaded photo could not be removed."
        }
      }

      setExpandedSpaceId((current) =>
        current === space.id ? null : current
      )
      setSpaces((current) => current.filter((item) => item.id !== space.id))
      setDrafts((current) => {
        const next = { ...current }
        delete next[space.id]
        return next
      })
      setNotice(
        `Deleted ${space.space_name} and ${deletedBookings} booking${
          deletedBookings === 1 ? "" : "s"
        }.${photoWarning}`
      )
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Could not delete this parking space."
      )
    } finally {
      setDeletingSpaceId(null)
    }
  }

  const totalOverrides = useMemo(
    () =>
      Object.values(drafts).reduce(
        (total, draft) => total + draft.overrides.length,
        0
      ),
    [drafts]
  )

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>My spaces</CardTitle>
          <CardDescription>Loading your registered spaces…</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>My spaces</CardTitle>
          <CardDescription>
            Review your listings and control exactly when each one can be booked.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl bg-muted/50 p-4">
            <div className="text-2xl font-semibold">{spaces.length}</div>
            <div className="text-sm text-muted-foreground">Registered spaces</div>
          </div>
          <div className="rounded-2xl bg-muted/50 p-4">
            <div className="text-2xl font-semibold">
              {
                Object.values(drafts).filter(
                  (draft) => draft.mode === "schedule"
                ).length
              }
            </div>
            <div className="text-sm text-muted-foreground">
              Weekly schedules
            </div>
          </div>
          <div className="rounded-2xl bg-muted/50 p-4">
            <div className="text-2xl font-semibold">{totalOverrides}</div>
            <div className="text-sm text-muted-foreground">Date overrides</div>
          </div>
        </CardContent>
      </Card>

      {error && (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {notice && (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">
          {notice}
        </div>
      )}

      {spaces.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No registered spaces</CardTitle>
            <CardDescription>
              Register a parking space first, then its availability controls will
              appear here.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        spaces.map((space) => {
          const draft = drafts[space.id]
          const isExpanded = expandedSpaceId === space.id
          const isSaving = savingSpaceId === space.id
          const isDeleting = deletingSpaceId === space.id
          const saved = successSpaceId === space.id

          if (!draft) return null

          return (
            <Card key={space.id}>
              <div className="grid gap-0 md:grid-cols-[220px_1fr]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={space.photo_url}
                  alt={space.space_name}
                  className="h-48 w-full object-cover md:h-full md:min-h-48"
                />

                <div className="flex min-w-0 flex-col">
                  <CardHeader>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <CardTitle className="text-lg">
                          {space.space_name}
                        </CardTitle>
                        <CardDescription className="mt-1 line-clamp-2">
                          {space.description}
                        </CardDescription>
                      </div>
                      <div className="shrink-0 rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
                        {formatPrice(space)}
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1">
                      <MapPinIcon className="size-3.5" />
                      {space.latitude}, {space.longitude}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1">
                      <Clock3Icon className="size-3.5" />
                      {draft.mode === "always"
                        ? "Available 24/7 by default"
                        : `${draft.weekly.filter((day) => day.enabled).length} recurring days`}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1">
                      <CalendarDaysIcon className="size-3.5" />
                      {draft.overrides.length} date override
                      {draft.overrides.length === 1 ? "" : "s"}
                    </span>
                  </CardContent>

                  <CardFooter className="mt-auto flex-col items-stretch gap-3 pt-4 sm:flex-row sm:items-center sm:justify-between">
                    {saved ? (
                      <span className="inline-flex items-center gap-1 text-sm text-emerald-600">
                        <CheckCircle2Icon className="size-4" /> Saved
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        Space ID #{space.id}
                      </span>
                    )}
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <Button
                        type="button"
                        variant="destructive"
                        disabled={isDeleting || isSaving}
                        onClick={() => void deleteSpace(space)}
                      >
                        <Trash2Icon className="size-4" />
                        {isDeleting ? "Deleting…" : "Delete space"}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        disabled={isDeleting}
                        onClick={() =>
                          setExpandedSpaceId(isExpanded ? null : space.id)
                        }
                      >
                        {isExpanded ? (
                          <ChevronUpIcon className="size-4" />
                        ) : (
                          <ChevronDownIcon className="size-4" />
                        )}
                        {isExpanded ? "Close availability" : "Manage availability"}
                      </Button>
                    </div>
                  </CardFooter>
                </div>
              </div>

              {isExpanded && (
                <div className="border-t px-(--card-spacing) pt-(--card-spacing)">
                  <div className="flex flex-col gap-6">
                    <section className="flex flex-col gap-3">
                      <div>
                        <h3 className="font-medium">Default availability</h3>
                        <p className="text-sm text-muted-foreground">
                          This controls normal weeks. Specific-date overrides below
                          take priority.
                        </p>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <button
                          type="button"
                          onClick={() =>
                            updateDraft(space.id, (current) => ({
                              ...current,
                              mode: "always",
                            }))
                          }
                          className={cn(
                            "rounded-2xl border p-4 text-left transition-colors",
                            draft.mode === "always"
                              ? "border-primary bg-primary/5"
                              : "border-border hover:bg-muted/50"
                          )}
                        >
                          <div className="font-medium">Always available</div>
                          <div className="mt-1 text-sm text-muted-foreground">
                            Bookable at any time except dates you explicitly close.
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            updateDraft(space.id, (current) => ({
                              ...current,
                              mode: "schedule",
                            }))
                          }
                          className={cn(
                            "rounded-2xl border p-4 text-left transition-colors",
                            draft.mode === "schedule"
                              ? "border-primary bg-primary/5"
                              : "border-border hover:bg-muted/50"
                          )}
                        >
                          <div className="font-medium">Weekly timetable</div>
                          <div className="mt-1 text-sm text-muted-foreground">
                            Choose the days and hours the space is normally open.
                          </div>
                        </button>
                      </div>

                      {draft.mode === "schedule" && (
                        <div className="overflow-hidden rounded-2xl border">
                          {draft.weekly.map((day, index) => (
                            <div
                              key={day.dayOfWeek}
                              className={cn(
                                "grid gap-3 px-4 py-3 sm:grid-cols-[150px_1fr] sm:items-center",
                                index > 0 && "border-t"
                              )}
                            >
                              <label className="flex items-center gap-2 font-medium">
                                <input
                                  type="checkbox"
                                  checked={day.enabled}
                                  onChange={(event) =>
                                    updateWeeklyDay(space.id, day.dayOfWeek, {
                                      enabled: event.target.checked,
                                    })
                                  }
                                  className="size-4 accent-current"
                                />
                                {WEEKDAYS[day.dayOfWeek]}
                              </label>

                              <div
                                className={cn(
                                  "grid grid-cols-[1fr_auto_1fr] items-center gap-2",
                                  !day.enabled && "opacity-45"
                                )}
                              >
                                <Input
                                  type="time"
                                  value={day.startTime}
                                  disabled={!day.enabled}
                                  onChange={(event) =>
                                    updateWeeklyDay(space.id, day.dayOfWeek, {
                                      startTime: event.target.value,
                                    })
                                  }
                                />
                                <span className="text-sm text-muted-foreground">
                                  to
                                </span>
                                <Input
                                  type="time"
                                  value={day.endTime}
                                  disabled={!day.enabled}
                                  onChange={(event) =>
                                    updateWeeklyDay(space.id, day.dayOfWeek, {
                                      endTime: event.target.value,
                                    })
                                  }
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </section>

                    <section className="flex flex-col gap-3">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                          <h3 className="font-medium">Specific-date overrides</h3>
                          <p className="text-sm text-muted-foreground">
                            Close a holiday, or open a different time window on one
                            particular date.
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => addOverride(space.id)}
                        >
                          <PlusIcon className="size-4" /> Add date
                        </Button>
                      </div>

                      {draft.overrides.length === 0 ? (
                        <div className="rounded-2xl border border-dashed p-5 text-sm text-muted-foreground">
                          No date-specific changes. The default availability above
                          applies every week.
                        </div>
                      ) : (
                        <div className="flex flex-col gap-3">
                          {draft.overrides.map((override) => (
                            <div
                              key={override.key}
                              className="grid gap-3 rounded-2xl border p-4 lg:grid-cols-[160px_160px_1fr_auto] lg:items-end"
                            >
                              <label className="flex flex-col gap-1.5 text-sm font-medium">
                                Date
                                <Input
                                  type="date"
                                  value={override.date}
                                  onChange={(event) =>
                                    updateOverride(space.id, override.key, {
                                      date: event.target.value,
                                    })
                                  }
                                />
                              </label>

                              <label className="flex flex-col gap-1.5 text-sm font-medium">
                                Status
                                <select
                                  value={override.isAvailable ? "open" : "closed"}
                                  onChange={(event) =>
                                    updateOverride(space.id, override.key, {
                                      isAvailable: event.target.value === "open",
                                    })
                                  }
                                  className="h-8 rounded-2xl border border-transparent bg-input/50 px-3 text-sm outline-none focus:border-ring focus:ring-3 focus:ring-ring/30"
                                >
                                  <option value="closed">Closed all day</option>
                                  <option value="open">Available at set times</option>
                                </select>
                              </label>

                              <div className="grid gap-3 sm:grid-cols-2">
                                {override.isAvailable ? (
                                  <>
                                    <label className="flex flex-col gap-1.5 text-sm font-medium">
                                      Opens
                                      <Input
                                        type="time"
                                        value={override.startTime}
                                        onChange={(event) =>
                                          updateOverride(space.id, override.key, {
                                            startTime: event.target.value,
                                          })
                                        }
                                      />
                                    </label>
                                    <label className="flex flex-col gap-1.5 text-sm font-medium">
                                      Closes
                                      <Input
                                        type="time"
                                        value={override.endTime}
                                        onChange={(event) =>
                                          updateOverride(space.id, override.key, {
                                            endTime: event.target.value,
                                          })
                                        }
                                      />
                                    </label>
                                  </>
                                ) : (
                                  <label className="flex flex-col gap-1.5 text-sm font-medium sm:col-span-2">
                                    Note (optional)
                                    <Input
                                      value={override.note}
                                      placeholder="e.g. Family using the driveway"
                                      onChange={(event) =>
                                        updateOverride(space.id, override.key, {
                                          note: event.target.value,
                                        })
                                      }
                                    />
                                  </label>
                                )}
                              </div>

                              <Button
                                type="button"
                                variant="destructive"
                                size="icon"
                                aria-label="Remove date override"
                                onClick={() =>
                                  removeOverride(space.id, override.key)
                                }
                              >
                                <Trash2Icon className="size-4" />
                              </Button>

                              {override.isAvailable && (
                                <label className="flex flex-col gap-1.5 text-sm font-medium lg:col-span-3">
                                  Note (optional)
                                  <Input
                                    value={override.note}
                                    placeholder="e.g. Only the right-hand bay is available"
                                    onChange={(event) =>
                                      updateOverride(space.id, override.key, {
                                        note: event.target.value,
                                      })
                                    }
                                  />
                                </label>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </section>

                    <div className="flex justify-end border-t pt-4">
                      <Button
                        type="button"
                        size="lg"
                        disabled={isSaving}
                        onClick={() => void saveAvailability(space.id)}
                      >
                        <SaveIcon className="size-4" />
                        {isSaving ? "Saving…" : "Save availability"}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          )
        })
      )}
    </div>
  )
}
