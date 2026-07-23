"use client"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
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
} from "@/components/ui/field"
import { createClient } from "@/lib/supabase/client"
import { useState } from "react"

function GoogleIcon() {
  return (
    <svg aria-hidden="true" className="size-5" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M21.35 12.27c0-.79-.07-1.54-.21-2.27H12v4.29h5.23a4.47 4.47 0 0 1-1.94 2.93v2.78h3.14c1.84-1.7 2.92-4.2 2.92-7.73Z" />
      <path fill="#34A853" d="M12 21.75c2.62 0 4.82-.87 6.43-2.36l-3.14-2.44c-.87.59-1.99.94-3.29.94-2.53 0-4.68-1.71-5.45-4.01H3.3v2.52A9.72 9.72 0 0 0 12 21.75Z" />
      <path fill="#FBBC05" d="M6.55 13.88A5.85 5.85 0 0 1 6.25 12c0-.65.11-1.27.3-1.88V7.6H3.3A9.72 9.72 0 0 0 2.25 12c0 1.57.38 3.06 1.05 4.4l3.25-2.52Z" />
      <path fill="#EA4335" d="M12 6.11c1.42 0 2.7.49 3.7 1.45l2.78-2.78C16.82 3.24 14.62 2.25 12 2.25A9.72 9.72 0 0 0 3.3 7.6l3.25 2.52c.77-2.3 2.92-4.01 5.45-4.01Z" />
    </svg>
  )
}

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const [isLoading, setIsLoading] = useState(false)

  const handleGoogleSignIn = async () => {
    setIsLoading(true)

    const supabase = createClient()
    const redirectTo = `${window.location.origin}/auth/callback`

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
      },
    })

    if (error) {
      console.error("Google sign-in failed:", error)
      setIsLoading(false)
    }
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="border-border/80 bg-card/95 shadow-xl shadow-black/5 [--card-spacing:--spacing(7)] backdrop-blur dark:shadow-black/20 sm:[--card-spacing:--spacing(8)]">
        <CardHeader className="gap-3 text-center">
          <CardTitle className="text-3xl tracking-tight">Welcome to Fpark</CardTitle>
          <CardDescription className="text-base leading-7">
            Sign in to find a space, manage bookings, or share your own.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form>
            <FieldGroup className="gap-4">
              <Field>
                <Button
                  className="h-12 w-full text-base bg-background text-foreground shadow-sm hover:bg-muted dark:bg-background dark:hover:bg-muted"
                  variant="outline"
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={isLoading}
                >
                  {!isLoading && <GoogleIcon />}
                  {isLoading ? "Redirecting to Google..." : "Sign in with Google"}
                </Button>
              </Field>
              <Field>
                <FieldDescription className="text-center text-sm leading-6">
                  You&apos;ll be securely redirected to Google to continue.
                </FieldDescription>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
