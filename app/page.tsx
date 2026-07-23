import Link from "next/link"
import { ArrowRight, CarFront, CircleCheck, MapPin, ShieldCheck } from "lucide-react"

import { buttonVariants } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/server"
import { cn } from "@/lib/utils"

export default async function Home() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const primaryHref = user ? "/dashboard" : "/login"
  const primaryLabel = user ? "Go to dashboard" : "Log in"

  return (
    <main className="flex min-h-svh flex-col bg-background">
      <header className="border-b">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
            <span className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground">
              <CarFront className="size-4" />
            </span>
            Fpark
          </Link>
          <Link href={primaryHref} className={buttonVariants({ variant: "outline", size: "sm" })}>
            {primaryLabel}
          </Link>
        </div>
      </header>

      <section className="relative overflow-hidden border-b">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_-20%,var(--muted),transparent_45%)]" />
        <div className="mx-auto flex max-w-6xl flex-col items-center px-6 py-24 text-center sm:py-32">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border bg-background/80 px-3 py-1 text-sm text-muted-foreground shadow-sm">
            <MapPin className="size-3.5" />
            Parking that fits your day
          </div>
          <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-balance sm:text-6xl">
            Find a space. Make room for your day.
          </h1>
          <p className="mt-6 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">
            Fpark makes it simple to find and book trusted local parking, or put an unused space to work.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href={primaryHref} className={cn(buttonVariants({ size: "lg" }), "w-full sm:w-auto")}>
              {user ? "Open your dashboard" : "Get started"}
              <ArrowRight className="size-4" />
            </Link>
            <Link href="/dashboard/find-spaces" className={cn(buttonVariants({ variant: "outline", size: "lg" }), "w-full sm:w-auto")}>
              Browse spaces
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-6 py-14 sm:py-18">
        <div className="grid gap-4 md:grid-cols-3">
          {[
            [MapPin, "Near where you need to be", "Search local spaces and choose the one that suits your plans."],
            [CircleCheck, "Book with clarity", "See the details up front and keep your parking plans in one place."],
            [ShieldCheck, "Made for neighbours", "A simple, considerate way to share the space already around us."],
          ].map(([Icon, title, description]) => {
            const FeatureIcon = Icon as typeof MapPin

            return (
              <article key={title as string} className="rounded-xl border bg-card p-5 shadow-sm">
                <FeatureIcon className="mb-4 size-5 text-muted-foreground" />
                <h2 className="font-medium tracking-tight">{title as string}</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{description as string}</p>
              </article>
            )
          })}
        </div>
      </section>

      <section className="mx-auto mb-10 w-[calc(100%-3rem)] max-w-6xl rounded-xl border bg-muted/50 px-6 py-5 sm:flex sm:items-center sm:justify-between">
        <div>
          <p className="font-medium">Ready when you are.</p>
          <p className="mt-1 text-sm text-muted-foreground">{user ? "Pick up where you left off." : "Sign in to start finding or sharing a space."}</p>
        </div>
        <Link href={primaryHref} className={cn(buttonVariants({ size: "sm" }), "mt-4 sm:mt-0")}>
          {primaryLabel}
          <ArrowRight className="size-4" />
        </Link>
      </section>
    </main>
  )
}
