import { DashboardState } from "@/components/dashboard-state"
import { getDashboardRouteInfo } from "@/lib/dashboard"

export default function Page({
  params,
}: {
  params: { slug: string[] }
}) {
  const routeInfo = getDashboardRouteInfo(params.slug)

  return (
    <DashboardState
      eyebrow="Dashboard section"
      title={routeInfo.title}
      description={routeInfo.description}
      path={`/dashboard/${params.slug.join("/")}`}
    />
  )
}