"use client";

import { useTranslation } from "react-i18next";
import { FileText, AlertCircle, AlertTriangle, Scale, X, Globe, Check, LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/Button";
import { CopyButton } from "@/components/ui/copy-button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { useTaskStore } from "@/store/task";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import useDeepResearch from "@/hooks/useDeepResearch";
import { useState } from "react";
import WordCountIndicator from "./WordCountIndicator";
import ContentWarningDialog, { ContentWarning } from "./ContentWarningDialog";
import BiasDetector from "./BiasDetector";
import JournalisticMetricsPanel from "./JournalisticMetricsPanel";
import CitationManager from "./CitationManager";
import ClaimsVerificationPanel, { Claim } from "./ClaimsVerificationPanel";
import ExportMenu from "./ExportMenu";
import SocialShareMenu from "./SocialShareMenu";
import { streamText, smoothStream } from "ai";
import { useModelProvider } from "@/hooks/useAiProvider";
import { useSettingStore } from "@/store/setting";
import rateLimiter from "@/utils/rate-limiter";
import { LANGUAGES, getLanguageName } from "@/constants/languages";

/**
 * Type guard to check if an error has rate limit properties
 */
interface RateLimitError {
  statusCode?: number;
  code?: number;
  message?: string;
}

function isRateLimitError(error: unknown): error is RateLimitError {
  if (error && typeof error === 'object') {
    const err = error as Record<string, unknown>;
    return (
      err.statusCode === 429 ||
      err.code === 429 ||
      (typeof err.message === 'string' && err.message.includes('rate limit'))
    );
  }
  return false;
}

const articleTypeLabels = {
  news: {
    label: "News Article",
    description: "500-800 words, focused reporting on current events"
  },
  feature: {
    label: "Feature Article",
    description: "800-1,500 words, in-depth coverage with human interest"
  },
  investigative: {
    label: "Investigative Report",
    description: "1,500-2,500 words, thorough analysis of complex topics"
  },
  explainer: {
    label: "Explainer",
    description: "800-1,200 words, contextual information about a topic"
  }
};

function FinalReport() {
  const { t } = useTranslation();
  const taskStore = useTaskStore();
  const { writeFinalReport } = useDeepResearch();
  const { createProvider } = useModelProvider();
  const { networkingModel } = useSettingStore();
  const [isRewriting, setIsRewriting] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [targetLanguage, setTargetLanguage] = useState<string>("en");
  const [claims, setClaims] = useState<Claim[]>([]);
  const [contentWarnings, setContentWarnings] = useState<ContentWarning[]>([]);

  function getFinalReportContent() {
    const { finalReport, sources } = useTaskStore.getState();

    return [
      finalReport,
      sources.length > 0
        ? [
            "\n\n---",
            `## ${t("research.finalReport.researchedInfor", {
              total: sources.length,
            })}`,
            `${sources
              .map(
                (source, idx) =>
                  `${idx + 1}. [${source.title || source.url}](${source.url})`
              )
              .join("\n")}`,
          ].join("\n\n")
        : "",
      claims.length > 0
        ? [
            "\n\n---",
            "## Verified Claims",
            `${claims
              .map(
                (claim) =>
                  `- **${claim.text}**: ${claim.status}${claim.details ? ` - _${claim.details}_` : ''}`
              )
              .join("\n")}`,
          ].join("\n\n")
        : "",
    ].join("\n\n");
  }

  function getSocialMediaContent(platform: 'facebook' | 'twitter' | 'linkedin' | 'whatsapp'): string {
    const { title } = taskStore;
    const content = taskStore.finalReport;

    const paragraphs = content.split('\n\n');
    let firstPara = "";
    for (const para of paragraphs) {
      if (!para.startsWith('#') && para.trim().length > 20) {
        firstPara = para;
        break;
      }
    }

    const cleanTitle = title.replace(/^#\s+/, '').replace(/\*\*/g, '');

    switch (platform) {
      case 'twitter':
        return `${cleanTitle}\n\n${firstPara.substring(0, Math.min(firstPara.length, 200))}${firstPara.length > 200 ? '...' : ''}\n\n#journalism #research`;

      case 'facebook':
        const fbParagraphs = paragraphs.filter(p => !p.startsWith('#') && p.trim().length > 0).slice(0, 3);
        return `${cleanTitle}\n\n${fbParagraphs.join('\n\n')}${paragraphs.length > 3 ? '\n\n(See full article for more...)' : ''}`;

      case 'linkedin':
        const bulletPoints = content.match(/[*-]\s.+/g) || [];
        const bulletSection = bulletPoints.length > 0
          ? `\n\nKey points:\n${bulletPoints.slice(0, 5).join('\n')}${bulletPoints.length > 5 ? '\n...' : ''}`
          : '';
        return `${cleanTitle}\n\n${firstPara}${bulletSection}\n\n#journalism #research #professional`;

      case 'whatsapp':
        return `*${cleanTitle}*\n\n${firstPara.substring(0, Math.min(firstPara.length, 300))}${firstPara.length > 300 ? '...' : ''}\n\n_Generated with Deep Journalist_`;

      default:
        return content;
    }
  }

  async function handleRewriteArticle() {
    try {
      setIsRewriting(true);
      await writeFinalReport();
    } finally {
      setIsRewriting(false);
    }
  }

  function handleArticleTypeChange(value: "news" | "feature" | "investigative" | "explainer") {
    taskStore.setArticleType(value);
  }

  const handleAddContentWarning = (warning: ContentWarning) => {
    setContentWarnings([...contentWarnings, warning]);
  };

  const handleRemoveContentWarning = (id: string) => {
    setContentWarnings(contentWarnings.filter((warning) => warning.id !== id));
  };

  const handleBiasNeutralize = (neutralizedText: string) => {
    taskStore.updateFinalReport(neutralizedText);
  };

  async function handleTranslateContent() {
    if (!taskStore.finalReport.trim()) {
      toast.error("No content to translate");
      return;
    }

    const translationModel = networkingModel || "gemini-2.0-flash";

    if (rateLimiter.isInCooldown(translationModel)) {
      const remaining = rateLimiter.getCooldownTimeRemaining(translationModel);
      toast.error(`Model is cooling down. Please wait ${remaining} seconds.`);
      return;
    }

    try {
      setIsTranslating(true);
      const provider = createProvider("google");

      toast.info(`Translating to ${getLanguageName(targetLanguage)}...`);
      rateLimiter.trackRequest(translationModel);

      const result = await streamText({
        model: provider(translationModel),
        system: "You are a professional translator. Translate the provided content while preserving all formatting, headlines, and paragraph structure. Keep markdown syntax intact. Do not add any additional text or explanations.",
        prompt: `Translate the following article to ${getLanguageName(targetLanguage)}. Preserve all markdown formatting:\n\n${taskStore.finalReport}`,
        experimental_transform: smoothStream(),
        onError: (error) => {
          console.error("Translation error:", error);
          if (isRateLimitError(error)) {
            rateLimiter.handleRateLimitError(translationModel, error);
            return;
          }
          toast.error("Translation failed. Please try again later.");
        },
      });

      let translatedContent = "";
      for await (const textPart of result.textStream) {
        translatedContent += textPart;
      }

      taskStore.updateFinalReport(translatedContent);
      toast.success(`Translation to ${getLanguageName(targetLanguage)} completed`);

    } catch (error) {
      console.error("Translation error:", error);
      if (isRateLimitError(error)) {
        rateLimiter.handleRateLimitError(translationModel, error);
        return;
      }
      toast.error("Translation failed. Please try again later.");
    } finally {
      setIsTranslating(false);
    }
  }

  return (
    <section className="p-4 border rounded-md mt-4 print:border-none">
      {/* Header with title and action buttons */}
      <div className="flex justify-between items-center border-b mb-2 print:hidden">
        <h3 className="font-semibold text-lg leading-10">
          {t("research.finalReport.title")}
        </h3>
        <div className="flex items-center gap-2">
          {taskStore.finalReport && (
            <CopyButton
              text={getFinalReportContent()}
              label="Copy Article"
              successMessage="Full article copied to clipboard"
              variant="outline"
              size="sm"
            />
          )}

          {/* Article Type Selector */}
          <div className="flex items-center gap-1 border rounded-md p-0.5 bg-muted/50">
            <TooltipProvider>
              {(Object.keys(articleTypeLabels) as Array<keyof typeof articleTypeLabels>).map((type) => (
                <Tooltip key={type}>
                  <TooltipTrigger asChild>
                    <Button
                      variant={taskStore.articleType === type ? "default" : "ghost"}
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={() => handleArticleTypeChange(type)}
                    >
                      {articleTypeLabels[type].label.replace(" Article", "").replace(" Report", "")}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-[200px]">
                    <p className="font-medium">{articleTypeLabels[type].label}</p>
                    <p className="text-xs text-muted-foreground">{articleTypeLabels[type].description}</p>
                  </TooltipContent>
                </Tooltip>
              ))}
            </TooltipProvider>
          </div>

          {/* Write Article Button */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  className="h-8"
                  disabled={isRewriting}
                  onClick={handleRewriteArticle}
                >
                  {isRewriting ? (
                    <>
                      <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <FileText className="mr-2 h-4 w-4" />
                      Write Article
                    </>
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Generate a journalistic article based on your sources and research</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Translate Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" disabled={isTranslating}>
                <Globe className="mr-2 h-4 w-4" />
                {isTranslating ? "Translating..." : "Translate"}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Select language</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {LANGUAGES.map(lang => (
                <DropdownMenuItem
                  key={lang.code}
                  onClick={() => {
                    setTargetLanguage(lang.code);
                    if (lang.code !== "en") {
                      handleTranslateContent();
                    } else {
                      toast.info("Already in English");
                    }
                  }}
                >
                  <span>{lang.name}</span>
                  {lang.code === targetLanguage && (
                    <Check className="ml-2 h-4 w-4" />
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Social Share Menu */}
          <SocialShareMenu
            title={taskStore.title}
            finalReport={taskStore.finalReport}
          />

          {/* Export Menu */}
          <ExportMenu
            title={taskStore.title}
            finalReport={taskStore.finalReport}
            sources={taskStore.sources}
            claims={claims}
            articleType={taskStore.articleType || 'news'}
            getFinalReportContent={getFinalReportContent}
            getSocialMediaContent={getSocialMediaContent}
          />
        </div>
      </div>

      {/* Tools and indicators section */}
      <div className="space-y-3 mb-4 print:hidden">
        {/* Content Warnings */}
        <div className="flex flex-wrap gap-2 items-center">
          {contentWarnings.length > 0 && (
            <>
              <Badge variant="outline" className="bg-yellow-50 border-yellow-200 text-yellow-800">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Content Warnings:
              </Badge>
              {contentWarnings.map((warning) => (
                <Badge
                  key={warning.id}
                  variant="outline"
                  className="bg-yellow-50 flex items-center gap-1 pl-2 border-yellow-200"
                >
                  {warning.type}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-4 w-4 ml-1 hover:bg-yellow-100"
                    onClick={() => handleRemoveContentWarning(warning.id)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              ))}
            </>
          )}
          <ContentWarningDialog
            contentWarnings={contentWarnings}
            onAdd={handleAddContentWarning}
            onRemove={handleRemoveContentWarning}
          >
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1">
                    <AlertTriangle className="h-4 w-4" />
                    <span>{t("editor.add-warning")}</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>Add a content warning for sensitive or potentially triggering material</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </ContentWarningDialog>
        </div>

        {/* Word Count Indicator */}
        <WordCountIndicator
          content={taskStore.finalReport.replace(/#+\s/g, "").replace(/[*-]\s/g, "")}
          articleType={taskStore.articleType || 'news'}
        />

        {/* Bias Detector */}
        <BiasDetector
          content={taskStore.finalReport}
          onNeutralize={handleBiasNeutralize}
        >
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1">
                  <Scale className="h-4 w-4" />
                  <span>{t("editor.detect-bias")}</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>Detect and neutralize potential bias in your article</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </BiasDetector>

        {/* Journalistic Metrics Panel */}
        {taskStore.finalReport && taskStore.sources.length > 0 && (
          <JournalisticMetricsPanel
            content={taskStore.finalReport}
            sources={taskStore.sources}
          />
        )}

        {/* Claims Verification Panel */}
        <ClaimsVerificationPanel
          claims={claims}
          setClaims={setClaims}
        />
      </div>

      {/* Article Content */}
      {taskStore.finalReport ? (
        <>
          <div className="article-content prose dark:prose-invert prose-sm sm:prose-base lg:prose-lg max-w-none">
            {taskStore.finalReport.split("\n").map((line, index) => {
              if (line.startsWith("# ")) {
                return <h1 key={index} className="text-xl font-bold mt-4 mb-2">{line.substring(2)}</h1>;
              } else if (line.startsWith("## ")) {
                return <h2 key={index} className="text-lg font-bold mt-3 mb-2">{line.substring(3)}</h2>;
              } else if (line.startsWith("### ")) {
                return <h3 key={index} className="text-md font-bold mt-3 mb-1">{line.substring(4)}</h3>;
              } else if (line.startsWith("- ")) {
                return <div key={index} className="flex ml-4"><span className="mr-2">-</span>{line.substring(2)}</div>;
              } else if (line.startsWith("* ")) {
                return <div key={index} className="flex ml-4"><span className="mr-2">-</span>{line.substring(2)}</div>;
              } else if (line.trim() === "") {
                return <div key={index} className="h-4"></div>;
              } else {
                return <p key={index} className="my-2">{line}</p>;
              }
            })}
          </div>

          <Separator className="mt-4 print:hidden" />

          {/* Sources Section */}
          <div className="pt-3 print:hidden">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-semibold">
                {t("research.finalReport.researchedInfor", {
                  total: taskStore.sources.length,
                })}
              </h3>
              {taskStore.sources.length > 0 && (
                <div className="flex gap-2">
                  <CopyButton
                    text={taskStore.sources.map((s, idx) => `${idx + 1}. ${s.title || s.url} - ${s.url}`).join('\n')}
                    label="Copy Sources"
                    successMessage="All sources copied to clipboard"
                    variant="ghost"
                    size="sm"
                  />
                  <CopyButton
                    text={taskStore.sources.map(s => s.url).join('\n')}
                    label="Copy URLs"
                    successMessage="Source URLs copied to clipboard"
                    variant="ghost"
                    size="sm"
                  />
                </div>
              )}
            </div>
            {taskStore.sources.length === 0 ? (
              <div>No source...</div>
            ) : (
              <div>
                <ol>
                  {taskStore.sources.map((source, idx) => (
                    <li key={idx} className="mb-1 flex gap-1">
                      <a
                        href={source.url}
                        className="text-blue-500 hover:underline"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {source.title || source.url}
                      </a>
                      {source.credibilityScore && (
                        <span className="text-xs text-muted-foreground">
                          (Credibility: {source.credibilityScore}/10)
                        </span>
                      )}
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>

          {/* Citation Manager */}
          {taskStore.sources.length > 0 && (
            <CitationManager sources={taskStore.sources} />
          )}
        </>
      ) : (
        <div className="h-60 flex flex-col gap-2 items-center justify-center text-center text-muted-foreground max-w-lg mx-auto">
          <AlertCircle className="h-10 w-10 text-muted" />
          <div>
            <h4 className="text-lg font-semibold">
              {t("research.finalReport.emptyTitle")}
            </h4>
            <p className="text-sm">{t("research.finalReport.emptyTip")}</p>
          </div>
        </div>
      )}
    </section>
  );
}

export default FinalReport;
