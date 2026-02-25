import { CLERK_OAUTH_CLIENT_ID, CLERK_TOKEN_URL } from "./constants";
import { loadPersistedToken, persistToken } from "./tokenStorage";

/**
 * Refreshes the access token using the refresh_token grant (public client, no client_secret).
 * Persists the new tokens on success.
 * Returns the new access token, or null if refresh failed.
 */
export async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = loadPersistedToken("refresh");
  if (!refreshToken) return null;

  try {
    const res = await fetch(CLERK_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        client_id: CLERK_OAUTH_CLIENT_ID,
      }).toString(),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error(`[auth] Token refresh failed (${res.status}): ${text}`);
      return null;
    }

    const data = (await res.json()) as {
      access_token: string;
      refresh_token?: string;
      token_type: string;
      expires_in: number;
    };

    persistToken("access", data.access_token);
    if (data.refresh_token) {
      persistToken("refresh", data.refresh_token);
    }
    persistToken("expiry", String(Date.now() + data.expires_in * 1000));

    return data.access_token;
  } catch (err) {
    console.error("[auth] Token refresh error:", err);
    return null;
  }
}
