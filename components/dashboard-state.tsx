import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export function DashboardState({
  eyebrow,
  title,
  description,
  path,
}: {
  eyebrow: string
  title: string
  description: string
  path: string
}) {
  return (
    <div className="flex flex-1 items-center justify-center p-4 md:p-8">
      <Card className="w-full max-w-3xl border-border/60 bg-card/90 shadow-sm backdrop-blur">
        <CardHeader className="space-y-3">
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-muted-foreground">
            {eyebrow}
          </p>
          <CardTitle className="text-3xl tracking-tight md:text-4xl">
            {title}
          </CardTitle>
          <CardDescription className="max-w-xl text-base leading-7 md:text-lg">
            {description}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-2xl border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
            Route: {path}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}