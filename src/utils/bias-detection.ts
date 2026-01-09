/**
 * Bias Detection and Neutralization Utility
 * 
 * Tools to analyze text for potential bias and offer suggestions for more neutral wording.
 * This helps journalists maintain objectivity and balance in their reporting.
 */

/**
 * Type of detected bias
 */
export type BiasType = 
  | 'political' 
  | 'loaded-language' 
  | 'labeling' 
  | 'false-equivalence' 
  | 'passive-construction' 
  | 'framing' 
  | 'subjective-qualifier' 
  | 'generalization';

/**
 * Categories of political leaning to help identify skewed language
 */
export type PoliticalLeaning = 'left' | 'right' | 'center' | 'unknown';

/**
 * Result of a bias detection scan
 */
export interface BiasDetectionResult {
  severity: 'high' | 'medium' | 'low' | 'none';
  biasScore: number; // 0-100 scale, higher means more biased
  biasedPhrases: BiasedPhrase[];
  politicalLeaning: PoliticalLeaning;
  balanceScore: number; // 0-100 scale, higher means more balanced
  suggestions: string[];
}

/**
 * Information about a potentially biased phrase
 */
export interface BiasedPhrase {
  text: string;
  startIndex: number;
  endIndex: number;
  type: BiasType;
  explanation: string;
  suggestions: string[];
  severity: 'high' | 'medium' | 'low';
}

/**
 * Database of potentially loaded terms with neutral alternatives
 */
export const LOADED_TERMS: Record<string, {
  alternatives: string[];
  type: BiasType;
  explanation: string;
  severity: 'high' | 'medium' | 'low';
  politicalLeaning?: PoliticalLeaning;
}> = {
  // Political bias - left-leaning
  'undocumented immigrant': {
    alternatives: ['immigrant without legal status', 'unauthorized immigrant', 'immigrant without documentation'],
    type: 'political',
    explanation: 'Downplays legal implications; use more neutral, accurate terms',
    severity: 'medium',
    politicalLeaning: 'left'
  },
  'pro-choice': {
    alternatives: ['abortion rights supporter', 'supports legal abortion', 'supports abortion access'],
    type: 'political',
    explanation: 'Framing term; consider more direct language about position',
    severity: 'medium',
    politicalLeaning: 'left'
  },
  'climate denier': {
    alternatives: ['climate science skeptic', 'person who questions climate consensus', 'climate policy opponent'],
    type: 'labeling',
    explanation: 'Pejorative label; describe specific position instead',
    severity: 'medium',
    politicalLeaning: 'left'
  },
  
  // Political bias - right-leaning
  'illegal alien': {
    alternatives: ['immigrant without legal status', 'unauthorized immigrant', 'person without documentation'],
    type: 'political',
    explanation: 'Dehumanizing; use more precise terms about legal status',
    severity: 'high',
    politicalLeaning: 'right'
  },
  'pro-life': {
    alternatives: ['abortion opponent', 'supports abortion restrictions', 'opposes abortion access'],
    type: 'political',
    explanation: 'Framing term; consider more direct language about position',
    severity: 'medium',
    politicalLeaning: 'right'
  },
  'government handout': {
    alternatives: ['government assistance', 'public benefit', 'government program', 'social service'],
    type: 'loaded-language',
    explanation: 'Implies negative judgment; use neutral descriptive term',
    severity: 'medium',
    politicalLeaning: 'right'
  },
  
  // Loaded language (political-neutral but still biased)
  'claimed': {
    alternatives: ['said', 'stated', 'reported', 'announced'],
    type: 'loaded-language',
    explanation: 'Suggests skepticism; use neutral attribution verbs unless factual basis for doubt',
    severity: 'low'
  },
  'admitted': {
    alternatives: ['said', 'acknowledged', 'stated', 'confirmed'],
    type: 'loaded-language',
    explanation: 'Implies guilt or wrongdoing; use neutral verbs for attribution',
    severity: 'medium'
  },
  'refused to': {
    alternatives: ['declined to', 'did not', 'chose not to'],
    type: 'loaded-language',
    explanation: 'Implies unreasonable rejection; use more neutral phrasing',
    severity: 'low'
  },
  'slammed': {
    alternatives: ['criticized', 'disagreed with', 'objected to', 'opposed'],
    type: 'loaded-language',
    explanation: 'Sensationalist language; use precise descriptions of criticism',
    severity: 'medium'
  },
  
  // Subjective qualifiers
  'clearly': {
    alternatives: ['[remove]', 'evidence suggests', 'according to [source]'],
    type: 'subjective-qualifier',
    explanation: 'Presents subjective assessment as objective fact; provide evidence instead',
    severity: 'low'
  },
  'obviously': {
    alternatives: ['[remove]', 'evidence suggests', 'according to [source]'],
    type: 'subjective-qualifier',
    explanation: 'Presents subjective assessment as objective fact; provide evidence instead',
    severity: 'low'
  },
  'everybody knows': {
    alternatives: ['it is widely reported that', 'according to [specific sources]', 'many experts believe'],
    type: 'generalization',
    explanation: 'Unsupported generalization; specify sources and scope',
    severity: 'high'
  },
  
  // Labeling
  'radical': {
    alternatives: ['describe specific positions instead', 'who supports [specific position]'],
    type: 'labeling',
    explanation: 'Subjective judgment label; describe specific positions or actions',
    severity: 'high'
  },
  'extremist': {
    alternatives: ['describe specific positions instead', 'who advocates [specific position]'],
    type: 'labeling',
    explanation: 'Subjective judgment label; describe specific positions or actions',
    severity: 'high'
  },
  
  // Framing
  'regime': {
    alternatives: ['government', 'administration', 'leadership'],
    type: 'framing',
    explanation: 'Often used pejoratively; use neutral terms for governments unless describing authoritarian systems',
    severity: 'medium'
  },
  'historic': {
    alternatives: ['significant', 'describe specific impact instead'],
    type: 'framing',
    explanation: 'Elevates importance subjectively; describe specific significance',
    severity: 'low'
  },
  'unprecedented': {
    alternatives: ['rare', 'unusual', 'describe how it differs from precedents'],
    type: 'framing',
    explanation: 'Often exaggerated; be specific about how something differs from precedents',
    severity: 'low'
  }
};

/**
 * Phrases that suggest passive construction to avoid responsibility
 */
const PASSIVE_CONSTRUCTIONS = [
  'mistakes were made',
  'shots were fired',
  'civilians were killed',
  'was arrested',
  'was injured',
  'was damaged'
];

/**
 * Analyze text for potential bias
 * @param text The article text to analyze
 * @returns Detailed bias detection results
 */
export function detectBias(text: string): BiasDetectionResult {
  const biasedPhrases: BiasedPhrase[] = [];
  const politicalLeanings: PoliticalLeaning[] = [];
  
  // Check for loaded terms
  Object.entries(LOADED_TERMS).forEach(([term, metadata]) => {
    // Look for the term using word boundaries to avoid partial matches
    const regex = new RegExp(`\\b${term}\\b`, 'gi');
    let match;
    
    while ((match = regex.exec(text)) !== null) {
      biasedPhrases.push({
        text: match[0],
        startIndex: match.index,
        endIndex: match.index + match[0].length,
        type: metadata.type,
        explanation: metadata.explanation,
        suggestions: metadata.alternatives,
        severity: metadata.severity
      });
      
      if (metadata.politicalLeaning) {
        politicalLeanings.push(metadata.politicalLeaning);
      }
    }
  });
  
  // Check for passive constructions that might conceal responsibility
  PASSIVE_CONSTRUCTIONS.forEach(phrase => {
    const regex = new RegExp(phrase, 'gi');
    let match;
    
    while ((match = regex.exec(text)) !== null) {
      biasedPhrases.push({
        text: match[0],
        startIndex: match.index,
        endIndex: match.index + match[0].length,
        type: 'passive-construction',
        explanation: 'Passive voice can obscure responsibility; consider active construction',
        suggestions: ['Use active voice to clarify who did what: "[Actor] did [action]"'],
        severity: 'medium'
      });
    }
  });
  
  // Calculate bias score based on quantity and severity of biased phrases
  const biasScore = calculateBiasScore(biasedPhrases, text.length);
  
  // Determine political leaning if any
  const politicalLeaning = determinePoliticalLeaning(politicalLeanings);
  
  // Calculate balance score
  const balanceScore = calculateBalanceScore(politicalLeanings);
  
  // Generate overall suggestions
  const suggestions = generateOverallSuggestions(biasedPhrases, politicalLeaning, balanceScore);
  
  // Determine overall severity
  const severity = determineSeverity(biasScore);
  
  return {
    severity,
    biasScore,
    biasedPhrases,
    politicalLeaning,
    balanceScore,
    suggestions
  };
}

/**
 * Calculate a numerical bias score based on detected biased phrases
 */
function calculateBiasScore(biasedPhrases: BiasedPhrase[], textLength: number): number {
  if (biasedPhrases.length === 0) return 0;
  
  // Calculate raw score based on severity
  const severityWeights = {
    high: 10,
    medium: 5,
    low: 2
  };
  
  const rawScore = biasedPhrases.reduce((score, phrase) => {
    return score + severityWeights[phrase.severity];
  }, 0);
  
  // Normalize to account for text length (per 1000 characters)
  const normalizedScore = (rawScore / (textLength / 1000)) * 5;
  
  // Clamp to 0-100 range
  return Math.min(Math.max(normalizedScore, 0), 100);
}

/**
 * Determine the political leaning based on detected phrases
 */
function determinePoliticalLeaning(leanings: PoliticalLeaning[]): PoliticalLeaning {
  if (leanings.length === 0) return 'unknown';
  
  const counts = leanings.reduce((acc, leaning) => {
    acc[leaning] = (acc[leaning] || 0) + 1;
    return acc;
  }, {} as Record<PoliticalLeaning, number>);
  
  // If there's a clear dominant leaning
  const totalBiased = (counts.left || 0) + (counts.right || 0);
  if (totalBiased === 0) return 'center';
  
  const leftPercentage = ((counts.left || 0) / totalBiased) * 100;
  
  if (leftPercentage > 70) return 'left';
  if (leftPercentage < 30) return 'right';
  return 'center';
}

/**
 * Calculate a balance score indicating how politically balanced the content is
 */
function calculateBalanceScore(leanings: PoliticalLeaning[]): number {
  if (leanings.length === 0) return 100; // No detected bias is perfectly balanced
  
  const leftCount = leanings.filter(l => l === 'left').length;
  const rightCount = leanings.filter(l => l === 'right').length;
  const totalPolitical = leftCount + rightCount;
  
  if (totalPolitical === 0) return 100;
  
  // Perfect balance would be 50% left, 50% right
  const leftPercentage = (leftCount / totalPolitical) * 100;
  
  // Calculate how far from perfect balance (50%) we are
  const distanceFromBalance = Math.abs(leftPercentage - 50);
  
  // Convert to a 0-100 score where 100 is perfect balance
  return Math.max(0, 100 - (distanceFromBalance * 2));
}

/**
 * Generate overall suggestions for improving the content
 */
function generateOverallSuggestions(
  biasedPhrases: BiasedPhrase[], 
  politicalLeaning: PoliticalLeaning,
  balanceScore: number
): string[] {
  const suggestions: string[] = [];
  
  // Group phrases by type - initialize with all BiasType keys as empty arrays
  const phrasesByType: Record<BiasType, BiasedPhrase[]> = {
    'political': [],
    'loaded-language': [],
    'labeling': [],
    'false-equivalence': [],
    'passive-construction': [],
    'framing': [],
    'subjective-qualifier': [],
    'generalization': []
  };

  biasedPhrases.forEach(phrase => {
    phrasesByType[phrase.type].push(phrase);
  });
  
  // Generate type-specific suggestions
  Object.entries(phrasesByType).forEach(([type, phrases]) => {
    if (phrases.length > 2) {
      switch (type) {
        case 'loaded-language':
          suggestions.push('Use neutral language for attribution and description. Avoid loaded terms like: ' + 
            phrases.slice(0, 3).map(p => `"${p.text}"`).join(', ') + 
            (phrases.length > 3 ? ' and others' : ''));
          break;
        case 'labeling':
          suggestions.push('Describe specific positions or actions rather than using labels like: ' + 
            phrases.slice(0, 3).map(p => `"${p.text}"`).join(', ') + 
            (phrases.length > 3 ? ' and others' : ''));
          break;
        case 'subjective-qualifier':
          suggestions.push('Avoid subjective qualifiers that present opinions as facts. Consider removing terms like: ' + 
            phrases.slice(0, 3).map(p => `"${p.text}"`).join(', ') + 
            (phrases.length > 3 ? ' and others' : ''));
          break;
        case 'passive-construction':
          suggestions.push('Use active voice to clarify responsibility instead of passive constructions like: ' + 
            phrases.slice(0, 3).map(p => `"${p.text}"`).join(', ') + 
            (phrases.length > 3 ? ' and others' : ''));
          break;
      }
    }
  });
  
  // Add political balance suggestions
  if (politicalLeaning !== 'unknown' && politicalLeaning !== 'center' && balanceScore < 70) {
    const oppositeViewpoint = politicalLeaning === 'left' ? 'conservative' : 'progressive';
    suggestions.push(`Consider including more ${oppositeViewpoint} viewpoints for better balance.`);
  }
  
  // Add general suggestions if specific ones are limited
  if (suggestions.length < 2) {
    if (biasedPhrases.length > 0) {
      suggestions.push('Review flagged terms and consider using more neutral alternatives.');
    } else {
      suggestions.push('No significant bias detected. Continue maintaining neutral language and balanced perspectives.');
    }
  }
  
  return suggestions;
}

/**
 * Determine the overall severity based on bias score
 */
function determineSeverity(biasScore: number): 'high' | 'medium' | 'low' | 'none' {
  if (biasScore >= 50) return 'high';
  if (biasScore >= 20) return 'medium';
  if (biasScore > 0) return 'low';
  return 'none';
}

/**
 * Generate HTML for highlighting biased phrases in text
 * @param text Original text
 * @param biasedPhrases List of biased phrases to highlight
 * @returns HTML with highlighted phrases
 */
export function generateHighlightedHTML(text: string, biasedPhrases: BiasedPhrase[]): string {
  if (biasedPhrases.length === 0) return text;
  
  // Sort phrases by position (from end to beginning to avoid index changes)
  const sortedPhrases = [...biasedPhrases].sort((a, b) => b.startIndex - a.startIndex);
  
  let result = text;
  
  // Replace each phrase with highlighted version
  sortedPhrases.forEach(phrase => {
    const severityClass = getSeverityClass(phrase.severity);
    const highlightedPhrase = `<span class="${severityClass}" data-type="${phrase.type}" title="${phrase.explanation}">${phrase.text}</span>`;
    
    result = 
      result.substring(0, phrase.startIndex) + 
      highlightedPhrase + 
      result.substring(phrase.endIndex);
  });
  
  return result;
}

/**
 * Get CSS class based on severity
 */
function getSeverityClass(severity: 'high' | 'medium' | 'low'): string {
  switch (severity) {
    case 'high': return 'bias-high';
    case 'medium': return 'bias-medium';
    case 'low': return 'bias-low';
  }
}

/**
 * Apply suggested neutralizations to biased text
 * @param text Original text
 * @param phrasesToNeutralize Array of phrases to neutralize with their replacements
 * @returns Text with neutralized phrasing
 */
export function neutralizeBias(
  text: string,
  phrasesToNeutralize: Array<{
    original: string;
    replacement: string;
    startIndex: number;
    endIndex: number;
  }>
): string {
  if (phrasesToNeutralize.length === 0) return text;
  
  // Sort phrases by position (from end to beginning to avoid index changes)
  const sortedPhrases = [...phrasesToNeutralize].sort((a, b) => b.startIndex - a.startIndex);
  
  let result = text;
  
  // Replace each phrase with its neutralization
  sortedPhrases.forEach(phrase => {
    result = 
      result.substring(0, phrase.startIndex) + 
      phrase.replacement + 
      result.substring(phrase.endIndex);
  });
  
  return result;
}

export default {
  detectBias,
  generateHighlightedHTML,
  neutralizeBias
}; 