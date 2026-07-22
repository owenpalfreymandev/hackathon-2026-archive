import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export default function RegisterSpacePage() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      <Card>
        <CardHeader>
          <CardTitle>Register Space</CardTitle>
          <CardDescription>
            This page is wired up correctly.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            If you can see this card, routing and the sidebar layout are all working.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}