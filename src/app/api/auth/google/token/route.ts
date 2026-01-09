/**
 * Google OAuth Token Exchange
 *
 * This route exchanges an authorization code for access and refresh tokens.
 * It also fetches the user's email from Google's userinfo endpoint.
 */

import { NextRequest, NextResponse } from "next/server";

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo";

interface TokenRequest {
  code: string;
  codeVerifier: string;
  clientId: string;
  redirectUri: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: TokenRequest = await request.json();
    const { code, codeVerifier, clientId, redirectUri } = body;

    if (!code || !codeVerifier || !clientId || !redirectUri) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 }
      );
    }

    // Get client secret from environment (if available)
    // For public clients (SPAs), we use PKCE without client secret
    const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;

    // Exchange authorization code for tokens
    const tokenParams = new URLSearchParams({
      code,
      client_id: clientId,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
      code_verifier: codeVerifier,
    });

    // Add client secret only if configured (for confidential clients)
    if (clientSecret) {
      tokenParams.append("client_secret", clientSecret);
    }

    const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: tokenParams.toString(),
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.json();
      console.error("[OAuth Token] Exchange failed:", error);
      return NextResponse.json(
        {
          error: "Token exchange failed",
          message: error.error_description || error.error || "Unknown error",
        },
        { status: 400 }
      );
    }

    const tokenData = await tokenResponse.json();

    // Fetch user email using the access token
    let email: string | undefined;
    try {
      const userInfoResponse = await fetch(GOOGLE_USERINFO_URL, {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
        },
      });

      if (userInfoResponse.ok) {
        const userInfo = await userInfoResponse.json();
        email = userInfo.email;
      }
    } catch (error) {
      console.warn("[OAuth Token] Failed to fetch user info:", error);
    }

    console.log("[OAuth Token] Successfully exchanged code for tokens");

    return NextResponse.json({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_in: tokenData.expires_in || 3600,
      token_type: tokenData.token_type || "Bearer",
      email,
    });
  } catch (error) {
    console.error("[OAuth Token] Error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
