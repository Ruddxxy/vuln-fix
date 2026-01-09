import { useCallback } from "react";
import { toast } from "sonner";
import rateLimiter from "@/utils/rate-limiter";
import { FALLBACK_ORDER } from "@/constants/models";
import logger from "@/utils/logger";

/**
 * Hook for consolidated model availability and cooldown checks.
 *
 * Provides utilities for:
 * - Checking if a model is in cooldown period
 * - Checking if a model is exhausted for the day
 * - Finding the first available model from a fallback list
 * - Combined availability check for immediate use
 */
export function useModelAvailability() {
  /**
   * Check if model is in cooldown and show toast notification if so.
   * @param model - The model identifier to check
   * @returns true if model is in cooldown (unavailable), false if available
   */
  const checkCooldown = useCallback((model: string): boolean => {
    if (rateLimiter.isInCooldown(model)) {
      const remainingSeconds = rateLimiter.getCooldownTimeRemaining(model);
      toast.error(
        `Model ${model} is cooling down. Please wait ${remainingSeconds} seconds before trying again.`
      );
      return true;
    }
    return false;
  }, []);

  /**
   * Check if model is exhausted (daily quota exceeded).
   * @param model - The model identifier to check
   * @returns true if model is exhausted, false if available
   */
  const checkExhausted = useCallback((model: string): boolean => {
    return rateLimiter.isModelExhausted(model);
  }, []);

  /**
   * Check if model has been marked as deprecated/unavailable.
   * @param model - The model identifier to check
   * @returns true if model is deprecated/unavailable, false if available
   */
  const checkDeprecated = useCallback((model: string): boolean => {
    return rateLimiter.isModelDeprecated(model);
  }, []);

  /**
   * Get the first available model from a preferred model and fallback list.
   * Respects cooldowns, exhaustion, and deprecation status.
   *
   * @param preferred - The preferred model to use
   * @param fallbacks - Optional list of fallback models (defaults to FALLBACK_ORDER)
   * @returns The first available model, or null if all are unavailable
   */
  const getAvailableModel = useCallback((
    preferred: string,
    fallbacks: string[] = [...FALLBACK_ORDER]
  ): string | null => {
    // Check if preferred model has been confirmed unavailable
    if (rateLimiter.isModelDeprecated(preferred)) {
      logger.info(`Model ${preferred} was previously marked unavailable, finding fallback`);
    } else if (
      !rateLimiter.isInCooldown(preferred) &&
      !rateLimiter.isModelExhausted(preferred)
    ) {
      // Preferred model is available
      return preferred;
    }

    // Try fallbacks in order
    for (const model of fallbacks) {
      if (model === preferred) continue;

      if (
        !rateLimiter.isInCooldown(model) &&
        !rateLimiter.isModelExhausted(model) &&
        !rateLimiter.isModelDeprecated(model)
      ) {
        logger.info(`Using fallback model ${model} instead of ${preferred}`);
        return model;
      }
    }

    // No available models found
    logger.warn(`No available models found for ${preferred} with fallbacks: ${fallbacks.join(", ")}`);
    return null;
  }, []);

  /**
   * Combined check - returns true if model can be used immediately.
   * Does not show toast notifications (use checkCooldown for that).
   *
   * @param model - The model identifier to check
   * @returns true if model is available for use, false otherwise
   */
  const isModelAvailable = useCallback((model: string): boolean => {
    return (
      !rateLimiter.isInCooldown(model) &&
      !rateLimiter.isModelExhausted(model) &&
      !rateLimiter.isModelDeprecated(model)
    );
  }, []);

  /**
   * Get detailed availability status for a model.
   * Useful for displaying status in UI components.
   *
   * @param model - The model identifier to check
   * @returns Object with availability details
   */
  const getModelStatus = useCallback((model: string): {
    available: boolean;
    inCooldown: boolean;
    cooldownRemaining: number;
    exhausted: boolean;
    deprecated: boolean;
    reason?: string;
  } => {
    const inCooldown = rateLimiter.isInCooldown(model);
    const exhausted = rateLimiter.isModelExhausted(model);
    const deprecated = rateLimiter.isModelDeprecated(model);
    const cooldownRemaining = rateLimiter.getCooldownTimeRemaining(model);

    let reason: string | undefined;
    if (deprecated) {
      reason = "Model is deprecated or unavailable";
    } else if (exhausted) {
      reason = "Daily quota exhausted";
    } else if (inCooldown) {
      reason = `Cooling down (${cooldownRemaining}s remaining)`;
    }

    return {
      available: !inCooldown && !exhausted && !deprecated,
      inCooldown,
      cooldownRemaining,
      exhausted,
      deprecated,
      reason,
    };
  }, []);

  return {
    checkCooldown,
    checkExhausted,
    checkDeprecated,
    getAvailableModel,
    isModelAvailable,
    getModelStatus,
  };
}

export default useModelAvailability;
