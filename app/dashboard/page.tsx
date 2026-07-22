import { DashboardState } from "@/components/dashboard-state"

export const iframeHeight = "800px"

export const description = "A dashboard landing page for the signed-in user."

export default function Page() {
  return (
    <DashboardState
      eyebrow="Dashboard home"
      title="Dashboard"
      description="Use the sidebar to switch the main content without losing the layout or session context."
      path="/dashboard"
    />
  )
}
