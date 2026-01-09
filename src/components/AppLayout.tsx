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
    <Sidebar className="bg-zinc-900">
      <SidebarHeader className="border-b border-zinc-800 px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-600">
            <Newspaper className="h-5 w-5 text-white" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-base font-semibold text-white">
              Deep Journalist
            </span>
            <span className="text-xs text-zinc-500">
              v{VERSION}
            </span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarBody className="!px-0 !py-4">
        <SidebarSection>
          <SidebarItem onClick={handleNewResearch} className="rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white">
            <Plus data-slot="icon" className="h-4 w-4 text-white" />
            <SidebarLabel className="text-white font-medium">{t("research.common.newResearch")}</SidebarLabel>
          </SidebarItem>
        </SidebarSection>

        <div className="mt-6">
          <SidebarHeading className="px-3 text-xs font-medium uppercase tracking-wider text-zinc-500 mb-2">
            Recent Research
          </SidebarHeading>
          <SidebarSection className="[&_button]:justify-start [&_a]:justify-start">
            {recentHistory.length > 0 ? (
              recentHistory.map(([id, item]) => (
                <SidebarItem key={id} onClick={() => handleLoadHistory(id)} className="rounded-lg">
                  <FileText data-slot="icon" className="h-4 w-4 text-zinc-400" />
                  <SidebarLabel className="text-zinc-300">
                    {item.question?.slice(0, 28) || "Untitled"}
                    {(item.question?.length || 0) > 28 ? "..." : ""}
                  </SidebarLabel>
                </SidebarItem>
              ))
            ) : (
              <p className="px-3 py-2 text-sm text-zinc-500">
                No recent research
              </p>
            )}
            <SidebarItem onClick={() => setOpenHistory(true)} className="rounded-lg">
              <History data-slot="icon" className="h-4 w-4 text-zinc-400" />
              <SidebarLabel className="text-zinc-300">View All History</SidebarLabel>
            </SidebarItem>
          </SidebarSection>
        </div>

        <SidebarSpacer />

        <div className="mt-6">
          <SidebarHeading className="px-3 text-xs font-medium uppercase tracking-wider text-zinc-500 mb-2">
            Status
          </SidebarHeading>
          <div className="px-3 py-2 rounded-lg bg-zinc-800/50">
            <RateLimitStatus />
            <div className="mt-2">
              <ConnectionStatusIndicator />
            </div>
          </div>
        </div>
      </SidebarBody>

      <SidebarFooter className="border-t border-zinc-800 !px-0 !py-3">
        <div className="flex flex-col gap-1">
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium text-zinc-300 hover:bg-white/5"
          >
            {theme === 'dark' ? (
              <Sun className="h-4 w-4 text-zinc-400" />
            ) : (
              <Moon className="h-4 w-4 text-zinc-400" />
            )}
            <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
          </button>
          <button
            onClick={() => setOpenSetting(true)}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium text-zinc-300 hover:bg-white/5"
          >
            <Settings className="h-4 w-4 text-zinc-400" />
            <span>{t("setting.title")}</span>
          </button>
          <a
            href="https://github.com/CaullenOmdahl/deep-journalist"
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium text-zinc-300 hover:bg-white/5"
          >
            <Github className="h-4 w-4 text-zinc-400" />
            <span>GitHub</span>
          </a>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}

function AppNavbar() {
  const taskStore = useTaskStore()

  return (
    <Navbar>
      <NavbarSpacer />
      <NavbarSection>
        <NavbarItem>
          <Search data-slot="icon" className="h-5 w-5" />
        </NavbarItem>
        {taskStore.question && (
          <span className="text-sm text-zinc-400 truncate max-w-[200px]">
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
