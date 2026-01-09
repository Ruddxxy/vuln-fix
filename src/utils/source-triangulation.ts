import { generateObject } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { z } from "zod";
import logger from "@/utils/logger";
import type { Source } from "@/types";

/**
 * Source Triangulation Utility
 *
 * Cross-references claims across multiple sources to verify accuracy
 * and identify agreement/conflict between different information sources.
 */

// Schema for triangulated claims
const TriangulatedClaimSchema = z.object({
  claim: z.string().describe("The factual claim being evaluated"),
  supportingSources: z
    .array(z.string())
    .describe("IDs of sources that support this claim"),
  conflictingSources: z
    .array(z.string())
    .describe("IDs of sources that contradict this claim"),
  confidenceScore: z
    .number()
    .min(0)
    .max(100)
    .describe("Confidence score 0-100"),
  status: z.enum(["confirmed", "disputed", "single-source", "unverified"]),
});

export type TriangulatedClaim = z.infer<typeof TriangulatedClaimSchema>;

// Schema for the AI response containing multiple claims
const TriangulationResponseSchema = z.object({
  claims: z
    .array(TriangulatedClaimSchema)
    .describe("List of triangulated claims extracted from learnings"),
});

type TriangulationResponse = z.infer<typeof TriangulationResponseSchema>;

interface TriangulateOptions {
  apiKey: string;
  baseURL?: string;
}

/**
 * Triangulate claims across multiple sources
 *
 * Uses Gemini to extract distinct factual claims from learnings,
 * match them to sources, identify agreement/conflict, and calculate
 * confidence scores based on source credibility and agreement.
 *
 * @param learnings Array of learning strings from research
 * @param sources Array of Source objects used in research
 * @param options API configuration options
 * @returns Array of triangulated claims with verification status
 */
export async function triangulateClaims(
  learnings: string[],
  sources: Source[],
  options: TriangulateOptions
): Promise<TriangulatedClaim[]> {
  const { apiKey, baseURL = "/api/ai/google/v1beta" } = options;

  if (!learnings.length || !sources.length) {
    logger.warn("Triangulation skipped: insufficient learnings or sources");
    return [];
  }

  try {
    const provider = createGoogleGenerativeAI({
      baseURL,
      apiKey,
      headers: {
        "x-api-key": apiKey,
      },
    });

    // Prepare source information for the prompt
    const sourceInfo = sources
      .map((s) => {
        const credibility = s.credibilityScore
          ? `(credibility: ${s.credibilityScore}/10)`
          : "";
        const type = s.sourceType ? `[${s.sourceType}]` : "";
        return `- ID: ${s.id}, URL: ${s.url}, Title: ${s.title || "Unknown"} ${type} ${credibility}`;
      })
      .join("\n");

    // Prepare learnings for the prompt
    const learningsText = learnings
      .map((l, i) => `Learning ${i + 1}:\n${l}`)
      .join("\n\n");

    const systemPrompt = `You are an expert fact-checker and journalist specializing in source verification and claim triangulation.
Your task is to analyze research learnings and cross-reference claims across multiple sources.

You must:
1. Extract 5-10 key FACTUAL claims from the learnings (not opinions or analysis)
2. For each claim, identify which sources support or contradict it using source IDs
3. Assign a status based on source agreement:
   - "confirmed": 2 or more independent sources agree on the claim
   - "disputed": sources actively contradict each other on this claim
   - "single-source": only one source makes this claim
   - "unverified": claim cannot be clearly attributed to any source
4. Calculate a confidence score (0-100) based on:
   - Number of supporting sources (more = higher)
   - Credibility of supporting sources (higher credibility = higher confidence)
   - Presence of conflicting sources (reduces confidence)
   - Source type diversity (primary + official sources = higher confidence)

Focus on extracting concrete, verifiable facts rather than interpretations or opinions.`;

    const userPrompt = `Analyze these research learnings and cross-reference claims across the available sources:

SOURCES:
${sourceInfo}

LEARNINGS:
${learningsText}

Extract 5-10 key factual claims and triangulate them across the sources. For each claim, identify supporting and conflicting source IDs, assign a status, and calculate a confidence score.`;

    const { object } = await generateObject({
      model: provider("gemini-2.0-flash"),
      schema: TriangulationResponseSchema,
      system: systemPrompt,
      prompt: userPrompt,
    });

    const response = object as TriangulationResponse;

    logger.info(
      `Triangulation complete: ${response.claims.length} claims analyzed`
    );

    return response.claims;
  } catch (error) {
    logger.error("Source triangulation failed:", error);

    // Return empty array on failure rather than throwing
    // This allows the research to continue even if triangulation fails
    return [];
  }
}

/**
 * Get a summary of claim statuses
 *
 * @param claims Array of triangulated claims
 * @returns Object with counts of claims by status
 */
export function getClaimSummary(claims: TriangulatedClaim[]): {
  confirmed: number;
  disputed: number;
  singleSource: number;
  unverified: number;
} {
  const summary = {
    confirmed: 0,
    disputed: 0,
    singleSource: 0,
    unverified: 0,
  };

  for (const claim of claims) {
    switch (claim.status) {
      case "confirmed":
        summary.confirmed++;
        break;
      case "disputed":
        summary.disputed++;
        break;
      case "single-source":
        summary.singleSource++;
        break;
      case "unverified":
        summary.unverified++;
        break;
    }
  }

  return summary;
}

/**
 * Calculate the overall verification score for a set of claims
 *
 * @param claims Array of triangulated claims
 * @returns Overall verification score 0-100
 */
export function calculateVerificationScore(
  claims: TriangulatedClaim[]
): number {
  if (claims.length === 0) return 0;

  // Weight claims by their status
  const weights = {
    confirmed: 1.0,
    disputed: 0.3,
    "single-source": 0.5,
    unverified: 0.2,
  };

  let weightedSum = 0;
  let totalWeight = 0;

  for (const claim of claims) {
    const weight = weights[claim.status];
    weightedSum += claim.confidenceScore * weight;
    totalWeight += weight;
  }

  return totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;
}

/**
 * Filter claims by status
 *
 * @param claims Array of triangulated claims
 * @param statuses Array of statuses to filter by
 * @returns Filtered array of claims
 */
export function filterClaimsByStatus(
  claims: TriangulatedClaim[],
  statuses: TriangulatedClaim["status"][]
): TriangulatedClaim[] {
  return claims.filter((claim) => statuses.includes(claim.status));
}

/**
 * Get claims that need additional verification
 *
 * Returns claims that are disputed, single-source, or have low confidence
 *
 * @param claims Array of triangulated claims
 * @param confidenceThreshold Minimum confidence score (default: 60)
 * @returns Array of claims needing verification
 */
export function getClaimsNeedingVerification(
  claims: TriangulatedClaim[],
  confidenceThreshold: number = 60
): TriangulatedClaim[] {
  return claims.filter(
    (claim) =>
      claim.status === "disputed" ||
      claim.status === "single-source" ||
      claim.status === "unverified" ||
      claim.confidenceScore < confidenceThreshold
  );
}

export default {
  triangulateClaims,
  getClaimSummary,
  calculateVerificationScore,
  filterClaimsByStatus,
  getClaimsNeedingVerification,
};
