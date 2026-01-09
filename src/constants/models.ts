/**
 * Centralized Gemini Model Configuration
 *
 * Rate limits are based on Free Tier as of January 2025.
 * See: https://ai.google.dev/gemini-api/docs/rate-limits
 */

export interface ModelConfig {
  rpm: number;      // Requests per minute
  tpm: number;      // Tokens per minute
  rpd: number;      // Requests per day
  tier: 'pro' | 'flash' | 'lite' | 'search' | 'thinking';
  description: string;
  supportsGrounding: boolean;
  supportsUrlContext: boolean;
  experimental?: boolean;
}

export const GEMINI_MODELS: Record<string, ModelConfig> = {
  // Gemini 3 Preview Models (Newest)
  'gemini-3-pro-preview': {
    rpm: 5,
    tpm: 500000,
    rpd: 100,
    tier: 'pro',
    description: 'Most intelligent model for complex reasoning',
    supportsGrounding: true,
    supportsUrlContext: true,
    experimental: true,
  },
  'gemini-3-flash-preview': {
    rpm: 15,
    tpm: 500000,
    rpd: 500,
    tier: 'flash',
    description: 'Frontier-class performance at lower cost',
    supportsGrounding: true,
    supportsUrlContext: true,
    experimental: true,
  },

  // Gemini 2.5 Models (Stable)
  'gemini-2.5-flash': {
    rpm: 10,
    tpm: 250000,
    rpd: 250,
    tier: 'thinking',
    description: 'Best price-performance for general use, 1M context',
    supportsGrounding: true,
    supportsUrlContext: true,
  },
  'gemini-2.5-flash-lite': {
    rpm: 15,
    tpm: 250000,
    rpd: 1000,
    tier: 'lite',
    description: 'Fast and cost-efficient for high volume',
    supportsGrounding: true,
    supportsUrlContext: true,
  },
  'gemini-2.5-pro': {
    rpm: 2,
    tpm: 125000,
    rpd: 50,
    tier: 'pro',
    description: 'Complex reasoning (limited quota)',
    supportsGrounding: true,
    supportsUrlContext: true,
  },

  // Gemini 2.0 Models (High Volume)
  'gemini-2.0-flash': {
    rpm: 15,
    tpm: 1000000,
    rpd: 200,
    tier: 'flash',
    description: 'Good balance of speed and capability',
    supportsGrounding: true,
    supportsUrlContext: true,
  },
  'gemini-2.0-flash-lite': {
    rpm: 30,
    tpm: 1000000,
    rpd: 200,
    tier: 'search',
    description: 'Highest RPM - best for parallel search tasks',
    supportsGrounding: true,
    supportsUrlContext: true,
  },
} as const;

// Default model selections by task type
export const DEFAULT_THINKING_MODEL = 'gemini-2.5-flash';
export const DEFAULT_SEARCH_MODEL = 'gemini-2.0-flash-lite';
export const DEFAULT_WRITING_MODEL = 'gemini-2.5-flash';

// Experimental models (opt-in)
export const EXPERIMENTAL_THINKING_MODEL = 'gemini-3-flash-preview';

// Fallback order when models are rate-limited or unavailable
export const FALLBACK_ORDER = [
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
  'gemini-2.5-flash-lite',
] as const;

// Models suitable for different use cases
export const MODELS_BY_USE_CASE = {
  thinking: ['gemini-2.5-flash', 'gemini-3-flash-preview', 'gemini-2.5-pro'],
  search: ['gemini-2.0-flash-lite', 'gemini-2.0-flash', 'gemini-2.5-flash-lite'],
  writing: ['gemini-2.5-flash', 'gemini-3-flash-preview', 'gemini-2.5-pro'],
  verification: ['gemini-2.5-flash', 'gemini-3-pro-preview'],
} as const;

// Get model configuration
export function getModelConfig(modelName: string): ModelConfig | undefined {
  return GEMINI_MODELS[modelName];
}

// Get rate limits for a model
export function getModelLimits(modelName: string): { rpm: number; tpm: number; rpd: number } {
  const config = GEMINI_MODELS[modelName];
  if (!config) {
    // Return conservative defaults for unknown models
    return { rpm: 10, tpm: 250000, rpd: 100 };
  }
  return { rpm: config.rpm, tpm: config.tpm, rpd: config.rpd };
}

// Get optimal concurrency for parallel execution
export function getOptimalConcurrency(modelName: string): number {
  const config = GEMINI_MODELS[modelName];
  if (!config) return 3;

  // Calculate concurrency based on RPM
  // Higher RPM models can handle more concurrent requests
  const concurrency = Math.ceil(config.rpm / 6);
  return Math.min(Math.max(concurrency, 2), 6); // Between 2 and 6
}

// Get stagger delay between parallel requests
export function getStaggerDelay(modelName: string): number {
  const config = GEMINI_MODELS[modelName];
  if (!config) return 500;

  // Higher RPM models need less delay
  if (config.rpm >= 30) return 200;
  if (config.rpm >= 15) return 350;
  return 500;
}

// Check if model supports grounding (Google Search)
export function supportsGrounding(modelName: string): boolean {
  const config = GEMINI_MODELS[modelName];
  return config?.supportsGrounding ?? false;
}

// Check if model supports URL context tool
export function supportsUrlContext(modelName: string): boolean {
  const config = GEMINI_MODELS[modelName];
  return config?.supportsUrlContext ?? false;
}

// Get list of all available model names
export function getAvailableModels(): string[] {
  return Object.keys(GEMINI_MODELS);
}

// Get list of stable (non-experimental) models
export function getStableModels(): string[] {
  return Object.entries(GEMINI_MODELS)
    .filter(([_, config]) => !config.experimental)
    .map(([name]) => name);
}

// Get list of experimental models
export function getExperimentalModels(): string[] {
  return Object.entries(GEMINI_MODELS)
    .filter(([_, config]) => config.experimental)
    .map(([name]) => name);
}
