# Desktop Authentication: RFC 8252 OAuth 2.0 for Native Apps

## The Problem

Curate Desktop uses Electron with React. The production web domain is `curate.is`.

When using `@clerk/clerk-react` inside the Electron renderer, users sign in successfully via the browser but are **immediately logged out** upon returning to the app. Root cause:

1. **Cookie stripping**: Clerk relies on a `__client` cookie for session maintenance. The Electron renderer runs on a non-web scheme (`app://` or `file://`), so Chromium's strict SameSite rules strip the cookie.
2. **CORS blocking**: Clerk's Frontend API enforces strict CORS policies that block requests from the renderer's non-web origin.

## The Solution

We use **RFC 8252 (OAuth 2.0 for Native Apps)** — the industry standard for native application authentication. The entire auth lifecycle lives in the **Node.js Main Process**, bypassing Chromium's browser security model entirely.

Clerk is used as an **OAuth 2.0 Identity Provider** (IdP). We consume its standard OAuth/OIDC endpoints with an authorization code flow + PKCE. This is a **public client** — no `client_secret` is used (per RFC 8252 §8.5).

---

## Architecture

```
                           System Browser
                          (user's default)
                                |
                    1. shell.openExternal()
                    opens /oauth/authorize
                                |
                                v
                    +---------------------+
                    |  Clerk OAuth IdP    |
                    |  clerk.curate.is    |
                    |  (user signs in)    |
                    +---------------------+
                                |
                    2. Redirect to curate://auth?code=...&state=...
                                |
                                v
                    +---------------------+
                    |  Electron Main      |
                    |  Process (Node.js)  |
                    |                     |
                    |  3. Validate state   |
                    |  4. POST /oauth/token|
                    |     + code_verifier |
                    |  5. Receive tokens  |
                    |  6. Encrypt & store |
                    |  7. Schedule refresh|
                    +---------------------+
                                |
                    8. IPC: auth:token → access_token
                                |
                                v
                    +---------------------+
                    |  Renderer (React)   |
                    |  Local AuthProvider |
                    |  Attaches Bearer    |
                    |  token to API calls |
                    +---------------------+
                                |
                                v
                    +---------------------+
                    |  Server (Next.js)   |
                    |  resolveUserId()    |
                    |  - Clerk session OR |
                    |  - Bearer JWT verify|
                    +---------------------+
```

### Flow in Detail

| Step | What happens | Where |
| ---- | ------------ | ----- |
| 1 | User clicks "Sign In" | Renderer calls `window.electronAPI.signIn()` |
| 2 | Generates PKCE verifier/challenge + state, opens system browser | Main process |
| 3 | User authenticates with Clerk | System browser |
| 4 | Clerk redirects to `curate://auth?code=<code>&state=<state>` | OS deep link |
| 5 | Validates `state`, extracts `code` | Main process |
| 6 | POSTs to `/oauth/token` with code + code_verifier (no secret) | Main process |
| 7 | Receives `access_token`, `refresh_token`, `expires_in` | Main process |
| 8 | Encrypts tokens via safeStorage, persists to disk | Main process |
| 9 | Schedules proactive refresh 2min before expiry | Main process |
| 10 | Sends `access_token` to renderer via IPC | Main → Renderer |
| 11 | tRPC calls attach `Authorization: Bearer <token>` | Renderer |
| 12 | Server verifies JWT via `resolveUserId()` (Clerk JWKS) | Server |

---

## File Structure

```
apps/desktop/src/
├── auth/
│   ├── constants.ts       # Clerk OAuth endpoint URLs and client ID
│   ├── tokenStorage.ts    # Encrypted token persistence (safeStorage + base64)
│   └── tokenRefresh.ts    # Silent token refresh via refresh_token grant
├── main.ts                # OAuth flow orchestration, IPC handlers, refresh timer
├── preload.ts             # Context bridge (signIn, signOut, getToken, onAuthToken)
└── renderer/
    ├── AuthProvider.tsx    # React auth context (replaces ClerkProvider)
    ├── TRPCProvider.tsx    # tRPC client with Bearer auth + 401 handling
    ├── App.tsx             # Conditional render: loading / sign-in / app
    └── main.tsx            # Entry point (AuthProvider wrapper)

apps/web/src/
└── lib/
    └── resolveUserId.ts   # Dual-path auth: Clerk session OR Bearer JWT
```

## Server-Side Auth

`resolveUserId(req)` in `apps/web/src/lib/resolveUserId.ts` supports two auth paths:

1. **Clerk session** (web clients) — `auth()` from `@clerk/nextjs/server` reads session cookies
2. **OAuth Bearer token** (desktop) — `verifyToken()` validates the JWT using Clerk's JWKS (cached, handles key rotation)

Both tRPC and upload routes use this helper.

## Token Refresh

- **On-demand**: `auth:get-token` IPC handler checks expiry. If within 60s of expiry, refreshes before returning.
- **Proactive**: A `setTimeout` fires 2 minutes before expiry, refreshes the token, and pushes it to the renderer.
- **Failure**: If refresh fails (revoked token, network error), tokens are cleared and the user sees the sign-in screen.

## Clerk Dashboard Setup

1. **Clerk Dashboard** > Configure > OAuth Applications > Add
2. Configure as **Public Client** (no client secret)
3. Add `curate://auth` as redirect URI
4. Set `CLERK_OAUTH_CLIENT_ID` in `apps/desktop/.env`

## Security Model

| Protection | Mechanism |
| ---------- | --------- |
| Code interception | PKCE (S256) — `code_verifier` stays in main process memory |
| CSRF | Random `state` parameter verified on callback |
| Tokens at rest | `safeStorage` → OS keychain (Keychain/libsecret/DPAPI) |
| Token replay | Refresh token revoked server-side on sign-out |
| 401 recovery | Renderer auto-signs out on 401 response |
| Stale closures | `tokenRef` pattern in TRPCProvider |
| Cold launch race | `pendingDeepLinkUrl` cached until app ready |
| Keychain denial | Graceful fallback to signed-out state |

## References

- [RFC 8252 — OAuth 2.0 for Native Apps](https://datatracker.ietf.org/doc/html/rfc8252)
- [RFC 7636 — PKCE](https://datatracker.ietf.org/doc/html/rfc7636)
- [RFC 7009 — Token Revocation](https://datatracker.ietf.org/doc/html/rfc7009)
- [Clerk as OAuth 2.0 IdP](https://clerk.com/docs/advanced-usage/clerk-idp)
- [Electron Deep Links](https://www.electronjs.org/docs/latest/tutorial/launch-app-from-url-in-another-app)
- [Electron safeStorage](https://www.electronjs.org/docs/latest/api/safe-storage)
