import { generateText } from "ai";
import { createGoogleGenerativeAI, google } from "@ai-sdk/google";
import { z } from "zod";
import logger from "@/utils/logger";
import type { Source } from "@/types";

/**
 * Source Verification Utility
 *
 * Uses Gemini's URL Context tool to fetch and analyze source URLs
 * for credibility assessment and metadata extraction.
 */

// Schema for verified source metadata
export const VerifiedSourceSchema = z.object({
  url: z.string(),
  title: z.string().optional(),
  authorName: z.string().optional(),
  publisherName: z.string().optional(),
  publicationDate: z.string().optional(),
  sourceType: z.enum(["primary", "secondary", "official", "analysis", "commentary"]),
  credibilityScore: z.number().min(1).max(10),
  biasAssessment: z.string().optional(),
  keyFacts: z.array(z.string()).optional(),
  retrievalStatus: z.enum(["success", "failed", "blocked"]),
});

export type VerifiedSource = z.infer<typeof VerifiedSourceSchema>;

interface VerifySourceOptions {
  apiKey: string;
  baseURL?: string;
}

/**
 * Verify a single source URL using Gemini's URL Context tool
 */
export async function verifySourceUrl(
  url: string,
  options: VerifySourceOptions
): Promise<VerifiedSource> {
  const { apiKey, baseURL = "/api/ai/google/v1beta" } = options;

  try {
    const provider = createGoogleGenerativeAI({
      baseURL,
      apiKey,
      headers: {
        "x-api-key": apiKey,
      },
    });

    const { text, providerMetadata } = await generateText({
      model: provider("gemini-2.5-flash"),
      prompt: `Analyze this source URL and provide a journalistic assessment:
URL: ${url}

Please evaluate and extract:
1. The title of the article/page
2. Author name (if available)
3. Publisher/organization name
4. Publication date (if available, in YYYY-MM-DD format)
5. Source type: Is this a primary source (direct account/data), secondary (reports on other sources), official (government/institutional), analysis (expert interpretation), or commentary (opinion)?
6. Credibility score (1-10, where 10 is most credible) based on:
   - Publisher reputation
   - Author credentials
   - Evidence of fact-checking
   - Citation of sources
   - Presence of corrections/updates
7. Bias assessment: Note any apparent political, commercial, or ideological bias
8. Key facts: List 3-5 main factual claims from the content

Respond in this JSON format:
{
  "title": "...",
  "authorName": "...",
  "publisherName": "...",
  "publicationDate": "YYYY-MM-DD",
  "sourceType": "primary|secondary|official|analysis|commentary",
  "credibilityScore": 1-10,
  "biasAssessment": "...",
  "keyFacts": ["fact1", "fact2", "fact3"]
}`,
      tools: {
        url_context: google.tools.urlContext({}),
      },
    });

    // Extract URL context metadata
    const metadata = providerMetadata?.google as {
      urlContextMetadata?: {
        urlMetadata?: Array<{
          retrievedUrl: string;
          urlRetrievalStatus: string;
        }>;
      };
    } | undefined;

    const urlMetadata = metadata?.urlContextMetadata?.urlMetadata?.[0];
    const retrievalStatus = urlMetadata?.urlRetrievalStatus === "URL_RETRIEVAL_STATUS_SUCCESS"
      ? "success"
      : urlMetadata?.urlRetrievalStatus === "URL_RETRIEVAL_STATUS_UNSAFE"
        ? "blocked"
        : "failed";

    // Parse the response
    try {
      // Extract JSON from the response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          url,
          title: parsed.title,
          authorName: parsed.authorName,
          publisherName: parsed.publisherName,
          publicationDate: parsed.publicationDate,
          sourceType: parsed.sourceType || "secondary",
          credibilityScore: parsed.credibilityScore || 5,
          biasAssessment: parsed.biasAssessment,
          keyFacts: parsed.keyFacts,
          retrievalStatus,
        };
      }
    } catch (parseError) {
      logger.warn("Failed to parse source verification response:", parseError);
    }

    // Return basic info if parsing fails
    return {
      url,
      sourceType: "secondary",
      credibilityScore: 5,
      retrievalStatus,
    };

  } catch (error) {
    logger.error("Source verification failed:", error);
    return {
      url,
      sourceType: "secondary",
      credibilityScore: 5,
      retrievalStatus: "failed",
    };
  }
}

/**
 * Verify multiple sources in parallel with rate limiting
 */
export async function verifyMultipleSources(
  sources: Source[],
  options: VerifySourceOptions,
  concurrency: number = 3
): Promise<VerifiedSource[]> {
  const results: VerifiedSource[] = [];

  // Process in batches to respect rate limits
  for (let i = 0; i < sources.length; i += concurrency) {
    const batch = sources.slice(i, i + concurrency);
    const batchPromises = batch.map((source) =>
      verifySourceUrl(source.url, options)
    );

    const batchResults = await Promise.allSettled(batchPromises);

    for (const result of batchResults) {
      if (result.status === "fulfilled") {
        results.push(result.value);
      } else {
        logger.warn("Source verification failed for batch item:", result.reason);
      }
    }

    // Add delay between batches to avoid rate limiting
    if (i + concurrency < sources.length) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  return results;
}

/**
 * Enhance existing sources with verification data
 */
export function enhanceSourcesWithVerification(
  sources: Source[],
  verifiedSources: VerifiedSource[]
): Source[] {
  const verifiedMap = new Map(verifiedSources.map((vs) => [vs.url, vs]));

  return sources.map((source) => {
    const verified = verifiedMap.get(source.url);
    if (verified) {
      return {
        ...source,
        title: verified.title || source.title,
        authorName: verified.authorName || source.authorName,
        publisherName: verified.publisherName || source.publisherName,
        publicationDate: verified.publicationDate || source.publicationDate,
        sourceType: verified.sourceType,
        credibilityScore: verified.credibilityScore,
        biasAssessment: verified.biasAssessment || source.biasAssessment,
      };
    }
    return source;
  });
}
