/**
 * Journalistic Metrics Utility
 * 
 * A utility for evaluating articles against journalistic standards and best practices.
 * Provides metrics for accuracy, fairness, source diversity, completeness, and ethical adherence.
 */

import { SearchTask } from "@/types";
import { assessDomainReputation } from "@/utils/domain-reputation";
import { extractDomainFromUrl } from "@/utils/url-extractor";
import { LOADED_TERMS } from "./bias-detection";

/**
 * Categories of journalistic standards to evaluate
 */
export type MetricCategory = 
  | 'accuracy' 
  | 'fairness' 
  | 'source-diversity' 
  | 'context' 
  | 'transparency'
  | 'clarity'
  | 'public-interest';

/**
 * Severity of any issues found
 */
export type IssueSeverity = 'high' | 'medium' | 'low';

/**
 * A specific issue identified in an article
 */
export interface JournalisticIssue {
  category: MetricCategory;
  description: string;
  severity: IssueSeverity;
  recommendations: string[];
}

/**
 * Result of the metrics evaluation
 */
export interface MetricsResult {
  overallScore: number;            // 0-100 score
  categoryScores: Record<MetricCategory, number>;
  issues: JournalisticIssue[];
  strengths: string[];
  complianceLevel: 'excellent' | 'good' | 'average' | 'needs-improvement' | 'poor';
}

/**
 * Evaluation parameters that can be customized
 */
export interface EvaluationOptions {
  requireMinimumSources?: number;
  requireAttributions?: boolean;
  requireBalancedPerspectives?: boolean;
  strictSourceCredibility?: boolean;
  checkSensitiveContent?: boolean;
}

/**
 * Evaluate article for adherence to journalistic standards
 * @param content The article text content
 * @param sources List of sources used in the article
 * @param options Evaluation customization options
 * @returns Detailed metrics about the article's journalistic quality
 */
export function evaluateJournalisticMetrics(
  content: string,
  sources: SearchTask[],
  options: EvaluationOptions = {}
): MetricsResult {
  const defaultOptions: EvaluationOptions = {
    requireMinimumSources: 3,
    requireAttributions: true,
    requireBalancedPerspectives: true,
    strictSourceCredibility: false,
    checkSensitiveContent: true,
  };

  const opts = { ...defaultOptions, ...options };
  const issues: JournalisticIssue[] = [];
  const strengths: string[] = [];
  
  // Initialize category scores
  const categoryScores: Record<MetricCategory, number> = {
    'accuracy': 0,
    'fairness': 0,
    'source-diversity': 0,
    'context': 0,
    'transparency': 0,
    'clarity': 0,
    'public-interest': 0
  };
  
  // Evaluate accuracy
  evaluateAccuracy(content, sources, opts, issues, strengths, categoryScores);
  
  // Evaluate fairness and balance
  evaluateFairness(content, sources, opts, issues, strengths, categoryScores);
  
  // Evaluate source diversity
  evaluateSourceDiversity(sources, opts, issues, strengths, categoryScores);
  
  // Evaluate context and completeness
  evaluateContext(content, sources, opts, issues, strengths, categoryScores);
  
  // Evaluate transparency
  evaluateTransparency(content, sources, opts, issues, strengths, categoryScores);
  
  // Evaluate clarity
  evaluateClarity(content, opts, issues, strengths, categoryScores);
  
  // Evaluate public interest
  evaluatePublicInterest(content, opts, issues, strengths, categoryScores);
  
  // Calculate overall score (weighted average of category scores)
  const weights: Record<MetricCategory, number> = {
    'accuracy': 0.25,
    'fairness': 0.20,
    'source-diversity': 0.15,
    'context': 0.15,
    'transparency': 0.10,
    'clarity': 0.10,
    'public-interest': 0.05
  };
  
  const overallScore = Object.entries(categoryScores).reduce(
    (score, [category, value]) => score + value * weights[category as MetricCategory],
    0
  );
  
  // Determine compliance level
  const complianceLevel = getComplianceLevel(overallScore);
  
  return {
    overallScore,
    categoryScores,
    issues,
    strengths,
    complianceLevel
  };
}

/**
 * Evaluate article for accuracy
 */
function evaluateAccuracy(
  content: string,
  sources: SearchTask[],
  options: EvaluationOptions,
  issues: JournalisticIssue[],
  strengths: string[],
  categoryScores: Record<MetricCategory, number>
): void {
  // Check for source credibility
  const lowCredibilitySources = sources.filter(source => {
    // Use existing credibility score or calculate it
    const credibilityScore = source.credibilityScore || 
      assessDomainReputation(extractDomainFromUrl(source.url)).score;
    return credibilityScore < 5;
  });
  
  if (lowCredibilitySources.length > 0) {
    issues.push({
      category: 'accuracy',
      description: `Article relies on ${lowCredibilitySources.length} low-credibility source(s)`,
      severity: lowCredibilitySources.length > 2 ? 'high' : 'medium',
      recommendations: [
        'Replace low-credibility sources with more reliable alternatives',
        'Acknowledge limitations of these sources in the article',
        'Provide additional corroboration for claims from these sources'
      ]
    });
  }
  
  // Check for factual claims without attribution
  const quotesCount = (content.match(/[""][^""]+[""]/g) || []).length;
  const citationMarkers = (content.match(/\[\d+\]|\(\d{4}\)|\([A-Za-z]+ \d{4}\)/g) || []).length;
  const attributionPhrases = (content.match(/according to|said|reported|stated|noted|explained|claimed/gi) || []).length;
  
  const hasAdequateAttributions = quotesCount > 0 && 
    (quotesCount <= citationMarkers + attributionPhrases);
  
  if (!hasAdequateAttributions && options.requireAttributions) {
    issues.push({
      category: 'accuracy',
      description: 'Article contains statements that need proper attribution',
      severity: 'high',
      recommendations: [
        'Add attributions for all factual claims and quotes',
        'Use standard citation formats consistently',
        'Clearly distinguish between facts, analysis, and opinion'
      ]
    });
  } else if (quotesCount > 0 && citationMarkers + attributionPhrases >= quotesCount) {
    strengths.push('Article properly attributes claims to sources');
  }
  
  // Calculate the accuracy score based on findings
  let accuracyScore = 100;
  
  // Deduct for low credibility sources
  if (options.strictSourceCredibility) {
    accuracyScore -= lowCredibilitySources.length * 15;
  } else {
    accuracyScore -= lowCredibilitySources.length * 10;
  }
  
  // Deduct for attribution issues
  if (!hasAdequateAttributions && options.requireAttributions) {
    accuracyScore -= 30;
  }
  
  // Ensure score is between 0-100
  categoryScores['accuracy'] = Math.max(0, Math.min(100, accuracyScore));
}

/**
 * Evaluate article for fairness and balance
 */
function evaluateFairness(
  content: string,
  sources: SearchTask[],
  options: EvaluationOptions,
  issues: JournalisticIssue[],
  strengths: string[],
  categoryScores: Record<MetricCategory, number>
): void {
  // Count sources with different political leanings
  const biasCounts = {
    left: 0,
    'center-left': 0,
    center: 0,
    'center-right': 0,
    right: 0,
    unknown: 0
  };
  
  sources.forEach(source => {
    const bias = source.biasAssessment || 
      assessDomainReputation(extractDomainFromUrl(source.url)).bias;
    biasCounts[bias as keyof typeof biasCounts]++;
  });
  
  // Check for balanced perspectives
  const totalSources = sources.length;
  const leftLeaning = biasCounts.left + biasCounts['center-left'];
  const rightLeaning = biasCounts.right + biasCounts['center-right'];
  const centrist = biasCounts.center;
  
  const hasBalancedPerspectives = 
    totalSources > 0 && 
    (centrist >= totalSources * 0.3 ||
     (leftLeaning > 0 && rightLeaning > 0 && 
      Math.abs(leftLeaning - rightLeaning) <= Math.ceil(totalSources * 0.3)));
  
  if (!hasBalancedPerspectives && options.requireBalancedPerspectives && totalSources >= 3) {
    issues.push({
      category: 'fairness',
      description: 'Article may present an imbalanced perspective',
      severity: 'medium',
      recommendations: [
        'Include sources from across the political spectrum',
        'Ensure equal weight is given to different viewpoints',
        'Identify and eliminate language that favors one perspective'
      ]
    });
  } else if (hasBalancedPerspectives && totalSources >= 3) {
    strengths.push('Article presents balanced perspectives from diverse viewpoints');
  }
  
  // Check for loaded language
  const loadedTerms = Object.keys(LOADED_TERMS); // Consolidated from bias-detection.ts
  
  const loadedLanguageMatches = loadedTerms.flatMap(term => {
    const regex = new RegExp(`\\b${term}\\b`, 'gi');
    const matches = content.match(regex) || [];
    return matches.map(match => match.toLowerCase());
  });
  
  if (loadedLanguageMatches.length > 0) {
    issues.push({
      category: 'fairness',
      description: `Article contains loaded language (${loadedLanguageMatches.slice(0, 3).join(', ')}${loadedLanguageMatches.length > 3 ? '...' : ''})`,
      severity: loadedLanguageMatches.length > 5 ? 'high' : 'medium',
      recommendations: [
        'Replace loaded terms with neutral alternatives',
        'Avoid emotionally charged language when reporting facts',
        'Save evaluative language for clearly marked opinion or analysis sections'
      ]
    });
  }
  
  // Calculate fairness score
  let fairnessScore = 100;
  
  // Deduct for imbalanced perspectives
  if (!hasBalancedPerspectives && options.requireBalancedPerspectives && totalSources >= 3) {
    fairnessScore -= 30;
  }
  
  // Deduct for loaded language
  fairnessScore -= Math.min(40, loadedLanguageMatches.length * 5);
  
  // Ensure score is between 0-100
  categoryScores['fairness'] = Math.max(0, Math.min(100, fairnessScore));
}

/**
 * Evaluate article for source diversity
 */
function evaluateSourceDiversity(
  sources: SearchTask[],
  options: EvaluationOptions,
  issues: JournalisticIssue[],
  strengths: string[],
  categoryScores: Record<MetricCategory, number>
): void {
  const totalSources = sources.length;
  
  // Check minimum number of sources
  if (totalSources < (options.requireMinimumSources || 3)) {
    issues.push({
      category: 'source-diversity',
      description: `Article uses only ${totalSources} source(s)`,
      severity: totalSources === 0 ? 'high' : 'medium',
      recommendations: [
        'Add more sources to strengthen reporting',
        'Include sources with firsthand knowledge',
        'Consult relevant expert perspectives'
      ]
    });
  } else if (totalSources >= 5) {
    strengths.push('Article draws from a robust number of sources');
  }
  
  // Check source type diversity
  const sourceTypes = new Set(sources.map(source => source.sourceType || 
    assessDomainReputation(extractDomainFromUrl(source.url)).type));
  
  if (sourceTypes.size < 3 && totalSources >= 3) {
    issues.push({
      category: 'source-diversity',
      description: 'Article lacks diversity in source types',
      severity: 'medium',
      recommendations: [
        'Include a mix of primary and secondary sources',
        'Add official sources for authoritative information',
        'Incorporate expert analysis and commentary where appropriate'
      ]
    });
  } else if (sourceTypes.size >= 3) {
    strengths.push('Article includes diverse source types for comprehensive coverage');
  }
  
  // Calculate source diversity score
  let diversityScore = totalSources >= (options.requireMinimumSources || 3) ? 100 : totalSources * 25;
  
  // Adjust for type diversity
  if (totalSources >= 3) {
    diversityScore = diversityScore * (0.4 + (0.6 * (sourceTypes.size / Math.min(5, totalSources))));
  }
  
  // Ensure score is between 0-100
  categoryScores['source-diversity'] = Math.max(0, Math.min(100, diversityScore));
}

/**
 * Evaluate article for context and completeness
 */
function evaluateContext(
  content: string,
  sources: SearchTask[],
  options: EvaluationOptions,
  issues: JournalisticIssue[],
  strengths: string[],
  categoryScores: Record<MetricCategory, number>
): void {
  // Check article length (rough proxy for completeness)
  const wordCount = content.split(/\s+/).length;
  const isAdequateLength = wordCount >= 400;
  
  if (!isAdequateLength) {
    issues.push({
      category: 'context',
      description: 'Article may lack sufficient detail and context',
      severity: 'medium',
      recommendations: [
        'Expand important sections with more detail',
        'Add historical or background context',
        'Include additional relevant facts'
      ]
    });
  }
  
  // Check for contextual elements like dates, locations, and background
  const hasDateMarkers = /\b(today|yesterday|last week|on (Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)|in (January|February|March|April|May|June|July|August|September|October|November|December)|in \d{4})\b/i.test(content);
  const hasLocationMarkers = /\b(in|at|from|near) [A-Z][a-zA-Z\s,]+\b/.test(content);
  const hasBackgroundSection = /\b(background|context|history|previously|earlier|prior to)\b/i.test(content);
  
  if (!hasDateMarkers || !hasLocationMarkers || !hasBackgroundSection) {
    issues.push({
      category: 'context',
      description: 'Article may be missing important contextual elements',
      severity: 'medium',
      recommendations: [
        hasDateMarkers ? '' : 'Add clear time references and dates',
        hasLocationMarkers ? '' : 'Specify relevant locations',
        hasBackgroundSection ? '' : 'Include a background section for context'
      ].filter(Boolean)
    });
  } else {
    strengths.push('Article provides appropriate context including time, location, and background');
  }
  
  // Calculate context score
  let contextScore = 100;
  
  // Deduct for inadequate length
  if (!isAdequateLength) {
    contextScore -= 30;
  }
  
  // Deduct for missing contextual elements
  if (!hasDateMarkers) contextScore -= 15;
  if (!hasLocationMarkers) contextScore -= 15;
  if (!hasBackgroundSection) contextScore -= 20;
  
  // Ensure score is between 0-100
  categoryScores['context'] = Math.max(0, Math.min(100, contextScore));
}

/**
 * Evaluate article for transparency
 */
function evaluateTransparency(
  content: string,
  sources: SearchTask[],
  options: EvaluationOptions,
  issues: JournalisticIssue[],
  strengths: string[],
  categoryScores: Record<MetricCategory, number>
): void {
  // Check for methodology or limitations disclosure
  const hasMethodologyDisclosure = /\b(methodology|how we reported|information gathering|reporting process)\b/i.test(content);
  const hasLimitationsDisclosure = /\b(limitation|caveat|unable to|could not|did not respond|declined to comment)\b/i.test(content);
  
  if (!hasMethodologyDisclosure && !hasLimitationsDisclosure) {
    issues.push({
      category: 'transparency',
      description: 'Article lacks transparency about reporting process or limitations',
      severity: 'low',
      recommendations: [
        'Add a brief methodology section',
        'Acknowledge information gaps or limitations',
        'Disclose when important sources declined to comment'
      ]
    });
  } else if (hasMethodologyDisclosure && hasLimitationsDisclosure) {
    strengths.push('Article transparently discloses methodology and limitations');
  }
  
  // Check for clear attribution of sources
  const hasNamedSources = /\b(according to|said|told|stated by|reported by) [A-Z][a-zA-Z\s]+\b/.test(content);
  const hasAnonymousSources = /\b(sources|officials|insiders|experts) (said|told|stated|reported|suggested|indicated)\b/i.test(content);
  
  if (hasAnonymousSources && !content.includes('who spoke on condition of anonymity') && !content.includes('who requested anonymity')) {
    issues.push({
      category: 'transparency',
      description: 'Article uses anonymous sources without explaining why',
      severity: 'medium',
      recommendations: [
        'Explain why anonymity was granted',
        'Provide as much identifying information as possible (e.g., role, knowledge basis)',
        'Consider if named sources can provide the same information'
      ]
    });
  } else if (hasNamedSources && !hasAnonymousSources) {
    strengths.push('Article relies on properly attributed, named sources');
  }
  
  // Calculate transparency score
  let transparencyScore = 100;
  
  // Deduct for lack of methodology/limitations
  if (!hasMethodologyDisclosure && !hasLimitationsDisclosure) {
    transparencyScore -= 30;
  } else if (!hasMethodologyDisclosure || !hasLimitationsDisclosure) {
    transparencyScore -= 15;
  }
  
  // Deduct for unexplained anonymous sources
  if (hasAnonymousSources && !content.includes('who spoke on condition of anonymity') && !content.includes('who requested anonymity')) {
    transparencyScore -= 25;
  }
  
  // Ensure score is between 0-100
  categoryScores['transparency'] = Math.max(0, Math.min(100, transparencyScore));
}

/**
 * Evaluate article for clarity
 */
function evaluateClarity(
  content: string,
  options: EvaluationOptions,
  issues: JournalisticIssue[],
  strengths: string[],
  categoryScores: Record<MetricCategory, number>
): void {
  // Check for jargon
  const jargonTerms = [
    'leverage', 'utilize', 'facilitate', 'synergy', 'paradigm',
    'holistic', 'robust', 'streamline', 'incentivize', 'disruption'
  ];
  
  const jargonMatches = jargonTerms.flatMap(term => {
    const regex = new RegExp(`\\b${term}\\b`, 'gi');
    const matches = content.match(regex) || [];
    return matches.map(match => match.toLowerCase());
  });
  
  if (jargonMatches.length > 3) {
    issues.push({
      category: 'clarity',
      description: 'Article contains unnecessarily complex language or jargon',
      severity: 'low',
      recommendations: [
        'Replace jargon with plain language',
        'Define technical terms when they must be used',
        'Simplify complex sentences for better readability'
      ]
    });
  }
  
  // Check sentence length (proxy for readability)
  const sentences = content.split(/[.!?]+/).filter(Boolean);
  const longSentences = sentences.filter(sentence => sentence.split(/\s+/).length > 30);
  const longSentencePercentage = (longSentences.length / sentences.length) * 100;
  
  if (longSentencePercentage > 20 && sentences.length > 10) {
    issues.push({
      category: 'clarity',
      description: 'Article contains too many long, complex sentences',
      severity: 'low',
      recommendations: [
        'Break down long sentences into shorter ones',
        'Vary sentence length for better rhythm',
        'Use active voice for clearer communication'
      ]
    });
  } else if (sentences.length > 10 && longSentencePercentage < 10) {
    strengths.push('Article uses clear, concise language accessible to general readers');
  }
  
  // Check for structure (paragraphs, headings)
  const paragraphs = content.split(/\n\s*\n/).filter(Boolean);
  const hasReasonableParagraphLength = paragraphs.every(p => p.split(/\s+/).length <= 100);
  const hasHeadings = /\n#+\s+.+/.test(content);
  
  if (!hasReasonableParagraphLength || !hasHeadings) {
    issues.push({
      category: 'clarity',
      description: 'Article structure could be improved for readability',
      severity: 'low',
      recommendations: [
        hasReasonableParagraphLength ? '' : 'Break long paragraphs into smaller chunks',
        hasHeadings ? '' : 'Add descriptive headings to organize content',
        'Use bullet points for lists or complex information'
      ].filter(Boolean)
    });
  }
  
  // Calculate clarity score
  let clarityScore = 100;
  
  // Deduct for jargon
  clarityScore -= Math.min(30, jargonMatches.length * 5);
  
  // Deduct for long sentences
  if (sentences.length > 10) {
    clarityScore -= Math.min(30, longSentencePercentage);
  }
  
  // Deduct for structural issues
  if (!hasReasonableParagraphLength) clarityScore -= 15;
  if (!hasHeadings && paragraphs.length > 5) clarityScore -= 15;
  
  // Ensure score is between 0-100
  categoryScores['clarity'] = Math.max(0, Math.min(100, clarityScore));
}

/**
 * Evaluate article for public interest
 */
function evaluatePublicInterest(
  content: string,
  options: EvaluationOptions,
  issues: JournalisticIssue[],
  strengths: string[],
  categoryScores: Record<MetricCategory, number>
): void {
  // Check for sensitive content handling
  const sensitiveTopics = [
    'suicide', 'sexual assault', 'child abuse', 'graphic violence',
    'terrorism', 'massacre', 'racial slur', 'hate crime', 'genocide'
  ];
  
  const sensitiveMatches = sensitiveTopics.flatMap(term => {
    const regex = new RegExp(`\\b${term}\\b`, 'gi');
    const matches = content.match(regex) || [];
    return matches.map(match => match.toLowerCase());
  });
  
  if (sensitiveMatches.length > 0 && options.checkSensitiveContent) {
    const hasContentWarning = /content (notice|warning)|warning:|contains sensitive/i.test(content);
    
    if (!hasContentWarning) {
      issues.push({
        category: 'public-interest',
        description: 'Article contains sensitive content without appropriate warnings',
        severity: 'medium',
        recommendations: [
          'Add a content warning at the beginning of the article',
          'Consider if all sensitive details are necessary for the story',
          'Provide context for why sensitive information is included'
        ]
      });
    } else {
      strengths.push('Article properly warns readers about sensitive content');
    }
  }
  
  // Check if article serves clear public interest
  const publicInterestMarkers = [
    'public interest', 'community concern', 'policy implication',
    'taxpayer', 'public health', 'safety concern', 'government accountability',
    'consumer protection', 'environment', 'education', 'civil rights'
  ];
  
  const publicInterestMatches = publicInterestMarkers.some(marker => 
    content.toLowerCase().includes(marker)
  );
  
  if (!publicInterestMatches) {
    // This is a soft check, so we don't add an issue, but we don't give full points either
    categoryScores['public-interest'] = 70; // Base score when public interest isn't explicit
  } else {
    strengths.push('Article clearly addresses matters of public interest and concern');
    categoryScores['public-interest'] = 100;
  }
  
  // Adjust for sensitive content handling if needed
  if (sensitiveMatches.length > 0 && options.checkSensitiveContent) {
    const hasContentWarning = /content (notice|warning)|warning:|contains sensitive/i.test(content);
    if (!hasContentWarning) {
      categoryScores['public-interest'] -= 30;
    }
  }
  
  // Ensure score is between 0-100
  categoryScores['public-interest'] = Math.max(0, Math.min(100, categoryScores['public-interest']));
}

/**
 * Determine compliance level based on overall score
 */
function getComplianceLevel(
  score: number
): 'excellent' | 'good' | 'average' | 'needs-improvement' | 'poor' {
  if (score >= 90) return 'excellent';
  if (score >= 80) return 'good';
  if (score >= 70) return 'average';
  if (score >= 50) return 'needs-improvement';
  return 'poor';
}

export default {
  evaluateJournalisticMetrics
}; 