import { LoginForm } from "@/components/login-form"
import Link from "next/link"
import { CarFront } from "lucide-react"

export default function Page() {
  return (
    <main className="relative flex min-h-svh w-full items-center justify-center overflow-hidden p-6 md:p-10">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_0%,var(--muted),transparent_42%)]" />
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-8 flex items-center justify-center gap-2 font-semibold tracking-tight">
          <span className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground">
            <CarFront className="size-4" />
          </span>
          Fpark
        </Link>
        <LoginForm />
        <p className="mt-6 text-center text-xs text-muted-foreground">
          Simple parking for everyday journeys.
        </p>
      </div>
    </main>
  )
}
