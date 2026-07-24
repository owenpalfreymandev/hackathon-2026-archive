import Link from "next/link"
import {
  ActivityIcon,
  ArrowLeftIcon,
  CalendarClockIcon,
  ParkingSquareIcon,
} from "lucide-react"

import { buttonVariants } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { dashboardLinks } from "@/lib/dashboard"
import { createClient } from "@/lib/supabase/server"

type ActivityRow = {
  id: number
  action: string
  title: string
  description: string | null
  created_at: string
}

const dateTimeFormatter = new Intl.DateTimeFormat("en-GB", {
  weekday: "short",
  day: "numeric",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Jersey",
})

export default async function ActivityHistoryPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data, error } = await supabase
    .from("user_activity")
    .select("id, action, title, description, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })

  const activity = (data ?? []) as ActivityRow[]

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      <div>
        <Link
          href={dashboardLinks.home}
          className={buttonVariants({ variant: "ghost", size: "sm" })}
        >
          <ArrowLeftIcon />
          Back to dashboard
        </Link>
        <p className="mt-5 text-sm font-medium text-muted-foreground">
          Your account
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">
          Activity history
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          A complete, newest-first record of your booking and parking-space
          actions.
        </p>
      </div>

      {error ? (
        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle>Could not load your activity history</CardTitle>
            <CardDescription>
              Refresh the page and try again.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : activity.length === 0 ? (
        <Card className="max-w-2xl">
          <CardHeader>
            <div className="mb-2 flex size-10 items-center justify-center rounded-xl bg-muted">
              <ActivityIcon className="size-5 text-muted-foreground" />
            </div>
            <CardTitle>No activity yet</CardTitle>
            <CardDescription>
              Booking or registering a parking space will start your history.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <Card className="max-w-4xl">
          <CardHeader>
            <CardTitle>All activity</CardTitle>
            <CardDescription>
              {activity.length} recorded action{activity.length === 1 ? "" : "s"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="divide-y">
              {activity.map((item) => {
                const Icon = item.action.startsWith("space_")
                  ? ParkingSquareIcon
                  : CalendarClockIcon

                return (
                  <li
                    key={item.id}
                    className="flex items-start gap-4 py-4 first:pt-0 last:pb-0"
                  >
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                      <Icon className="size-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{item.title}</p>
                      {item.description && (
                        <p className="mt-1 text-sm text-muted-foreground">
                          {item.description}
                        </p>
                      )}
                      <time
                        dateTime={item.created_at}
                        className="mt-2 block text-xs text-muted-foreground"
                      >
                        {dateTimeFormatter.format(new Date(item.created_at))}
                      </time>
                    </div>
                  </li>
                )
              })}
            </ol>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
