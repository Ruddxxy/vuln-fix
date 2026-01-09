import { useState } from "react";
import { streamText, streamObject, smoothStream } from "ai";
import { useTranslation } from "react-i18next";
import Plimit from "p-limit";
import { toast } from "sonner";
import { useModelProvider } from "@/hooks/useAiProvider";
import { useTaskStore } from "@/store/task";
import { useHistoryStore } from "@/store/history";
import { useSettingStore } from "@/store/setting";
import { useGlobalStore } from "@/store/global";
import logger from "@/utils/logger";
import {
  getSystemPrompt,
  getOutputGuidelinesPrompt,
  generateQuestionsPrompt,
  generateSerpQueriesPrompt,
  generateJournalisticQueriesPrompt,
  processSearchResultPrompt,
  processJournalisticSearchResultPrompt,
  reviewSerpQueriesPrompt,
  writeFinalReportPrompt,
  writeJournalisticArticlePrompt,
  getSERPQuerySchema,
} from "@/utils/deep-research";
import { parseError } from "@/utils/error";
import { flat } from "radash";
import rateLimiter, { isRateLimitError } from "@/utils/rate-limiter";
import { FALLBACK_ORDER } from "@/constants/models";

function getResponseLanguagePrompt(lang: string) {
  return `**Respond in ${lang}**`;
}

function handleError(error: unknown) {
  const errorMessage = parseError(error);
  toast.error(errorMessage);
}


// Get the best available model (respecting cooldowns, exhaustion, and known unavailable models)
function getAvailableModel(preferredModel: string): string {
  // Check if preferred model has been confirmed unavailable (via actual API errors)
  if (rateLimiter.isModelDeprecated(preferredModel)) {
    // Only log silently - no toast here since the error toast was already shown when the model was marked unavailable
    logger.info(`Model ${preferredModel} was previously marked unavailable, finding fallback`);
    const fallback = rateLimiter.getFallbackModel(preferredModel);
    if (fallback) {
      logger.info(`Using fallback model ${fallback} instead of ${preferredModel}`);
      return fallback;
    }
  }

  // Check if preferred model is in cooldown or exhausted
  if (rateLimiter.isInCooldown(preferredModel) || rateLimiter.isModelExhausted(preferredModel)) {
    const fallback = rateLimiter.getFallbackModel(preferredModel);
    if (fallback) {
      logger.info(`Using fallback model ${fallback} instead of ${preferredModel} (cooldown/exhausted)`);
      return fallback;
    }
  }

  // If no issues, use the preferred model
  if (!rateLimiter.isInCooldown(preferredModel) && !rateLimiter.isModelExhausted(preferredModel) && !rateLimiter.isModelDeprecated(preferredModel)) {
    return preferredModel;
  }

  // If no fallback available, return the first available fallback model
  logger.warn(`No fallback available for ${preferredModel}, using first available fallback`);
  for (const model of FALLBACK_ORDER) {
    if (!rateLimiter.isInCooldown(model) && !rateLimiter.isModelExhausted(model)) {
      return model;
    }
  }

  // Last resort - return the preferred model anyway
  return preferredModel;
}

// Sleep helper for retry delays
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function useDeepResearch() {
  const { t } = useTranslation();
  const taskStore = useTaskStore();
  const { createProvider } = useModelProvider();
  const [status, setStatus] = useState<string>("");

  // Check for model cooldown and display message if needed
  const checkModelCooldown = (model: string): boolean => {
    if (rateLimiter.isInCooldown(model)) {
      const remainingSeconds = rateLimiter.getCooldownTimeRemaining(model);
      toast.error(
        `Model ${model} is cooling down. Please wait ${remainingSeconds} seconds before trying again.`
      );
      return true;
    }
    return false;
  };

  // Check for API key and provide appropriate guidance
  function checkApiConfiguration(): boolean {
    const { apiKey, accessPassword } = useSettingStore.getState();
    
    if (!apiKey && !accessPassword) {
      logger.error("Missing API key - opening settings dialog");
      toast.error("Please add your Google Gemini API key in settings to start research", { duration: 5000 });
      const { setOpenSetting } = useGlobalStore.getState();
      setOpenSetting(true);
      return false;
    }
    
    return true;
  }

  async function askQuestions() {
    logger.info("askQuestions() function called");

    // Check if API key is configured
    if (!checkApiConfiguration()) {
      return;
    }

    const { thinkingModel, language } = useSettingStore.getState();
    const modelToUse = getAvailableModel(thinkingModel);
    logger.info("Settings retrieved - thinkingModel:", thinkingModel, "modelToUse:", modelToUse, "language:", language);

    const { question } = useTaskStore.getState();
    logger.info("Question from taskStore:", question);

    // Check if model is in cooldown (after fallback selection)
    if (checkModelCooldown(modelToUse)) {
      logger.error("Model is in cooldown period, aborting askQuestions");
      return;
    }

    setStatus(t("research.common.thinking"));
    const provider = createProvider("google");
    logger.info("AI provider created for model:", modelToUse);
    
    try {
      logger.info("Tracking request to model:", modelToUse);
      // Track the request
      rateLimiter.trackRequest(modelToUse);

      logger.info("Preparing to stream text with prompt based on question:", question);
      const result = streamText({
        model: provider(modelToUse),
        system: getSystemPrompt(),
        prompt: [
          generateQuestionsPrompt(question),
          getResponseLanguagePrompt(language),
        ].join("\n\n"),
        experimental_transform: smoothStream(),
        onError: (error) => {
          logger.error("Error in streamText during askQuestions:", error);
          if (isRateLimitError(error)) {
            logger.info("Rate limit error detected, handling rate limit");
            rateLimiter.handleRateLimitError(modelToUse, error);
          } else {
            handleError(error);
          }
        },
      });

      let content = "";
      logger.info("Setting question in taskStore");
      taskStore.setQuestion(question);

      logger.info("Starting to process text stream");
      for await (const textPart of result.textStream) {
        content += textPart;
        taskStore.updateQuestions(content);
      }
      logger.info("Finished processing text stream, final content length:", content.length);

    } catch (error) {
      logger.error("Error in askQuestions:", error);
      if (isRateLimitError(error)) {
        rateLimiter.handleRateLimitError(modelToUse, error);
      } else {
        handleError(error);
      }
    }
  }

  async function runSearchTask(queries: SearchTask[]) {
    const { language, networkingModel } = useSettingStore.getState();
    setStatus(t("research.common.research"));

    // Parallel execution with staggered starts to avoid rate limit bursts
    // Concurrency of 3 balances speed vs rate limits for most API tiers
    const CONCURRENCY = 3;
    const STAGGER_DELAY_MS = 500; // Delay between starting each request

    const plimit = Plimit(CONCURRENCY);
    // Use the configured networking model with fallback support
    const searchModel = getAvailableModel(networkingModel || "gemini-2.5-flash");

    logger.info(`Starting ${queries.length} search tasks with concurrency ${CONCURRENCY}, using model: ${searchModel}`);

    // Create all tasks with staggered starts
    const taskPromises = queries.map((item, index) => {
      return plimit(async () => {
        // Stagger the start of each request to avoid burst rate limiting
        if (index > 0) {
          await sleep(index * STAGGER_DELAY_MS);
        }

        return processSearchQuery(item, searchModel, language);
      });
    });

    // Wait for all tasks to complete
    await Promise.allSettled(taskPromises);
    logger.info("All search tasks completed");
  }

  // Extracted search query processing for cleaner parallel execution
  async function processSearchQuery(item: SearchTask, searchModel: string, language: string): Promise<string> {
    const provider = createProvider("google");

    // Check if model is in cooldown
    if (checkModelCooldown(searchModel)) {
      taskStore.updateTask(item.query, { state: "unprocessed", learning: "Rate limit exceeded. Try again later." });
      return "";
    }

    let content = "";
    const sources: Source[] = [];
    taskStore.updateTask(item.query, { state: "processing" });

    try {
      // Track the request
      rateLimiter.trackRequest(searchModel);

      logger.info(`Processing search task: ${item.query}`);

      const searchResult = streamText({
        model: provider(searchModel, { useSearchGrounding: true }),
        system: getSystemPrompt(),
        prompt: [
          processJournalisticSearchResultPrompt(item.query, item.researchGoal),
          getResponseLanguagePrompt(language),
        ].join("\n\n"),
        experimental_transform: smoothStream(),
        onError: (error: unknown) => {
          if (isRateLimitError(error)) {
            rateLimiter.handleRateLimitError(searchModel, error);
            taskStore.updateTask(item.query, { state: "unprocessed", learning: "Rate limit exceeded. Will retry automatically." });
          } else {
            handleError(error);
            taskStore.updateTask(item.query, { state: "unprocessed" });
          }
        },
      });

      for await (const part of searchResult.fullStream) {
        if (part.type === "text-delta") {
          // AI SDK v5: textDelta renamed to delta
          content += (part as any).delta ?? (part as any).textDelta;
          taskStore.updateTask(item.query, { learning: content });
        } else if (part.type === "reasoning") {
          // AI SDK v5: textDelta renamed to delta
          logger.info("reasoning", (part as any).delta ?? (part as any).textDelta);
        }
      }

      // After stream completes, extract sources from grounding metadata
      // Gemini 2.5+ with search grounding returns sources in providerMetadata, not as stream events
      try {
        const response = await searchResult.response;
        const providerMetadata = (response as any).providerMetadata || (response as any).experimental_providerMetadata;
        const groundingMetadata = providerMetadata?.google?.groundingMetadata;

        if (groundingMetadata?.groundingChunks) {
          logger.info(`Found ${groundingMetadata.groundingChunks.length} grounding chunks`);

          for (const chunk of groundingMetadata.groundingChunks) {
            if (chunk.web && chunk.web.uri) {
              const source: Source = {
                url: chunk.web.uri,
                title: chunk.web.title || new URL(chunk.web.uri).hostname,
                sourceType: "secondary",
                id: `source-${Date.now()}-${sources.length + 1}`
              };
              sources.push(source);
            }
          }

          logger.info(`Extracted ${sources.length} sources from grounding metadata`);
        } else {
          logger.info("No grounding metadata found in response");
        }
      } catch (metadataError) {
        logger.error("Error extracting grounding metadata:", metadataError);
      }

      logger.info(`Task complete: ${item.query}. Found ${sources.length} sources.`);

      // Make sure all sources have titles
      const processedSources = sources.map(source => {
        if (!source.title) {
          source.title = source.url;
        }
        return source;
      });

      taskStore.updateTask(item.query, { state: "completed", sources: processedSources });
    } catch (error) {
      if (isRateLimitError(error)) {
        rateLimiter.handleRateLimitError(searchModel, error);
        taskStore.updateTask(item.query, {
          state: "unprocessed",
          learning: content || "Rate limit exceeded. Will retry automatically."
        });
      } else {
        handleError(error);
        taskStore.updateTask(item.query, { state: "unprocessed" });
      }
    }

    return content;
  }

  async function reviewSearchResult() {
    const { thinkingModel, language } = useSettingStore.getState();
    const { query, tasks, suggestion } = useTaskStore.getState();
    const modelToUse = getAvailableModel(thinkingModel);

    // Check if model is in cooldown
    if (checkModelCooldown(modelToUse)) {
      return;
    }

    setStatus(t("research.common.research"));
    const learnings = tasks.map((item) => item.learning);
    const provider = createProvider("google");

    try {
      // Track the request
      rateLimiter.trackRequest(modelToUse);

      const querySchema = getSERPQuerySchema();

      // Use streamObject for native structured output (no JSON parsing needed)
      const { partialObjectStream } = streamObject({
        model: provider(modelToUse),
        schema: querySchema,
        system: getSystemPrompt(),
        prompt: [
          reviewSerpQueriesPrompt(query, learnings, suggestion),
          getResponseLanguagePrompt(language),
        ].join("\n\n"),
        onError: (error) => {
          if (isRateLimitError(error)) {
            rateLimiter.handleRateLimitError(modelToUse, error);
          } else {
            handleError(error);
          }
        },
      });

      let queries: SearchTask[] = [];
      for await (const partialObject of partialObjectStream) {
        // partialObject is already validated against the schema
        if (partialObject && Array.isArray(partialObject)) {
          queries = partialObject.map(
            (item: { query?: string; researchGoal?: string }) => ({
              state: "unprocessed" as const,
              learning: "",
              query: item.query || "",
              researchGoal: item.researchGoal,
            })
          );
        }
      }
      if (queries.length > 0) {
        taskStore.update([...tasks, ...queries]);
        await runSearchTask(queries);
      }
    } catch (error) {
      if (isRateLimitError(error)) {
        rateLimiter.handleRateLimitError(modelToUse, error);
      } else {
        handleError(error);
      }
    }
  }

  async function writeFinalReport() {
    const { thinkingModel, language } = useSettingStore.getState();
    const { query, tasks, setId, setTitle, setSources, articleType = "news", finalReport } =
      useTaskStore.getState();
    const { save } = useHistoryStore.getState();

    // Get available model with fallback support
    let modelToUse = getAvailableModel(thinkingModel);

    // Check if model is in cooldown
    if (checkModelCooldown(modelToUse)) {
      return;
    }

    let retryCount = 0;
    const maxRetries = 3;
    let content = "";

    // Validate required data
    if (!query) {
      toast.error("No research query found. Please start with a research topic.");
      return;
    }

    if (!tasks || tasks.length === 0) {
      toast.error("No research tasks found. Please conduct some research first.");
      return;
    }

    if (!thinkingModel) {
      toast.error("No AI model selected. Please check your settings.");
      return;
    }

    logger.info("Starting report generation with tasks:", tasks.length);
    
    while (retryCount < maxRetries) {
      try {
        setStatus(t("research.common.writing"));
        const learnings = tasks.map((item) => item.learning);
        const provider = createProvider("google");
        
        // Check if we have an existing template in the finalReport
        // A template would typically start with # [HEADLINE] or similar placeholder format
        const hasTemplate = finalReport && (
          finalReport.includes("[HEADLINE]") || 
          finalReport.includes("[TITLE]") || 
          finalReport.includes("[LEAD") ||
          finalReport.includes("# ") && finalReport.includes("[]")
        );
        
        logger.info("Report generation parameters:", {
          model: modelToUse,
          articleType,
          tasksCount: tasks.length,
          learningsLength: learnings.join("").length,
          hasTemplate,
          query: query
        });

        // Track the request
        rateLimiter.trackRequest(modelToUse);

        // Create a prompt that incorporates any existing template
        let prompt;
        if (hasTemplate) {
          prompt = [
            `Based on the following topic, research, and template, write a journalistic ${articleType} article:\n<query>${query}</query>`,
            `Here are all the findings from research:\n<learnings>\n${learnings.join("\n\n")}\n</learnings>`,
            `Use the following article template and REPLACE all placeholders with appropriate content:\n<template>\n${finalReport}\n</template>`,
            `Follow AP Style guidelines and journalistic principles. Ensure the article flows naturally.`,
            getResponseLanguagePrompt(language),
          ].join("\n\n");
        } else {
          prompt = [
            writeJournalisticArticlePrompt(query, learnings, articleType),
            getResponseLanguagePrompt(language),
          ].join("\n\n");
        }

        logger.info("Sending report generation prompt to model");
        
        const result = streamText({
          model: provider(modelToUse),
          system: [getSystemPrompt(), getOutputGuidelinesPrompt()].join("\n\n"),
          prompt: prompt,
          experimental_transform: smoothStream(),
          onError: (error) => {
            logger.error("Stream error in report generation:", error);
            if (isRateLimitError(error)) {
              const { retryAfterMs, isQuotaExhausted } = rateLimiter.handleRateLimitError(modelToUse, error);
              if (isQuotaExhausted) {
                // Try switching to a fallback model for next retry
                const fallback = rateLimiter.getFallbackModel(modelToUse);
                if (fallback) {
                  modelToUse = fallback;
                  toast.info(`Switching to ${fallback} for retry...`);
                }
              }
            } else {
              const errorMessage = parseError(error);
              toast.error(`Error generating report: ${errorMessage}`);
            }
          },
        });

        logger.info("Streaming started, awaiting responses...");
        
        // Add a fallback timeout for the generation
        const timeout = setTimeout(() => {
          if (!content) {
            logger.warn("Report generation timed out after 60s with no content");
            // Add minimal report content to avoid complete failure
            const fallbackContent = `# ${query}\n\nUnable to generate a complete report at this time. Please try again later.`;
            content = fallbackContent;
            taskStore.updateFinalReport(fallbackContent);
          }
        }, 60000);
        
        for await (const textPart of result.textStream) {
          content += textPart;
          taskStore.updateFinalReport(content);
          logger.info("Received content chunk, current length:", content.length);
        }
        
        clearTimeout(timeout);
        
        logger.info("Stream completed successfully, final content length:", content.length);

        // If we got here, the stream completed successfully
        break;
      } catch (error) {
        logger.error(`Report generation attempt ${retryCount + 1} failed:`, error);

        if (isRateLimitError(error)) {
          const { retryAfterMs, isQuotaExhausted } = rateLimiter.handleRateLimitError(modelToUse, error);

          // If quota is exhausted, try switching to a fallback model
          if (isQuotaExhausted) {
            const fallback = rateLimiter.getFallbackModel(modelToUse);
            if (fallback) {
              logger.info(`Switching from ${modelToUse} to ${fallback} due to quota exhaustion`);
              modelToUse = fallback;
              toast.info(`Switching to ${fallback} and retrying...`);
            }
          }

          // Wait for the API-specified retry delay
          const waitTimeMs = Math.max(retryAfterMs, 5000); // At least 5 seconds
          toast.warning(`Rate limit hit. Waiting ${Math.ceil(waitTimeMs / 1000)}s before retry...`);
          await sleep(waitTimeMs);
        }

        retryCount++;

        if (retryCount === maxRetries) {
          const errorMessage = parseError(error);
          toast.error(`Failed to generate report after ${maxRetries} attempts: ${errorMessage}`);

          // Add a fallback report to avoid complete failure
          const fallbackContent = `# ${query}\n\nUnable to generate a full report after multiple attempts.\n\nPlease try again later or check your API settings.`;
          content = fallbackContent;
          taskStore.updateFinalReport(fallbackContent);
        } else {
          toast.warning(`Retrying report generation (attempt ${retryCount + 1}/${maxRetries})...`);
        }

        // Only apply exponential backoff for non-rate limit errors
        if (!isRateLimitError(error)) {
          await sleep(Math.pow(2, retryCount) * 1000);
        }
      }
    }

    if (!content) {
      logger.error("No content was generated after all attempts");
      toast.error("No content was generated. Please try again.");
      
      // Set minimal fallback content
      const fallbackContent = `# ${query}\n\nNo content was generated. Please try again.`;
      taskStore.updateFinalReport(fallbackContent);
      return;
    }

    try {
      // Process the final content
      const title = content
        .split("\n\n")[0]
        .replaceAll("#", "")
        .replaceAll("**", "")
        .trim();
      
      logger.info("Setting report title:", title);
      setTitle(title);
      
      const sources = flat(
        tasks.map((item) => (item.sources ? item.sources : []))
      );
      
      logger.info("Setting sources count:", sources.length);
      setSources(sources);
      
      const id = save(taskStore.backup());
      logger.info("Saving report with ID:", id);
      setId(id);
      
      toast.success("Report generated successfully!");
      return content;
    } catch (error) {
      logger.error("Error processing report:", error);
      const errorMessage = parseError(error);
      toast.error(`Error saving report: ${errorMessage}`);
      throw error;
    }
  }

  async function deepResearch() {
    const { thinkingModel, language } = useSettingStore.getState();
    const { query } = useTaskStore.getState();
    const modelToUse = getAvailableModel(thinkingModel);

    // Check if model is in cooldown
    if (checkModelCooldown(modelToUse)) {
      return;
    }

    setStatus(t("research.common.thinking"));
    try {
      const provider = createProvider("google");

      // Extract input type from query
      const inputType = query.includes("Research about: http") ? "url" : "summary";

      // Track the request
      rateLimiter.trackRequest(modelToUse);

      const querySchema = getSERPQuerySchema();

      // Use streamObject for native structured output (no JSON parsing needed)
      const { partialObjectStream } = streamObject({
        model: provider(modelToUse),
        schema: querySchema,
        system: getSystemPrompt(),
        prompt: [
          generateJournalisticQueriesPrompt(query, inputType),
          getResponseLanguagePrompt(language),
        ].join("\n\n"),
        onError: (error) => {
          if (isRateLimitError(error)) {
            rateLimiter.handleRateLimitError(modelToUse, error);
          } else {
            handleError(error);
          }
        },
      });

      let queries: SearchTask[] = [];
      for await (const partialObject of partialObjectStream) {
        // partialObject is already validated against the schema
        if (partialObject && Array.isArray(partialObject)) {
          queries = partialObject.map(
            (item: { query?: string; researchGoal?: string }) => ({
              state: "unprocessed" as const,
              learning: "",
              query: item.query || "",
              researchGoal: item.researchGoal,
            })
          );
          // Update UI with each partial result
          taskStore.update(queries);
        }
      }
      await runSearchTask(queries);
    } catch (error) {
      if (isRateLimitError(error)) {
        rateLimiter.handleRateLimitError(modelToUse, error);
      } else {
        logger.error(error);
      }
    }
  }

  return {
    status,
    deepResearch,
    askQuestions,
    runSearchTask,
    reviewSearchResult,
    writeFinalReport,
  };
}

export default useDeepResearch;
