import Link from "next/link"
import type { ComponentType } from "react"
import {
  ActivityIcon,
  ArrowRightIcon,
  CalendarCheck2Icon,
  CalendarClockIcon,
  CarFrontIcon,
  Clock3Icon,
  MapPinIcon,
  ParkingSquareIcon,
  PlusIcon,
  PoundSterlingIcon,
  SearchIcon,
} from "lucide-react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { buttonVariants } from "@/components/ui/button"
import { dashboardLinks } from "@/lib/dashboard"
import { formatPounds } from "@/lib/parking"
import { createClient } from "@/lib/supabase/server"
import { getUserDisplayName } from "@/lib/user"
import { cn } from "@/lib/utils"

type SpaceRow = {
  id: number
  space_name: string
  created_at: string
}

type BookingRow = {
  id: string
  space_id: number
  starts_at: string
  ends_at: string
  status: string
  total_price_pence: number | null
}

type ActivityItem = {
  key: string
  title: string
  description: string
  timestamp: number
  icon: ComponentType<{ className?: string }>
}

type ActivityRow = {
  id: number
  action: string
  title: string
  description: string | null
  created_at: string
}

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  weekday: "short",
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "Europe/Jersey",
})

const timeFormatter = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Jersey",
})

function isLiveBooking(booking: BookingRow, now: number) {
  return (
    ["pending", "confirmed"].includes(booking.status) &&
    new Date(booking.ends_at).getTime() > now
  )
}

function bookingSchedule(booking: BookingRow) {
  const startsAt = new Date(booking.starts_at)
  const endsAt = new Date(booking.ends_at)

  return `${dateFormatter.format(startsAt)}, ${timeFormatter.format(
    startsAt
  )}–${timeFormatter.format(endsAt)}`
}

function greetingForJersey() {
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      hour12: false,
      timeZone: "Europe/Jersey",
    }).format(new Date())
  )

  if (hour < 12) return "Good morning"
  if (hour < 18) return "Good afternoon"
  return "Good evening"
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const now = new Date().getTime()
  const displayName = getUserDisplayName(user)
  const firstName = displayName.split(/\s+/)[0] || displayName

  const [
    { data: ownedSpaceRows, error: ownedSpacesError },
    { data: driverBookingRows, error: driverBookingsError },
    { data: activityRows },
  ] = await Promise.all([
    supabase
      .from("spaces")
      .select("id, space_name, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("bookings")
      .select("id, space_id, starts_at, ends_at, status, total_price_pence")
      .eq("driver_id", user.id)
      .order("starts_at", { ascending: true }),
    supabase
      .from("user_activity")
      .select("id, action, title, description, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5),
  ])

  const ownedSpaces = (ownedSpaceRows ?? []) as SpaceRow[]
  const driverBookings = (driverBookingRows ?? []) as BookingRow[]
  const ownedSpaceIds = ownedSpaces.map((space) => space.id)

  const { data: ownerBookingRows, error: ownerBookingsError } =
    ownedSpaceIds.length > 0
      ? await supabase
          .from("bookings")
          .select("id, space_id, starts_at, ends_at, status, total_price_pence")
          .in("space_id", ownedSpaceIds)
          .order("starts_at", { ascending: true })
      : { data: [], error: null }

  const ownerBookings = (ownerBookingRows ?? []) as BookingRow[]

  const allReferencedSpaceIds = [
    ...new Set([
      ...ownedSpaceIds,
      ...driverBookings.map((booking) => booking.space_id),
      ...ownerBookings.map((booking) => booking.space_id),
    ]),
  ]

  const { data: referencedSpaceRows } =
    allReferencedSpaceIds.length > 0
      ? await supabase
          .from("spaces")
          .select("id, space_name, created_at")
          .in("id", allReferencedSpaceIds)
      : { data: [] }

  const spacesById = new Map(
    ((referencedSpaceRows ?? []) as SpaceRow[]).map((space) => [
      space.id,
      space,
    ])
  )

  for (const space of ownedSpaces) {
    spacesById.set(space.id, space)
  }

  const upcomingDriverBookings = driverBookings
    .filter((booking) => isLiveBooking(booking, now))
    .sort(
      (first, second) =>
        new Date(first.starts_at).getTime() -
        new Date(second.starts_at).getTime()
    )

  const activeOwnerBookings = ownerBookings
    .filter((booking) => isLiveBooking(booking, now))
    .sort(
      (first, second) =>
        new Date(first.starts_at).getTime() -
        new Date(second.starts_at).getTime()
    )

  const nextDriverBooking = upcomingDriverBookings[0] ?? null
  const nextOwnerBooking = activeOwnerBookings[0] ?? null

  const fallbackActivity: ActivityItem[] = [
    ...ownedSpaces.slice(0, 4).map((space) => ({
      key: `space-${space.id}`,
      title: `You registered ${space.space_name}`,
      description: dateFormatter.format(new Date(space.created_at)),
      timestamp: new Date(space.created_at).getTime(),
      icon: ParkingSquareIcon,
    })),
    ...driverBookings.slice(-4).map((booking) => {
      const spaceName =
        spacesById.get(booking.space_id)?.space_name ?? "a parking space"

      return {
        key: `driver-booking-${booking.id}`,
        title: `Your booking at ${spaceName}`,
        description: `${booking.status} · ${bookingSchedule(booking)}`,
        timestamp: new Date(booking.starts_at).getTime(),
        icon: CalendarClockIcon,
      }
    }),
    ...ownerBookings.slice(-4).map((booking) => {
      const spaceName =
        spacesById.get(booking.space_id)?.space_name ?? "Your space"

      return {
        key: `owner-booking-${booking.id}`,
        title: `${spaceName} was booked`,
        description: `${booking.status} · ${bookingSchedule(booking)}`,
        timestamp: new Date(booking.starts_at).getTime(),
        icon: CalendarCheck2Icon,
      }
    }),
  ]
    .sort((first, second) => second.timestamp - first.timestamp)
    .slice(0, 5)

  const persistedActivity = ((activityRows ?? []) as ActivityRow[]).map(
    (item): ActivityItem => ({
      key: `activity-${item.id}`,
      title: item.title,
      description:
        item.description ?? dateFormatter.format(new Date(item.created_at)),
      timestamp: new Date(item.created_at).getTime(),
      icon: item.action.startsWith("space_")
        ? ParkingSquareIcon
        : CalendarClockIcon,
    })
  )

  // Keep the dashboard useful while the activity migration is being deployed.
  const activity =
    persistedActivity.length > 0 ? persistedActivity : fallbackActivity

  const hasLoadError =
    ownedSpacesError || driverBookingsError || ownerBookingsError

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      <section>
        <p className="text-sm font-medium text-muted-foreground">
          Dashboard overview
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">
          {greetingForJersey()}, {firstName}
        </h1>
        <p className="mt-2 text-muted-foreground">
          Here&apos;s what&apos;s happening with your parking today.
        </p>
      </section>

      {hasLoadError && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
          Some dashboard information could not be loaded. The rest of Fpark
          should continue to work normally.
        </div>
      )}

      <section
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
        aria-label="Account summary"
      >
        <SummaryCard
          title="My spaces"
          value={String(ownedSpaces.length)}
          description={
            ownedSpaces.length === 1 ? "Registered space" : "Registered spaces"
          }
          icon={CarFrontIcon}
          href={dashboardLinks.mySpaces}
        />
        <SummaryCard
          title="My bookings"
          value={String(upcomingDriverBookings.length)}
          description="Upcoming or in progress"
          icon={CalendarClockIcon}
          href={dashboardLinks.myBookings}
        />
        <SummaryCard
          title="Bookings on my spaces"
          value={String(activeOwnerBookings.length)}
          description="Active reservations"
          icon={CalendarCheck2Icon}
          href={dashboardLinks.mySpaces}
        />
        <SummaryCard
          title="Gross earnings"
          value="Coming soon"
          description="Payments and payouts not connected"
          icon={PoundSterlingIcon}
        />
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">
            Next activity
          </h2>
          <p className="text-sm text-muted-foreground">
            Your next parking reservation and next driver arrival.
          </p>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <NextActivityCard
            eyebrow="My next parking"
            emptyTitle="No upcoming parking"
            emptyDescription="Find a space when you need somewhere to park."
            booking={nextDriverBooking}
            spaceName={
              nextDriverBooking
                ? spacesById.get(nextDriverBooking.space_id)?.space_name
                : undefined
            }
            href={dashboardLinks.myBookings}
            actionLabel="View my bookings"
            icon={MapPinIcon}
          />

          <NextActivityCard
            eyebrow="Next driver arrival"
            emptyTitle="No active owner bookings"
            emptyDescription="New reservations for your spaces will appear here."
            booking={nextOwnerBooking}
            spaceName={
              nextOwnerBooking
                ? spacesById.get(nextOwnerBooking.space_id)?.space_name
                : undefined
            }
            href={dashboardLinks.mySpaces}
            actionLabel="Manage my spaces"
            icon={CarFrontIcon}
          />
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quick actions</CardTitle>
            <CardDescription>
              Jump straight to the main Fpark tasks.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <QuickAction
              href={dashboardLinks.findSpaces}
              label="Find a space"
              description="Search nearby parking"
              icon={SearchIcon}
            />
            <QuickAction
              href={dashboardLinks.registerSpace}
              label="Register a space"
              description="List private parking"
              icon={PlusIcon}
            />
            <QuickAction
              href={dashboardLinks.myBookings}
              label="My bookings"
              description="Review parking plans"
              icon={CalendarClockIcon}
            />
            <QuickAction
              href={dashboardLinks.mySpaces}
              label="Manage my spaces"
              description="Availability and bookings"
              icon={ParkingSquareIcon}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <ActivityIcon className="size-5 text-primary" />
              <CardTitle className="text-lg">Latest activity</CardTitle>
            </div>
            <CardDescription>
              Recent listings and booking activity across your account.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {activity.length === 0 ? (
              <div className="rounded-xl border border-dashed p-6 text-center">
                <p className="font-medium">Nothing here yet</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Register or book a space to start building your activity
                  history.
                </p>
              </div>
            ) : (
              <div className="divide-y">
                {activity.map((item) => {
                  const Icon = item.icon

                  return (
                    <div
                      key={item.key}
                      className="flex items-start gap-3 py-3 first:pt-0 last:pb-0"
                    >
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                        <Icon className="size-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-medium">{item.title}</p>
                        <p className="mt-0.5 text-sm capitalize text-muted-foreground">
                          {item.description}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  )
}

function SummaryCard({
  title,
  value,
  description,
  icon: Icon,
  href,
}: {
  title: string
  value: string
  description: string
  icon: ComponentType<{ className?: string }>
  href?: string
}) {
  const content = (
    <Card
      className={cn(
        "h-full transition",
        href && "hover:-translate-y-0.5 hover:ring-primary/30"
      )}
    >
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardDescription>{title}</CardDescription>
            <CardTitle className="mt-2 text-2xl">{value}</CardTitle>
          </div>
          <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Icon className="size-5" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">
        {description}
      </CardContent>
    </Card>
  )

  return href ? (
    <Link href={href} className="rounded-[24px] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30">
      {content}
    </Link>
  ) : (
    content
  )
}

function NextActivityCard({
  eyebrow,
  emptyTitle,
  emptyDescription,
  booking,
  spaceName,
  href,
  actionLabel,
  icon: Icon,
}: {
  eyebrow: string
  emptyTitle: string
  emptyDescription: string
  booking: BookingRow | null
  spaceName?: string
  href: string
  actionLabel: string
  icon: ComponentType<{ className?: string }>
}) {
  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Icon className="size-4" />
          {eyebrow}
        </div>
        <CardTitle className="text-xl">
          {booking ? spaceName ?? "Parking space" : emptyTitle}
        </CardTitle>
        <CardDescription>
          {booking ? bookingSchedule(booking) : emptyDescription}
        </CardDescription>
      </CardHeader>

      <CardContent className="mt-auto">
        {booking && (
          <div className="mb-4 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-xl bg-muted/50 p-3 text-sm">
            <span className="flex items-center gap-1.5 capitalize">
              <Clock3Icon className="size-4 text-muted-foreground" />
              {booking.status}
            </span>
            <span className="font-medium">
              {booking.total_price_pence === null
                ? "Price unavailable"
                : formatPounds(booking.total_price_pence / 100)}
            </span>
          </div>
        )}

        <Link
          href={href}
          className={buttonVariants({
            variant: booking ? "default" : "outline",
            className: "w-full",
          })}
        >
          {actionLabel}
          <ArrowRightIcon className="size-4" />
        </Link>
      </CardContent>
    </Card>
  )
}

function QuickAction({
  href,
  label,
  description,
  icon: Icon,
}: {
  href: string
  label: string
  description: string
  icon: ComponentType<{ className?: string }>
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 rounded-xl border p-3 transition hover:border-primary/40 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30"
    >
      <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground transition group-hover:bg-primary/10 group-hover:text-primary">
        <Icon className="size-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-medium">{label}</p>
        <p className="truncate text-xs text-muted-foreground">{description}</p>
      </div>
      <ArrowRightIcon className="size-4 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary" />
    </Link>
  )
}
