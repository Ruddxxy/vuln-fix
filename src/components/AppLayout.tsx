'use client'

import { useTranslation } from "react-i18next"
import { useGlobalStore } from "@/store/global"
import { useHistoryStore } from "@/store/history"
import { useTaskStore } from "@/store/task"
import dynamic from "next/dynamic"
import {
  SidebarLayout,
  Sidebar,
  SidebarHeader,
  SidebarBody,
  SidebarFooter,
  SidebarSection,
  SidebarItem,
  SidebarLabel,
  SidebarHeading,
  SidebarDivider,
  SidebarSpacer,
  Navbar,
  NavbarSection,
  NavbarSpacer,
  NavbarItem,
  NavbarLabel,
} from "@/components/catalyst"
import {
  Search,
  Settings,
  History,
  Github,
  FileText,
  Sun,
  Moon,
  Plus,
  Clock,
  Newspaper,
} from "lucide-react"
import { useTheme } from "next-themes"

const Setting = dynamic(() => import("@/components/Setting"))
const HistoryPanel = dynamic(() => import("@/components/History"))
const RateLimitStatus = dynamic(() => import("@/components/RateLimitStatus"))
const ConnectionStatusIndicator = dynamic(() => import("@/components/ConnectionStatus").then(mod => mod.ConnectionStatusIndicator))

const VERSION = process.env.NEXT_PUBLIC_VERSION

interface AppLayoutProps {
  children: React.ReactNode
}

function AppSidebar() {
  const { t } = useTranslation()
  const { setOpenSetting, setOpenHistory } = useGlobalStore()
  const historyStore = useHistoryStore()
  const taskStore = useTaskStore()
  const { theme, setTheme } = useTheme()

  const recentHistory = Object.entries(historyStore.history)
    .sort(([, a], [, b]) => (b.updateTime || 0) - (a.updateTime || 0))
    .slice(0, 5)

  const handleNewResearch = () => {
    const { id, backup, reset } = useTaskStore.getState()
    const { update } = useHistoryStore.getState()
    if (id) update(id, backup())
    reset()
  }

  const handleLoadHistory = (id: string) => {
    const { restore } = useTaskStore.getState()
    const item = historyStore.history[id]
    if (item) {
      restore(item)
    }
  }

  return (
    <Sidebar className="bg-zinc-50 dark:bg-zinc-900">
      <SidebarHeader>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-600">
            <Newspaper className="h-5 w-5 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-zinc-950 dark:text-white">
              Deep Journalist
            </span>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              v{VERSION}
            </span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarBody>
        <SidebarSection>
          <SidebarItem onClick={handleNewResearch}>
            <Plus data-slot="icon" className="h-5 w-5" />
            <SidebarLabel>{t("research.common.newResearch")}</SidebarLabel>
          </SidebarItem>
        </SidebarSection>

        <SidebarDivider />

        <SidebarSection>
          <SidebarHeading>Recent Research</SidebarHeading>
          {recentHistory.length > 0 ? (
            recentHistory.map(([id, item]) => (
              <SidebarItem key={id} onClick={() => handleLoadHistory(id)}>
                <FileText data-slot="icon" className="h-5 w-5" />
                <SidebarLabel>
                  {item.question?.slice(0, 30) || "Untitled"}
                  {(item.question?.length || 0) > 30 ? "..." : ""}
                </SidebarLabel>
              </SidebarItem>
            ))
          ) : (
            <p className="px-2 text-xs text-zinc-500 dark:text-zinc-400">
              No recent research
            </p>
          )}
          <SidebarItem onClick={() => setOpenHistory(true)}>
            <History data-slot="icon" className="h-5 w-5" />
            <SidebarLabel>View All History</SidebarLabel>
          </SidebarItem>
        </SidebarSection>

        <SidebarSpacer />

        <SidebarSection>
          <SidebarHeading>Status</SidebarHeading>
          <div className="px-2">
            <RateLimitStatus />
            <div className="mt-2">
              <ConnectionStatusIndicator />
            </div>
          </div>
        </SidebarSection>
      </SidebarBody>

      <SidebarFooter>
        <SidebarSection>
          <SidebarItem onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
            {theme === 'dark' ? (
              <Sun data-slot="icon" className="h-5 w-5" />
            ) : (
              <Moon data-slot="icon" className="h-5 w-5" />
            )}
            <SidebarLabel>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</SidebarLabel>
          </SidebarItem>
          <SidebarItem onClick={() => setOpenSetting(true)}>
            <Settings data-slot="icon" className="h-5 w-5" />
            <SidebarLabel>{t("setting.title")}</SidebarLabel>
          </SidebarItem>
          <SidebarItem href="https://github.com/CaullenOmdahl/deep-journalist">
            <Github data-slot="icon" className="h-5 w-5" />
            <SidebarLabel>GitHub</SidebarLabel>
          </SidebarItem>
        </SidebarSection>
      </SidebarFooter>
    </Sidebar>
  )
}

function AppNavbar() {
  const { t } = useTranslation()
  const taskStore = useTaskStore()

  return (
    <Navbar>
      <NavbarSpacer />
      <NavbarSection>
        <NavbarItem>
          <Search data-slot="icon" className="h-5 w-5" />
        </NavbarItem>
        {taskStore.question && (
          <span className="text-sm text-zinc-600 dark:text-zinc-400 truncate max-w-[200px]">
            {taskStore.question.slice(0, 40)}...
          </span>
        )}
      </NavbarSection>
    </Navbar>
  )
}

export default function AppLayout({ children }: AppLayoutProps) {
  const globalStore = useGlobalStore()

  return (
    <>
      <SidebarLayout
        sidebar={<AppSidebar />}
        navbar={<AppNavbar />}
      >
        {children}
      </SidebarLayout>

      <aside className="print:hidden">
        <Setting
          open={globalStore.openSetting}
          onClose={() => globalStore.setOpenSetting(false)}
        />
        <HistoryPanel
          open={globalStore.openHistory}
          onClose={() => globalStore.setOpenHistory(false)}
        />
      </aside>
    </>
  )
}
