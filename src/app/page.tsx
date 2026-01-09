"use client";
import dynamic from "next/dynamic";
import { useTranslation } from "react-i18next";
import { useGlobalStore } from "@/store/global";
import { useState } from "react";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import {
  Search,
  FileText,
  Shield,
  BarChart,
  Clock,
  Users,
  Scale,
  Link,
  Radar,
  CalendarDays,
  AlertTriangle,
  MessageSquare,
  CheckCircle2,
  Layout,
  ArrowRight,
  Sparkles
} from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CatalystButton } from "@/components/catalyst";

const AppLayout = dynamic(() => import("@/components/AppLayout"));
const Topic = dynamic(() => import("@/components/Research/Topic"));
const Feedback = dynamic(() => import("@/components/Research/Feedback"));
const SearchResult = dynamic(() => import("@/components/Research/SearchResult"));
const FinalReport = dynamic(() => import("@/components/Research/FinalReport"));

// Landing Page Component
function LandingPage({ onStart }: { onStart: () => void }) {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 via-white to-indigo-50 dark:from-zinc-950 dark:via-zinc-900 dark:to-indigo-950">
      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Hero Section */}
        <header className="text-center mb-20">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-sm font-medium mb-6">
            <Sparkles className="h-4 w-4" />
            AI-Powered Journalism Research
          </div>
          <h1 className="text-5xl md:text-6xl font-bold text-zinc-900 dark:text-white mb-6 tracking-tight">
            Deep Journalist
          </h1>
          <p className="text-xl text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Transform your research workflow with AI that understands journalistic integrity.
            Verify facts, detect bias, and create balanced stories.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <CatalystButton color="indigo" onClick={onStart} className="text-lg px-8 py-3">
              <Search className="h-5 w-5 mr-2" />
              Start Researching
              <ArrowRight className="h-5 w-5 ml-2" />
            </CatalystButton>
            <CatalystButton outline href="https://github.com/CaullenOmdahl/deep-journalist" className="text-lg px-8 py-3">
              View on GitHub
            </CatalystButton>
          </div>
        </header>

        {/* Principles Section */}
        <section className="mb-20">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <h2 className="text-3xl font-bold text-zinc-900 dark:text-white mb-6">
                Built on Journalistic Principles
              </h2>
              <p className="text-lg text-zinc-600 dark:text-zinc-400 mb-6">
                Deep Journalist embeds SPJ (Society of Professional Journalists) ethics
                into every aspect of the research process.
              </p>
              <div className="space-y-4">
                {[
                  { icon: CheckCircle2, title: "Accuracy & Verification", desc: "Automated fact-checking and claim verification" },
                  { icon: Scale, title: "Fairness & Balance", desc: "Bias detection and multiple perspective analysis" },
                  { icon: Shield, title: "Transparency", desc: "Source credibility assessment and attribution" },
                  { icon: Users, title: "Independence", desc: "Unbiased research without conflicts of interest" },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-4">
                    <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                      <item.icon className="h-5 w-5 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-zinc-900 dark:text-white">{item.title}</h3>
                      <p className="text-sm text-zinc-600 dark:text-zinc-400">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white dark:bg-zinc-800 rounded-2xl shadow-xl p-8 border border-zinc-200 dark:border-zinc-700">
              <div className="space-y-4">
                <div className="h-4 bg-zinc-200 dark:bg-zinc-700 rounded w-3/4 animate-pulse"></div>
                <div className="h-4 bg-zinc-200 dark:bg-zinc-700 rounded w-full animate-pulse"></div>
                <div className="h-4 bg-zinc-200 dark:bg-zinc-700 rounded w-5/6 animate-pulse"></div>
                <div className="mt-6 flex gap-2">
                  <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-medium rounded-full">Verified</span>
                  <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs font-medium rounded-full">3 Sources</span>
                  <span className="px-3 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-xs font-medium rounded-full">Low Bias</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section className="mb-20">
          <h2 className="text-3xl font-bold text-zinc-900 dark:text-white text-center mb-12">
            Powerful Features for Journalists
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: Link, title: "Source Validation", desc: "Assess credibility with domain reputation checking, bias detection, and transparency indicators.", color: "indigo" },
              { icon: AlertTriangle, title: "Bias Detection", desc: "Identify potentially biased language and get suggestions for neutral alternatives.", color: "amber" },
              { icon: MessageSquare, title: "Claim Verification", desc: "Track and verify claims with visual indicators for verified, unverified, and disputed info.", color: "green" },
              { icon: CalendarDays, title: "Timeline Visualization", desc: "Extract and visualize chronological events to establish clear timelines.", color: "blue" },
              { icon: Radar, title: "Story Tracking", desc: "Monitor developing stories and get notified of new information.", color: "purple" },
              { icon: Layout, title: "Article Templates", desc: "Access professional templates for different article formats.", color: "rose" },
            ].map((feature, i) => (
              <Card key={i} className="group hover:shadow-lg transition-all duration-300 border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800">
                <CardHeader>
                  <div className={`h-12 w-12 rounded-xl bg-${feature.color}-100 dark:bg-${feature.color}-900/30 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                    <feature.icon className={`h-6 w-6 text-${feature.color}-600 dark:text-${feature.color}-400`} />
                  </div>
                  <CardTitle className="text-zinc-900 dark:text-white">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-zinc-600 dark:text-zinc-400">{feature.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Workflow Section */}
        <section className="mb-20">
          <h2 className="text-3xl font-bold text-zinc-900 dark:text-white text-center mb-12">
            Streamlined Research Workflow
          </h2>
          <div className="grid md:grid-cols-4 gap-8">
            {[
              { step: "1", title: "Define Topic", desc: "Enter your topic or article URL" },
              { step: "2", title: "Gather Sources", desc: "AI finds and validates sources" },
              { step: "3", title: "Analyze & Verify", desc: "Fact-check claims and detect bias" },
              { step: "4", title: "Generate Report", desc: "Get a balanced, cited article" },
            ].map((item, i) => (
              <div key={i} className="text-center">
                <div className="h-16 w-16 rounded-full bg-indigo-600 text-white text-2xl font-bold flex items-center justify-center mx-auto mb-4">
                  {item.step}
                </div>
                <h3 className="font-semibold text-zinc-900 dark:text-white mb-2">{item.title}</h3>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA Section */}
        <section className="text-center bg-gradient-to-r from-indigo-600 to-purple-600 rounded-3xl p-12">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to Elevate Your Journalism?
          </h2>
          <p className="text-lg text-indigo-100 mb-8 max-w-xl mx-auto">
            Join journalists who trust AI to enhance their research while maintaining the highest ethical standards.
          </p>
          <CatalystButton color="dark" onClick={onStart} className="text-lg px-8 py-3">
            <Search className="h-5 w-5 mr-2" />
            Start Your Research
          </CatalystButton>
        </section>

        {/* Footer */}
        <footer className="mt-20 pt-8 border-t border-zinc-200 dark:border-zinc-800 text-center">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Deep Journalist is committed to supporting ethical journalism and advancing the profession's highest standards.
          </p>
          <p className="text-sm mt-2">
            <a href="https://github.com/CaullenOmdahl/deep-journalist" target="_blank" rel="noopener noreferrer" className="text-indigo-600 dark:text-indigo-400 hover:underline">
              {t("copyright", { name: "Deep Journalist" })}
            </a>
          </p>
        </footer>
      </div>
    </div>
  );
}

// Main Research Interface
function ResearchInterface() {
  return (
    <AppLayout>
      <div className="space-y-6">
        <Topic />
        <Feedback />
        <SearchResult />
        <FinalReport />
      </div>
    </AppLayout>
  );
}

// Main Page Component
function Home() {
  const { t } = useTranslation();
  const globalStore = useGlobalStore();
  const [showLandingPage, setShowLandingPage] = useState(!globalStore.hasUsedBefore);

  const handleStartResearch = () => {
    globalStore.setHasUsedBefore(true);
    setShowLandingPage(false);
  };

  // Enable keyboard shortcuts (only when not on landing page)
  useKeyboardShortcuts({
    enabled: !showLandingPage,
  });

  if (showLandingPage) {
    return <LandingPage onStart={handleStartResearch} />;
  }

  return <ResearchInterface />;
}

export default Home;
