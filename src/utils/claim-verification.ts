import { generateObject } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { z } from "zod";
import logger from "@/utils/logger";
import type { Source } from "@/types";

/**
 * Claim Verification Utility
 *
 * Uses Gemini to extract factual claims from articles and verify them
 * against available sources and research learnings.
 */

// Verification status types
export type VerificationStatus = "verified" | "disputed" | "unverified" | "false";

// Evidence for a claim verification
export interface ClaimEvidence {
  sourceId: string;
  excerpt: string;
  supports: boolean;
}

// Main claim verification interface
export interface ClaimVerification {
  claim: string;
  status: VerificationStatus;
  evidence: ClaimEvidence[];
  confidence: number;
}

// Zod schema for evidence
const ClaimEvidenceSchema = z.object({
  sourceId: z.string().describe("ID of the source providing evidence"),
  excerpt: z
    .string()
    .describe("Relevant excerpt or summary from the source"),
  supports: z
    .boolean()
    .describe("Whether the source supports (true) or contradicts (false) the claim"),
});

// Zod schema for individual claim verification
const ClaimVerificationSchema = z.object({
  claim: z.string().describe("The factual claim being verified"),
  status: z
    .enum(["verified", "disputed", "unverified", "false"])
    .describe(
      "Verification status: verified (confirmed by multiple sources), disputed (sources disagree), unverified (insufficient evidence), false (contradicted by credible sources)"
    ),
  evidence: z
    .array(ClaimEvidenceSchema)
    .describe("Array of evidence items supporting or contradicting the claim"),
  confidence: z
    .number()
    .min(0)
    .max(100)
    .describe("Confidence level in the verification (0-100)"),
});

// Zod schema for the AI response
const VerificationResponseSchema = z.object({
  claims: z
    .array(ClaimVerificationSchema)
    .describe("List of verified claims extracted from the article"),
});

type VerificationResponse = z.infer<typeof VerificationResponseSchema>;

interface VerifyClaimsOptions {
  apiKey: string;
  baseURL?: string;
}

/**
 * Verify claims in an article using Gemini
 *
 * Extracts factual claims from the article, cross-references them against
 * the provided sources and learnings, and returns structured verification results.
 *
 * @param article The article text to extract and verify claims from
 * @param sources Array of Source objects used in research
 * @param learnings Array of learning strings from research
 * @param options API configuration options
 * @returns Array of claim verifications with evidence
 */
export async function verifyClaimsWithGemini(
  article: string,
  sources: Source[],
  learnings: string[],
  options: VerifyClaimsOptions
): Promise<ClaimVerification[]> {
  const { apiKey, baseURL = "/api/ai/google/v1beta" } = options;

  if (!article || article.trim().length === 0) {
    logger.warn("Claim verification skipped: no article provided");
    return [];
  }

  if (!sources.length && !learnings.length) {
    logger.warn("Claim verification skipped: no sources or learnings to verify against");
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
        const author = s.authorName ? `by ${s.authorName}` : "";
        const publisher = s.publisherName ? `from ${s.publisherName}` : "";
        return `- ID: ${s.id}, URL: ${s.url}, Title: ${s.title || "Unknown"} ${type} ${credibility} ${author} ${publisher}`.trim();
      })
      .join("\n");

    // Prepare learnings for the prompt
    const learningsText = learnings.length
      ? learnings.map((l, i) => `Learning ${i + 1}:\n${l}`).join("\n\n")
      : "No learnings available.";

    const systemPrompt = `You are an expert fact-checker and verification specialist with extensive experience in journalistic verification.
Your task is to extract factual claims from an article and verify each one against the available sources and research learnings.

Verification Guidelines:
1. Extract 5-15 distinct FACTUAL claims from the article (not opinions, predictions, or subjective statements)
2. For each claim, search through the sources and learnings for supporting or contradicting evidence
3. Assign a verification status based on the evidence:
   - "verified": Multiple credible sources confirm the claim with consistent evidence
   - "disputed": Sources provide conflicting information about the claim
   - "unverified": Insufficient evidence in the sources to confirm or deny
   - "false": Credible sources explicitly contradict the claim
4. Provide evidence for each claim:
   - Include the source ID (must match an ID from the sources list)
   - Quote or summarize the relevant excerpt
   - Indicate whether it supports or contradicts the claim
5. Calculate confidence (0-100) based on:
   - Number and credibility of sources
   - Consistency of evidence
   - Source type (primary/official sources = higher confidence)
   - Recency of information

Focus on concrete, verifiable facts: statistics, dates, events, attributions, and specific claims.
Be rigorous - only mark as "verified" when there is clear, consistent evidence.`;

    const userPrompt = `Analyze this article and verify its factual claims against the available sources and learnings:

ARTICLE TO VERIFY:
${article}

AVAILABLE SOURCES:
${sourceInfo || "No sources available."}

RESEARCH LEARNINGS:
${learningsText}

Extract factual claims from the article and verify each one. For each claim, provide:
1. The exact claim from the article
2. Verification status (verified/disputed/unverified/false)
3. Evidence from sources (with source IDs, excerpts, and whether they support or contradict)
4. Confidence score (0-100)`;

    const { object } = await generateObject({
      model: provider("gemini-2.0-flash"),
      schema: VerificationResponseSchema,
      system: systemPrompt,
      prompt: userPrompt,
    });

    const response = object as VerificationResponse;

    logger.info(
      `Claim verification complete: ${response.claims.length} claims verified`
    );

    // Map to ensure proper typing
    return response.claims.map((claim) => ({
      claim: claim.claim,
      status: claim.status,
      evidence: claim.evidence.map((e) => ({
        sourceId: e.sourceId,
        excerpt: e.excerpt,
        supports: e.supports,
      })),
      confidence: claim.confidence,
    }));
  } catch (error) {
    logger.error("Claim verification failed:", error);

    // Return empty array on failure rather than throwing
    // This allows the research to continue even if verification fails
    return [];
  }
}

/**
 * Get a summary of verification statuses
 *
 * @param claims Array of claim verifications
 * @returns Object with counts of claims by status
 */
export function getVerificationSummary(claims: ClaimVerification[]): {
  verified: number;
  disputed: number;
  unverified: number;
  false: number;
  total: number;
  verificationRate: number;
} {
  const summary = {
    verified: 0,
    disputed: 0,
    unverified: 0,
    false: 0,
    total: claims.length,
    verificationRate: 0,
  };

  for (const claim of claims) {
    switch (claim.status) {
      case "verified":
        summary.verified++;
        break;
      case "disputed":
        summary.disputed++;
        break;
      case "unverified":
        summary.unverified++;
        break;
      case "false":
        summary.false++;
        break;
    }
  }

  // Calculate verification rate (percentage of claims that are verified)
  summary.verificationRate =
    claims.length > 0
      ? Math.round((summary.verified / claims.length) * 100)
      : 0;

  return summary;
}

/**
 * Filter claims that need attention (unverified, disputed, or false)
 *
 * @param claims Array of claim verifications
 * @returns Claims that are not verified and may need additional research
 */
export function filterUnverifiedClaims(
  claims: ClaimVerification[]
): ClaimVerification[] {
  return claims.filter(
    (claim) =>
      claim.status === "unverified" ||
      claim.status === "disputed" ||
      claim.status === "false"
  );
}

/**
 * Get claims with low confidence that may need additional verification
 *
 * @param claims Array of claim verifications
 * @param confidenceThreshold Minimum confidence score (default: 60)
 * @returns Claims with confidence below the threshold
 */
export function filterLowConfidenceClaims(
  claims: ClaimVerification[],
  confidenceThreshold: number = 60
): ClaimVerification[] {
  return claims.filter((claim) => claim.confidence < confidenceThreshold);
}

/**
 * Calculate an overall credibility score for the article based on claim verification
 *
 * @param claims Array of claim verifications
 * @returns Overall credibility score 0-100
 */
export function calculateArticleCredibility(claims: ClaimVerification[]): number {
  if (claims.length === 0) return 0;

  // Weight claims by their status
  const statusWeights: Record<VerificationStatus, number> = {
    verified: 1.0,
    disputed: 0.4,
    unverified: 0.5,
    false: 0.0,
  };

  let weightedSum = 0;
  let totalWeight = 0;

  for (const claim of claims) {
    const weight = statusWeights[claim.status];
    weightedSum += claim.confidence * weight;
    totalWeight += 100; // Max possible score per claim
  }

  return totalWeight > 0 ? Math.round((weightedSum / totalWeight) * 100) : 0;
}

export default {
  verifyClaimsWithGemini,
  getVerificationSummary,
  filterUnverifiedClaims,
  filterLowConfidenceClaims,
  calculateArticleCredibility,
};
