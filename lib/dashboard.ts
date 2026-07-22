export const dashboardLinks = {
  home: "/dashboard",
  findSpaces: "/dashboard/find-spaces",
  registerSpace: "/dashboard/register-space",
  bookSpace: "/dashboard/book-space",
  playground: "/dashboard/playground",
  playgroundHistory: "/dashboard/playground/history",
  playgroundStarred: "/dashboard/playground/starred",
  playgroundSettings: "/dashboard/playground/settings",
  models: "/dashboard/models",
  modelsGenesis: "/dashboard/models/genesis",
  modelsExplorer: "/dashboard/models/explorer",
  modelsQuantum: "/dashboard/models/quantum",
  documentation: "/dashboard/documentation",
  documentationIntroduction: "/dashboard/documentation/introduction",
  documentationGetStarted: "/dashboard/documentation/get-started",
  documentationTutorials: "/dashboard/documentation/tutorials",
  documentationChangelog: "/dashboard/documentation/changelog",
  settings: "/dashboard/settings",
  settingsGeneral: "/dashboard/settings/general",
  settingsTeam: "/dashboard/settings/team",
  settingsBilling: "/dashboard/settings/billing",
  settingsLimits: "/dashboard/settings/limits",
  projects: "/dashboard/projects",
  projectDesignEngineering: "/dashboard/projects/design-engineering",
  projectSalesMarketing: "/dashboard/projects/sales-marketing",
  projectTravel: "/dashboard/projects/travel",
} as const

type DashboardRouteInfo = {
  title: string
  description: string
}

const routeInfo: Record<string, DashboardRouteInfo> = {
  "": {
    title: "Dashboard",
    description: "Choose a section from the sidebar to update the content pane.",
  },
  "find-spaces": {
    title: "Find Spaces",
    description: "Search for and compare nearby private parking spaces.",
  },
  "register-space": {
    title: "Register Space",
    description: "List a private parking space on Fpark.",
  },
  "book-space": {
    title: "Book Space",
    description: "Choose booking times and confirm a reservation.",
  },
  playground: {
    title: "Playground",
    description: "A workspace for trying things out and reviewing recent activity.",
  },
  "playground/history": {
    title: "History",
    description: "A timeline of the most recent actions and changes.",
  },
  "playground/starred": {
    title: "Starred",
    description: "Saved items that need quick access.",
  },
  "playground/settings": {
    title: "Playground Settings",
    description: "Controls and preferences for the playground section.",
  },
  models: {
    title: "Models",
    description: "Switch between available model experiences and compare output.",
  },
  "models/genesis": {
    title: "Genesis",
    description: "The Genesis model workspace and related configuration.",
  },
  "models/explorer": {
    title: "Explorer",
    description: "A browsing view for exploring model behavior and results.",
  },
  "models/quantum": {
    title: "Quantum",
    description: "A higher-level model workspace for advanced experiments.",
  },
  documentation: {
    title: "Documentation",
    description: "Read, reference, and browse product guidance.",
  },
  "documentation/introduction": {
    title: "Introduction",
    description: "An overview of how the product is organized.",
  },
  "documentation/get-started": {
    title: "Get Started",
    description: "The shortest path to a working setup.",
  },
  "documentation/tutorials": {
    title: "Tutorials",
    description: "Hands-on walkthroughs for common tasks.",
  },
  "documentation/changelog": {
    title: "Changelog",
    description: "Recent releases, fixes, and updates.",
  },
  settings: {
    title: "Settings",
    description: "Manage account, team, and billing preferences.",
  },
  "settings/general": {
    title: "General",
    description: "Core settings and application defaults.",
  },
  "settings/team": {
    title: "Team",
    description: "Members, roles, and collaboration settings.",
  },
  "settings/billing": {
    title: "Billing",
    description: "Plan, invoices, and payment controls.",
  },
  "settings/limits": {
    title: "Limits",
    description: "Usage ceilings and operational guardrails.",
  },
  projects: {
    title: "Projects",
    description: "Quick access to the active project spaces.",
  },
  "projects/design-engineering": {
    title: "Design Engineering",
    description: "The design engineering project workspace.",
  },
  "projects/sales-marketing": {
    title: "Sales & Marketing",
    description: "The sales and marketing project workspace.",
  },
  "projects/travel": {
    title: "Travel",
    description: "The travel project workspace.",
  },
}

export function getDashboardRouteInfo(segments: string[]) {
  const key = segments.join("/")
  return routeInfo[key] ?? {
    title: segments.at(-1)?.replace(/-/g, " ") ?? "Dashboard",
    description: `Content for ${segments.join(" / ")}.`,
  }
}