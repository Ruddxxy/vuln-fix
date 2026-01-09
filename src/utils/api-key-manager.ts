/**
 * API Key Manager
 * 
 * This utility provides secure API key management including:
 * - Key rotation
 * - Usage tracking
 * - Rate limiting support
 */
import logger from "@/utils/logger";

interface ApiKeyUsage {
  key: string;
  usageCount: number;
  lastUsed: number;
  errorCount: number;
  lastError?: {
    timestamp: number;
    message: string;
    code?: string;
  };
}

class ApiKeyManager {
  private keys: string[] = [];
  private keyUsage: Map<string, ApiKeyUsage> = new Map();
  private currentKeyIndex = 0;
  
  constructor(apiKeys?: string | string[]) {
    if (apiKeys) {
      this.addKeys(apiKeys);
    }
  }

  /**
   * Add API keys to the manager
   */
  addKeys(keys: string | string[]): void {
    if (typeof keys === 'string') {
      // Split by commas and trim whitespace
      const keyArray = keys.split(',').map(key => key.trim()).filter(Boolean);
      
      // Clear existing keys to prevent duplicates
      this.keys = [];
      this.keys.push(...keyArray);
      
      logger.info(`Added ${keyArray.length} API key(s) from string input`);
      
      // Initialize usage tracking for each key
      keyArray.forEach(key => {
        if (!this.keyUsage.has(key)) {
          this.keyUsage.set(key, {
            key,
            usageCount: 0,
            lastUsed: 0,
            errorCount: 0
          });
        }
      });
    } else if (Array.isArray(keys)) {
      // Clear existing keys to prevent duplicates
      this.keys = [];
      const validKeys = keys.filter(Boolean);
      this.keys.push(...validKeys);
      
      logger.info(`Added ${validKeys.length} API key(s) from array input`);
      
      // Initialize usage tracking for each key
      validKeys.forEach(key => {
        if (!this.keyUsage.has(key)) {
          this.keyUsage.set(key, {
            key,
            usageCount: 0,
            lastUsed: 0,
            errorCount: 0
          });
        }
      });
    }
    
    // Log total key count
    logger.debug(`API key manager now has ${this.keys.length} total keys`);
  }

  /**
   * Get the next API key using round-robin rotation
   */
  getNextKey(): string | null {
    if (this.keys.length === 0) {
      logger.warn("No API keys available in API key manager");
      return null;
    }
    
    // Round-robin selection
    const key = this.keys[this.currentKeyIndex];
    this.currentKeyIndex = (this.currentKeyIndex + 1) % this.keys.length;
    
    // Track usage
    if (key) {
      const usage = this.keyUsage.get(key) || {
        key,
        usageCount: 0,
        lastUsed: 0,
        errorCount: 0
      };
      
      usage.usageCount++;
      usage.lastUsed = Date.now();
      this.keyUsage.set(key, usage);
      
      logger.debug(`Using API key: ${maskApiKey(key)} (usage count: ${usage.usageCount})`);
    }
    
    return key;
  }

  /**
   * Get all keys
   */
  getAllKeys(): string[] {
    return [...this.keys];
  }

  /**
   * Get the least used key (for load balancing)
   */
  getLeastUsedKey(): string | null {
    if (this.keys.length === 0) {
      logger.warn("No API keys available when requesting least used key");
      return null;
    }
    
    let leastUsed = this.keys[0];
    let minUsage = Infinity;
    
    for (const key of this.keys) {
      const usage = this.keyUsage.get(key)?.usageCount || 0;
      if (usage < minUsage) {
        minUsage = usage;
        leastUsed = key;
      }
    }
    
    // Track usage
    if (leastUsed) {
      const usage = this.keyUsage.get(leastUsed) || {
        key: leastUsed,
        usageCount: 0,
        lastUsed: 0,
        errorCount: 0
      };
      
      usage.usageCount++;
      usage.lastUsed = Date.now();
      this.keyUsage.set(leastUsed, usage);
      
      logger.debug(`Using least used API key: ${maskApiKey(leastUsed)} (usage count: ${usage.usageCount})`);
    }
    
    return leastUsed;
  }

  /**
   * Record an error for a specific key
   */
  recordError(key: string, errorMessage: string, errorCode?: string): void {
    const usage = this.keyUsage.get(key);
    if (usage) {
      usage.errorCount++;
      usage.lastError = {
        timestamp: Date.now(),
        message: errorMessage,
        code: errorCode
      };
      this.keyUsage.set(key, usage);
      
      logger.warn(`API key error recorded for key ${maskApiKey(key)}: ${errorMessage} (code: ${errorCode || 'none'}, error count: ${usage.errorCount})`);
    }
  }

  /**
   * Get usage statistics for all keys
   */
  getKeyUsageStats(): ApiKeyUsage[] {
    return Array.from(this.keyUsage.values());
  }
  
  /**
   * Check if any API keys are available
   */
  hasKeys(): boolean {
    const hasKeys = this.keys.length > 0;
    logger.debug(`API key availability check: ${hasKeys ? 'Keys available' : 'No keys available'}`);
    return hasKeys;
  }
}

/**
 * Mask API key for safe logging
 */
function maskApiKey(apiKey: string): string {
  if (!apiKey || apiKey.length < 8) {
    return '****';
  }
  return `${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)}`;
}

// Create a singleton instance for the application
const apiKeyManager = new ApiKeyManager(
  typeof process !== 'undefined' && process.env.GOOGLE_GENERATIVE_AI_API_KEY
    ? process.env.GOOGLE_GENERATIVE_AI_API_KEY
    : undefined
);

export default apiKeyManager;
