/**
 * Google OAuth Token Refresh
 *
 * This route refreshes an expired access token using a refresh token.
 */

import { NextRequest, NextResponse } from "next/server";

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";

interface RefreshRequest {
  refreshToken: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: RefreshRequest = await request.json();
    const { refreshToken } = body;

    if (!refreshToken) {
      return NextResponse.json(
        { error: "Missing refresh token" },
        { status: 400 }
      );
    }

    // Get client ID and secret from environment or request
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;

    if (!clientId) {
      return NextResponse.json(
        { error: "OAuth client ID not configured" },
        { status: 500 }
      );
    }

    // Refresh the access token
    const tokenParams = new URLSearchParams({
      refresh_token: refreshToken,
      client_id: clientId,
      grant_type: "refresh_token",
    });

    // Add client secret if available
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
      console.error("[OAuth Refresh] Failed:", error);
      return NextResponse.json(
        {
          error: "Token refresh failed",
          message: error.error_description || error.error || "Unknown error",
        },
        { status: 400 }
      );
    }

    const tokenData = await tokenResponse.json();

    console.log("[OAuth Refresh] Successfully refreshed access token");

    return NextResponse.json({
      access_token: tokenData.access_token,
      expires_in: tokenData.expires_in || 3600,
      token_type: tokenData.token_type || "Bearer",
    });
  } catch (error) {
    console.error("[OAuth Refresh] Error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
