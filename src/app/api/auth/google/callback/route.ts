/**
 * Google OAuth Callback Handler
 *
 * This route handles the redirect from Google after user authorization.
 * It renders a page that extracts the authorization code and passes it
 * back to the main application.
 */

import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  // Handle OAuth errors
  if (error) {
    const errorDescription = searchParams.get("error_description") || "Unknown error";
    return new NextResponse(
      generateCallbackHtml({
        success: false,
        error: errorDescription,
      }),
      {
        headers: { "Content-Type": "text/html" },
      }
    );
  }

  // Validate required parameters
  if (!code || !state) {
    return new NextResponse(
      generateCallbackHtml({
        success: false,
        error: "Missing authorization code or state parameter",
      }),
      {
        headers: { "Content-Type": "text/html" },
      }
    );
  }

  // Return HTML page that sends the code back to the opener window
  return new NextResponse(
    generateCallbackHtml({
      success: true,
      code,
      state,
    }),
    {
      headers: { "Content-Type": "text/html" },
    }
  );
}

interface CallbackData {
  success: boolean;
  code?: string;
  state?: string;
  error?: string;
}

function generateCallbackHtml(data: CallbackData): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <title>Google OAuth - Deep Journalist</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
      margin: 0;
      background: #0f1419;
      color: #e7e9ea;
    }
    .container {
      text-align: center;
      padding: 2rem;
      background: #16202a;
      border-radius: 12px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
      max-width: 400px;
    }
    .spinner {
      border: 3px solid #2d3741;
      border-top: 3px solid #1d9bf0;
      border-radius: 50%;
      width: 40px;
      height: 40px;
      animation: spin 1s linear infinite;
      margin: 0 auto 1rem;
    }
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    .success { color: #00ba7c; }
    .error { color: #f4212e; }
    h2 { margin-top: 0; }
    p { color: #8899a6; }
  </style>
</head>
<body>
  <div class="container">
    ${data.success ? `
      <div class="spinner"></div>
      <h2 class="success">Authentication Successful</h2>
      <p>Completing sign-in, please wait...</p>
    ` : `
      <h2 class="error">Authentication Failed</h2>
      <p>${data.error || 'Unknown error occurred'}</p>
      <p>You can close this window and try again.</p>
    `}
  </div>

  <script>
    const data = ${JSON.stringify(data)};

    if (data.success) {
      // Send the authorization code back to the main window
      if (window.opener) {
        window.opener.postMessage({
          type: 'GOOGLE_OAUTH_CALLBACK',
          code: data.code,
          state: data.state,
        }, window.location.origin);

        // Close this window after a short delay
        setTimeout(() => window.close(), 1500);
      } else {
        // If opened in same window, redirect back to app with code
        const redirectUrl = new URL('/', window.location.origin);
        redirectUrl.searchParams.set('oauth_code', data.code);
        redirectUrl.searchParams.set('oauth_state', data.state);
        window.location.href = redirectUrl.toString();
      }
    } else {
      // On error, notify opener and close
      if (window.opener) {
        window.opener.postMessage({
          type: 'GOOGLE_OAUTH_ERROR',
          error: data.error,
        }, window.location.origin);

        setTimeout(() => window.close(), 3000);
      }
    }
  </script>
</body>
</html>
  `;
}
