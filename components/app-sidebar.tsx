"use client"

import * as React from "react"
import Link from "next/link"

import { NavMain } from "@/components/nav-main"
import { NavProjects } from "@/components/nav-projects"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { TerminalSquareIcon, BotIcon, BookOpenIcon, Settings2Icon, LifeBuoyIcon, SendIcon, FrameIcon, PieChartIcon, MapIcon, TerminalIcon } from "lucide-react"
import { dashboardLinks } from "@/lib/dashboard"

const data = {
  navMain: [
    {
      title: "Parking",
      url: dashboardLinks.findSpaces,
      icon: (
        <MapIcon />
      ),
      isActive: true,
      items: [
        {
          title: "Find spaces",
          url: dashboardLinks.findSpaces,
        },
        {
          title: "Register a space",
          url: dashboardLinks.registerSpace,
        },
      ],
    },
    {
      title: "Playground",
      url: dashboardLinks.playground,
      icon: (
        <TerminalSquareIcon
        />
      ),
      isActive: true,
      items: [
        {
          title: "History",
          url: dashboardLinks.playgroundHistory,
        },
        {
          title: "Starred",
          url: dashboardLinks.playgroundStarred,
        },
        {
          title: "Settings",
          url: dashboardLinks.playgroundSettings,
        },
      ],
    },
    {
      title: "Models",
      url: dashboardLinks.models,
      icon: (
        <BotIcon
        />
      ),
      items: [
        {
          title: "Genesis",
          url: dashboardLinks.modelsGenesis,
        },
        {
          title: "Explorer",
          url: dashboardLinks.modelsExplorer,
        },
        {
          title: "Quantum",
          url: dashboardLinks.modelsQuantum,
        },
      ],
    },
    {
      title: "Documentation",
      url: dashboardLinks.documentation,
      icon: (
        <BookOpenIcon
        />
      ),
      items: [
        {
          title: "Introduction",
          url: dashboardLinks.documentationIntroduction,
        },
        {
          title: "Get Started",
          url: dashboardLinks.documentationGetStarted,
        },
        {
          title: "Tutorials",
          url: dashboardLinks.documentationTutorials,
        },
        {
          title: "Changelog",
          url: dashboardLinks.documentationChangelog,
        },
      ],
    },
    {
      title: "Settings",
      url: dashboardLinks.settings,
      icon: (
        <Settings2Icon
        />
      ),
      items: [
        {
          title: "General",
          url: dashboardLinks.settingsGeneral,
        },
        {
          title: "Team",
          url: dashboardLinks.settingsTeam,
        },
        {
          title: "Billing",
          url: dashboardLinks.settingsBilling,
        },
        {
          title: "Limits",
          url: dashboardLinks.settingsLimits,
        },
      ],
    },
  ],
  navSecondary: [
    {
      title: "Support",
      url: "#",
      icon: (
        <LifeBuoyIcon
        />
      ),
    },
    {
      title: "Feedback",
      url: "#",
      icon: (
        <SendIcon
        />
      ),
    },
  ],
  projects: [
    {
      name: "Design Engineering",
      url: dashboardLinks.projectDesignEngineering,
      icon: (
        <FrameIcon
        />
      ),
    },
    {
      name: "Sales & Marketing",
      url: dashboardLinks.projectSalesMarketing,
      icon: (
        <PieChartIcon
        />
      ),
    },
    {
      name: "Travel",
      url: dashboardLinks.projectTravel,
      icon: (
        <MapIcon
        />
      ),
    },
  ],
}
export function AppSidebar({
  user,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  user: {
    name: string
    email: string
    avatar: string
  }
}) {
  return (
    <Sidebar
      className="top-(--header-height) h-[calc(100svh-var(--header-height))]!"
      {...props}
    >
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" render={<Link href={dashboardLinks.home} />}>
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                <TerminalIcon className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">Fpark</span>
                <span className="truncate text-xs">Parking marketplace</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavProjects projects={data.projects} />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
    </Sidebar>
  )
}
