/**
 * Google OAuth utility for browser-based authentication
 *
 * This enables higher Gemini API rate limits (60 RPM, 1000 RPD) by authenticating
 * with a Google account instead of using an API key.
 *
 * Flow:
 * 1. User clicks "Sign in with Google"
 * 2. Redirect to Google OAuth consent screen
 * 3. Google redirects back with authorization code
 * 4. Exchange code for access + refresh tokens
 * 5. Store tokens in localStorage
 * 6. Use access token for API requests
 * 7. Refresh token when expired
 */

const OAUTH_CONFIG = {
  // These need to be configured in Google Cloud Console
  // Users can provide their own OAuth client ID or use a default one
  clientId: process.env.NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID || '',

  // Scopes needed for Gemini API access
  scopes: [
    'https://www.googleapis.com/auth/generative-language.retriever',
    'https://www.googleapis.com/auth/cloud-platform',
  ].join(' '),

  // Google OAuth endpoints
  authEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',

  // Storage keys
  storageKeys: {
    accessToken: 'gemini_oauth_access_token',
    refreshToken: 'gemini_oauth_refresh_token',
    expiresAt: 'gemini_oauth_expires_at',
    userEmail: 'gemini_oauth_user_email',
  }
};

export interface OAuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
  userEmail?: string;
}

export interface OAuthState {
  isAuthenticated: boolean;
  userEmail?: string;
  expiresAt?: number;
}

/**
 * Get the OAuth redirect URI based on current origin
 */
function getRedirectUri(): string {
  if (typeof window === 'undefined') return '';
  return `${window.location.origin}/api/auth/google/callback`;
}

/**
 * Generate a random state parameter for CSRF protection
 */
function generateState(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Generate PKCE code verifier and challenge
 */
async function generatePKCE(): Promise<{ verifier: string; challenge: string }> {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  const verifier = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');

  // Generate challenge from verifier using SHA-256
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = new Uint8Array(hashBuffer);
  const challenge = btoa(String.fromCharCode(...hashArray))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  return { verifier, challenge };
}

/**
 * Store tokens in localStorage
 */
function storeTokens(tokens: OAuthTokens): void {
  if (typeof window === 'undefined') return;

  localStorage.setItem(OAUTH_CONFIG.storageKeys.accessToken, tokens.accessToken);
  localStorage.setItem(OAUTH_CONFIG.storageKeys.expiresAt, tokens.expiresAt.toString());

  if (tokens.refreshToken) {
    localStorage.setItem(OAUTH_CONFIG.storageKeys.refreshToken, tokens.refreshToken);
  }
  if (tokens.userEmail) {
    localStorage.setItem(OAUTH_CONFIG.storageKeys.userEmail, tokens.userEmail);
  }
}

/**
 * Get stored tokens from localStorage
 */
export function getStoredTokens(): OAuthTokens | null {
  if (typeof window === 'undefined') return null;

  const accessToken = localStorage.getItem(OAUTH_CONFIG.storageKeys.accessToken);
  const expiresAtStr = localStorage.getItem(OAUTH_CONFIG.storageKeys.expiresAt);

  if (!accessToken || !expiresAtStr) return null;

  return {
    accessToken,
    refreshToken: localStorage.getItem(OAUTH_CONFIG.storageKeys.refreshToken) || undefined,
    expiresAt: parseInt(expiresAtStr, 10),
    userEmail: localStorage.getItem(OAUTH_CONFIG.storageKeys.userEmail) || undefined,
  };
}

/**
 * Clear stored tokens (sign out)
 */
export function clearTokens(): void {
  if (typeof window === 'undefined') return;

  Object.values(OAUTH_CONFIG.storageKeys).forEach(key => {
    localStorage.removeItem(key);
  });
}

/**
 * Check if user is authenticated with valid (non-expired) token
 */
export function getAuthState(): OAuthState {
  const tokens = getStoredTokens();

  if (!tokens) {
    return { isAuthenticated: false };
  }

  const now = Date.now();
  const isExpired = tokens.expiresAt < now;

  // If expired but we have refresh token, we can still consider authenticated
  // (will refresh on next API call)
  const hasRefreshToken = !!tokens.refreshToken;

  return {
    isAuthenticated: !isExpired || hasRefreshToken,
    userEmail: tokens.userEmail,
    expiresAt: tokens.expiresAt,
  };
}

/**
 * Get a valid access token, refreshing if needed
 */
export async function getValidAccessToken(): Promise<string | null> {
  const tokens = getStoredTokens();

  if (!tokens) return null;

  const now = Date.now();
  const isExpired = tokens.expiresAt < now - 60000; // 1 minute buffer

  if (!isExpired) {
    return tokens.accessToken;
  }

  // Try to refresh
  if (tokens.refreshToken) {
    try {
      const newTokens = await refreshAccessToken(tokens.refreshToken);
      return newTokens.accessToken;
    } catch (error) {
      console.error('Failed to refresh token:', error);
      clearTokens();
      return null;
    }
  }

  return null;
}

/**
 * Initiate OAuth flow - redirects to Google
 */
export async function initiateOAuthFlow(clientId?: string): Promise<void> {
  if (typeof window === 'undefined') return;

  const effectiveClientId = clientId || OAUTH_CONFIG.clientId;

  if (!effectiveClientId) {
    throw new Error('Google OAuth Client ID is required. Please configure it in settings.');
  }

  // Generate PKCE challenge
  const { verifier, challenge } = await generatePKCE();

  // Generate state for CSRF protection
  const state = generateState();

  // Store verifier and state for callback
  sessionStorage.setItem('oauth_code_verifier', verifier);
  sessionStorage.setItem('oauth_state', state);
  sessionStorage.setItem('oauth_client_id', effectiveClientId);

  // Build authorization URL
  const params = new URLSearchParams({
    client_id: effectiveClientId,
    redirect_uri: getRedirectUri(),
    response_type: 'code',
    scope: OAUTH_CONFIG.scopes,
    state: state,
    code_challenge: challenge,
    code_challenge_method: 'S256',
    access_type: 'offline', // Request refresh token
    prompt: 'consent', // Always show consent to get refresh token
  });

  const authUrl = `${OAUTH_CONFIG.authEndpoint}?${params.toString()}`;

  // Redirect to Google OAuth
  window.location.href = authUrl;
}

/**
 * Handle OAuth callback - exchange code for tokens
 */
export async function handleOAuthCallback(
  code: string,
  state: string
): Promise<OAuthTokens> {
  // Verify state to prevent CSRF
  const storedState = sessionStorage.getItem('oauth_state');
  if (state !== storedState) {
    throw new Error('Invalid OAuth state - possible CSRF attack');
  }

  const codeVerifier = sessionStorage.getItem('oauth_code_verifier');
  const clientId = sessionStorage.getItem('oauth_client_id');

  if (!codeVerifier || !clientId) {
    throw new Error('Missing OAuth session data');
  }

  // Exchange code for tokens via our backend (to keep client secret secure)
  const response = await fetch('/api/auth/google/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      code,
      codeVerifier,
      clientId,
      redirectUri: getRedirectUri(),
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to exchange authorization code');
  }

  const data = await response.json();

  const tokens: OAuthTokens = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + (data.expires_in * 1000),
    userEmail: data.email,
  };

  // Store tokens
  storeTokens(tokens);

  // Clean up session storage
  sessionStorage.removeItem('oauth_code_verifier');
  sessionStorage.removeItem('oauth_state');
  sessionStorage.removeItem('oauth_client_id');

  return tokens;
}

/**
 * Refresh access token using refresh token
 */
async function refreshAccessToken(refreshToken: string): Promise<OAuthTokens> {
  const response = await fetch('/api/auth/google/refresh', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ refreshToken }),
  });

  if (!response.ok) {
    throw new Error('Failed to refresh access token');
  }

  const data = await response.json();

  const tokens: OAuthTokens = {
    accessToken: data.access_token,
    refreshToken: refreshToken, // Keep existing refresh token
    expiresAt: Date.now() + (data.expires_in * 1000),
    userEmail: getStoredTokens()?.userEmail,
  };

  // Update stored tokens
  storeTokens(tokens);

  return tokens;
}

/**
 * Sign out - clear tokens
 */
export function signOut(): void {
  clearTokens();
}

/**
 * Check if OAuth is properly configured
 */
export function isOAuthConfigured(): boolean {
  return !!OAUTH_CONFIG.clientId || typeof window !== 'undefined';
}
