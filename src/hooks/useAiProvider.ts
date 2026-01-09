import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { useSettingStore } from "@/store/setting";
import { shuffle } from "radash";
import apiKeyManager from "@/utils/api-key-manager";
import apiKeyStorage from "@/utils/api-key-storage";
import { getStoredTokens, getAuthState } from "@/utils/google-oauth";

export function useModelProvider() {
  const { apiKey = "", apiProxy, accessPassword, authMethod } = useSettingStore();

  function createProvider(type: "google") {
    // Google OAuth mode - use OAuth tokens for higher rate limits
    if (authMethod === "gemini-cli") {
      const authState = getAuthState();
      const tokens = getStoredTokens();

      if (!authState.isAuthenticated || !tokens?.accessToken) {
        throw new Error("Not authenticated with Google. Please sign in via Settings.");
      }

      console.log("Using Google OAuth mode (higher limits: 60 RPM, 1000 RPD)");

      // Route through our proxy with the OAuth token
      // The proxy will use Bearer token authentication
      return createGoogleGenerativeAI({
        baseURL: "/api/ai/google/v1beta",
        apiKey: "oauth-mode", // Placeholder - actual auth via OAuth header
        headers: {
          "x-auth-method": "oauth",
          "x-oauth-token": tokens.accessToken,
        },
      });
    }

    // Standard API key authentication
    const apiKeys = shuffle(apiKey.split(","));

    console.log("Creating provider with API key available:", !!apiKey);

    // Store the API key in our storage service
    if (apiKey) {
      console.log("Storing API key in client-side storage");
      apiKeyStorage.storeApiKey(apiKey);

      // Also add to legacy API key manager for backward compatibility
      apiKeyManager.addKeys(apiKey);
    }

    // Create the key to use - either from user input or accessPassword
    if (!apiKeys[0] && !accessPassword) {
      throw new Error("No valid API key or access password provided. Please configure your settings.");
    }
    const keyToUse = apiKeys[0] || accessPassword;
    console.log("Using key type:", keyToUse ? "valid key" : "none");

    if (type === "google") {
      // Always use our server proxy to avoid CORS issues
      // v2.0.43: debug option removed, fetchOptions flattened to headers
      return createGoogleGenerativeAI({
        baseURL: "/api/ai/google/v1beta",
        apiKey: keyToUse,
        headers: {
          // Explicitly pass the API key as a header that our backend expects
          "x-api-key": keyToUse || ""
        }
      });
    } else {
      throw new Error("Unsupported Provider: " + type);
    }
  }

  return {
    createProvider,
  };
}
