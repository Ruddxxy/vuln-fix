import { toast } from "sonner";
import logger from "@/utils/logger";
import { getModelLimits, FALLBACK_ORDER } from "@/constants/models";

/**
 * Rate Limiter for Google Generative AI API
 *
 * Tracks request usage per model, handles cooldowns when rate limits are hit,
 * and provides fallback model selection when models are exhausted.
 */

// Models marked as unavailable after actual API errors (404 or explicit deprecation)
// This list is populated dynamically when we receive API errors
export const DEPRECATED_MODELS: string[] = [];

/**
 * Check if an error is a rate limit error
 */
export function isRateLimitError(error: unknown): boolean {
  if (!error) return false;

  if (typeof error === 'object') {
    const err = error as Record<string, unknown>;

    // Check for common rate limit indicators
    if (err.code === 429 || err.status === 429) return true;
    if (err.code === 503 || err.status === 503) return true;
    if (err.statusCode === 429 || err.statusCode === 503) return true;

    if (err.error && typeof err.error === 'object') {
      const innerError = err.error as Record<string, unknown>;
      if (innerError.code === 429 || innerError.status === 429) return true;
      if (innerError.code === 503 || innerError.status === 503) return true;
    }

    // Check the error message
    const message = (err.message || (err.error as Record<string, unknown>)?.message || '') as string;
    if (typeof message === 'string') {
      if (
        message.includes('rate limit') ||
        message.includes('too many requests') ||
        message.includes('overloaded') ||
        message.includes('quota exceeded') ||
        message.includes('Resource exhausted') ||
        message.includes('RESOURCE_EXHAUSTED')
      ) {
        return true;
      }
    }

    // Check for nested lastError (from AI SDK retry errors)
    if (err.lastError) {
      return isRateLimitError(err.lastError);
    }
  }

  return false;
}

/**
 * Default rate limiter class
 * Tracks request usage per model, handles cooldowns, and provides fallback selection
 */
class DefaultRateLimiter {
  private cooldowns: Record<string, { until: number; reason?: string }> = {};
  private exhaustedModels: Set<string> = new Set();
  private unavailableModels: Set<string> = new Set();
  private modelStats: Record<string, { rpm: number; rpd: number; lastResetRpm: number; lastResetRpd: number }> = {};

  constructor() {
    this.resetDailyCounts();

    // Set up periodic resets (client-side only)
    if (typeof window !== 'undefined') {
      // Reset RPM counts every minute
      setInterval(() => this.resetMinuteCounts(), 60000);

      // Reset RPD counts at midnight
      setInterval(() => this.resetDailyCounts(), this.getMsUntilMidnight());

      // Clear exhausted models every hour (quota may reset)
      setInterval(() => this.clearExhaustedModels(), 3600000);
    }
  }

  /**
   * Check if a model is in cooldown period
   */
  isInCooldown(model: string): boolean {
    if (!this.cooldowns[model]) return false;

    const now = Date.now();
    if (now < this.cooldowns[model].until) {
      return true;
    }

    // Clear expired cooldown
    delete this.cooldowns[model];
    return false;
  }

  /**
   * Get remaining cooldown time in seconds
   */
  getCooldownTimeRemaining(model: string): number {
    if (!this.cooldowns[model]) return 0;

    const now = Date.now();
    const timeRemaining = this.cooldowns[model].until - now;

    return Math.max(0, Math.ceil(timeRemaining / 1000));
  }

  /**
   * Check if a model's quota is exhausted
   */
  isModelExhausted(model: string): boolean {
    return this.exhaustedModels.has(model);
  }

  /**
   * Check if a model has been marked as unavailable (from actual API errors)
   */
  isModelDeprecated(model: string): boolean {
    return DEPRECATED_MODELS.includes(model) || this.unavailableModels.has(model);
  }

  /**
   * Mark a model as unavailable (called when we get 404 or deprecation errors)
   */
  markModelUnavailable(model: string, reason?: string): void {
    this.unavailableModels.add(model);
    logger.info(`Model ${model} marked as unavailable${reason ? `: ${reason}` : ''}`);
  }

  /**
   * Mark a model as exhausted (daily quota exceeded)
   */
  markModelExhausted(model: string): void {
    this.exhaustedModels.add(model);
    logger.info(`Model ${model} marked as exhausted (quota exceeded)`);
  }

  /**
   * Clear exhausted models (called periodically to allow retry)
   */
  clearExhaustedModels(): void {
    this.exhaustedModels.clear();
    logger.debug('Cleared exhausted models list');
  }

  /**
   * Get a fallback model when the requested model is unavailable
   */
  getFallbackModel(currentModel: string): string | null {
    for (const fallback of FALLBACK_ORDER) {
      if (fallback !== currentModel && !this.isInCooldown(fallback) && !this.isModelExhausted(fallback)) {
        logger.info(`Suggesting fallback model: ${fallback} (instead of ${currentModel})`);
        return fallback;
      }
    }
    return null;
  }

  /**
   * Handle API error from response
   * Parses the retryDelay from Google's error response and handles 404 errors
   */
  handleRateLimitError(model: string, error: unknown): { retryAfterMs: number; isQuotaExhausted: boolean; isModelUnavailable: boolean } {
    let retryAfterMs = 30000; // Default 30 seconds
    let isQuotaExhausted = false;
    let isModelUnavailable = false;

    try {
      const err = error as Record<string, unknown>;

      // Check for 404 errors (model not found/unavailable)
      if (err.status === 404 || err.statusCode === 404 || err.code === 404) {
        isModelUnavailable = true;
        this.markModelUnavailable(model, '404 - Model not found');
        toast.error(`Model ${model} is not available. Switching to alternative model.`, { duration: 5000 });
        return { retryAfterMs: 0, isQuotaExhausted: false, isModelUnavailable: true };
      }

      // Try to parse the error response for retryDelay
      let errorBody: Record<string, unknown> | null = null;

      // Handle different error formats
      if (err.responseBody) {
        try {
          errorBody = typeof err.responseBody === 'string' ? JSON.parse(err.responseBody) : err.responseBody as Record<string, unknown>;
        } catch {
          // Ignore parse errors
        }
      } else if (err.error) {
        errorBody = err.error as Record<string, unknown>;
      } else if (err.details) {
        errorBody = err.details as Record<string, unknown>;
      }

      // Check for 404 in parsed error body
      const innerError = errorBody?.error as Record<string, unknown> | undefined;
      if (innerError?.code === 404 || errorBody?.code === 404) {
        isModelUnavailable = true;
        this.markModelUnavailable(model, 'Model not found');
        toast.error(`Model ${model} is not available. Switching to alternative model.`, { duration: 5000 });
        return { retryAfterMs: 0, isQuotaExhausted: false, isModelUnavailable: true };
      }

      // Check for deprecation/unavailability messages
      const message = (innerError?.message || errorBody?.message || err.message || '') as string;
      if (message.includes('is not found') || message.includes('does not exist') || message.includes('deprecated')) {
        isModelUnavailable = true;
        this.markModelUnavailable(model, message);
        toast.error(`Model ${model} is not available. Switching to alternative model.`, { duration: 5000 });
        return { retryAfterMs: 0, isQuotaExhausted: false, isModelUnavailable: true };
      }

      // Extract retry delay from Google's error format
      const details = innerError?.details as Array<Record<string, unknown>> | undefined;
      if (details) {
        for (const detail of details) {
          const type = detail['@type'] as string | undefined;
          if (type?.includes('RetryInfo') && detail.retryDelay) {
            // Parse delay like "19.691053405s" or "19s"
            const delayStr = detail.retryDelay as string;
            const match = delayStr.match(/^(\d+(?:\.\d+)?)/);
            if (match) {
              retryAfterMs = Math.ceil(parseFloat(match[1]) * 1000);
              logger.debug(`Parsed retryDelay from API: ${retryAfterMs}ms`);
            }
          }

          // Check for quota exhaustion
          if (type?.includes('QuotaFailure')) {
            const violations = detail.violations as Array<Record<string, unknown>> | undefined;
            for (const violation of violations || []) {
              const quotaId = violation.quotaId as string | undefined;
              const quotaMetric = violation.quotaMetric as string | undefined;
              if (quotaId?.includes('PerDay') || quotaMetric?.includes('free_tier')) {
                isQuotaExhausted = true;
                logger.debug(`Daily quota exhausted for ${model}`);
              }
            }
          }
        }
      }

      // Check message for quota exhaustion indicators
      if (message.includes('quota exceeded') || message.includes('limit: 0')) {
        isQuotaExhausted = true;
      }

    } catch (parseError) {
      logger.warn('Could not parse rate limit error details:', parseError);
    }

    // Set cooldown
    this.cooldowns[model] = {
      until: Date.now() + retryAfterMs,
      reason: isQuotaExhausted ? 'quota_exhausted' : 'rate_limited'
    };

    // Mark as exhausted if quota is exceeded
    if (isQuotaExhausted) {
      this.markModelExhausted(model);
    }

    // Show user-friendly notification
    if (isQuotaExhausted) {
      const fallback = this.getFallbackModel(model);
      if (fallback) {
        toast.warning(`${model} quota exhausted. Try using ${fallback} instead.`, { duration: 5000 });
      } else {
        toast.error(`API quota exhausted for ${model}. Please try again later or add additional API keys.`, { duration: 7000 });
      }
    } else {
      const waitSeconds = Math.ceil(retryAfterMs / 1000);
      toast.warning(`Rate limited. Waiting ${waitSeconds}s before retry...`);
    }

    return { retryAfterMs, isQuotaExhausted, isModelUnavailable };
  }

  /**
   * Track a request for rate limiting purposes
   */
  trackRequest(model: string): void {
    if (!this.modelStats[model]) {
      this.modelStats[model] = {
        rpm: 0,
        rpd: 0,
        lastResetRpm: Date.now(),
        lastResetRpd: Date.now()
      };
    }

    this.modelStats[model].rpm += 1;
    this.modelStats[model].rpd += 1;

    const limits = getModelLimits(model);

    // Check if we've exceeded RPM limit
    if (this.modelStats[model].rpm >= limits.rpm) {
      const cooldownTime = 15000; // 15 seconds cooldown
      this.cooldowns[model] = {
        until: Date.now() + cooldownTime,
        reason: 'rpm_exceeded'
      };

      toast.warning(`Rate limit reached for ${model}. Cooling down for 15 seconds.`);
    }
  }

  /**
   * Get current usage statistics for a model
   */
  getModelStats(model: string): { rpm: number; rpd: number } {
    if (!this.modelStats[model]) {
      return { rpm: 0, rpd: 0 };
    }
    return {
      rpm: this.modelStats[model].rpm,
      rpd: this.modelStats[model].rpd
    };
  }

  /**
   * Reset minute-based counts
   */
  private resetMinuteCounts(): void {
    Object.keys(this.modelStats).forEach(model => {
      this.modelStats[model].rpm = 0;
      this.modelStats[model].lastResetRpm = Date.now();
    });
  }

  /**
   * Reset daily counts
   */
  private resetDailyCounts(): void {
    Object.keys(this.modelStats).forEach(model => {
      this.modelStats[model].rpd = 0;
      this.modelStats[model].lastResetRpd = Date.now();
    });
    // Also clear exhausted models at daily reset
    this.clearExhaustedModels();
  }

  /**
   * Calculate milliseconds until midnight for daily reset
   */
  private getMsUntilMidnight(): number {
    const now = new Date();
    const midnight = new Date();
    midnight.setHours(24, 0, 0, 0);
    return midnight.getTime() - now.getTime();
  }
}

// Create default rate limiter instance
const rateLimiter = new DefaultRateLimiter();

// Default export for legacy components
export default rateLimiter;
