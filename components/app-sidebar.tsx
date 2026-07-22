"use client"

import * as React from "react"
import Link from "next/link"
import {
  LifeBuoyIcon,
  MapIcon,
  PinIcon,
  SendIcon,
  TerminalIcon,
  CarFrontIcon,
} from "lucide-react"

import { NavMain } from "@/components/nav-main"
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
import { dashboardLinks } from "@/lib/dashboard"

const data = {
  navMain: [
    {
      title: "Find Spaces",
      url: dashboardLinks.findSpaces,
      icon: <PinIcon />,
    },
    {
      title: "Register Space",
      url: dashboardLinks.registerSpace,
      icon: <MapIcon />,
    },
    {
      title: "My Spaces",
      url: dashboardLinks.mySpaces,
      icon: <CarFrontIcon />,
    },
  ],
  navSecondary: [
    {
      title: "Support",
      url: "#",
      icon: <LifeBuoyIcon />,
    },
    {
      title: "Feedback",
      url: "#",
      icon: <SendIcon />,
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
            <SidebarMenuButton
              size="lg"
              render={<Link href={dashboardLinks.home} />}
            >
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
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
    </Sidebar>
  )
}
