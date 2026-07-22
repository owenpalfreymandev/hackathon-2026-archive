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
  FieldLabel,
} from "@/components/ui/field"
import { createClient } from "@/lib/supabase/client"
import { useState } from "react"

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
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl">Sign in with Google</CardTitle>
          <CardDescription>
            Use your Google account to access the app.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form>
            <FieldGroup className="gap-4">
              <Field>
                <FieldLabel>Continue</FieldLabel>
                <FieldDescription>
                  You will be redirected to Google to finish signing in.
                </FieldDescription>
              </Field>
              <Field>
                <Button
                  className="h-12 w-full text-base"
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={isLoading}
                >
                  {isLoading ? "Redirecting..." : "Continue with Google"}
                </Button>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
