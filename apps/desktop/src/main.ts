import {
  app,
  BrowserWindow,
  globalShortcut,
  ipcMain,
  Menu,
  shell,
} from "electron";
import crypto from "node:crypto";
import path from "node:path";
import {
  cleanupStaleTmpFiles,
  cleanupTmpFile,
  initCaptureManager,
  startCapture,
} from "./capture/captureManager";
import { initOverlayWindow } from "./capture/overlayWindow";
import { loadSettings, showPreferences } from "./capture/preferences";
import {
  CLERK_AUTHORIZE_URL,
  CLERK_OAUTH_CLIENT_ID,
  CLERK_REVOKE_URL,
  CLERK_TOKEN_URL,
} from "./auth/constants";
import { refreshAccessToken } from "./auth/tokenRefresh";
import {
  clearPersistedTokens,
  loadPersistedToken,
  persistToken,
} from "./auth/tokenStorage";

const PROTOCOL = "curate";

let mainWindow: BrowserWindow | null = null;
let pendingAuthToken: string | null = null;
let currentHotkey: string | null = null;
let refreshTimer: ReturnType<typeof setTimeout> | null = null;

// ── RFC 8252 PKCE + State ──────────────────────────────────────────────
// Ephemeral per-flow values; cleared after each auth attempt.
let pendingCodeVerifier: string | null = null;
let pendingState: string | null = null;
let pendingDeepLinkUrl: string | null = null;

function generateCodeVerifier(): string {
  // 32 random bytes → 43-char base64url string (RFC 7636 §4.1)
  return crypto.randomBytes(32).toString("base64url");
}

function generateCodeChallenge(verifier: string): string {
  // S256: BASE64URL(SHA256(code_verifier))
  return crypto.createHash("sha256").update(verifier).digest("base64url");
}

function generateState(): string {
  return crypto.randomBytes(16).toString("base64url");
}

// ── Protocol Registration ──────────────────────────────────────────────
if (process.defaultApp) {
  // Dev: pass the app path so Electron is the handler
  if (process.argv[1]) {
    app.setAsDefaultProtocolClient(PROTOCOL, process.execPath, [
      path.resolve(process.argv[1]),
    ]);
  }
} else {
  app.setAsDefaultProtocolClient(PROTOCOL);
}

// ── Single Instance Lock ───────────────────────────────────────────────
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on("second-instance", (_event, argv) => {
    // Windows/Linux: deep link URL arrives in argv
    const url = argv.find((arg) => arg.startsWith(`${PROTOCOL}://`));
    if (url) handleDeepLink(url);
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

// ── Deep Link Handler ──────────────────────────────────────────────────
function handleDeepLink(url: string) {
  try {
    const parsed = new URL(url);
    if (parsed.hostname === "auth") {
      const code = parsed.searchParams.get("code");
      const state = parsed.searchParams.get("state");
      const error = parsed.searchParams.get("error");

      if (error) {
        console.error(
          `[auth] Authorization error: ${error} — ${parsed.searchParams.get("error_description")}`
        );
        return;
      }

      // If PKCE state doesn't exist yet (cold launch), cache URL for later
      if (!pendingCodeVerifier) {
        pendingDeepLinkUrl = url;
        return;
      }

      // CSRF: verify state matches what we sent
      if (!state || state !== pendingState) {
        console.error("[auth] State mismatch — possible CSRF. Ignoring.");
        return;
      }

      if (code) {
        exchangeCodeForTokens(code);
      }
    }
  } catch {
    // Ignore malformed URLs
  }
}

// ── Proactive Token Refresh Timer ────────────────────────────────────────
function scheduleTokenRefresh(expiresInMs: number) {
  if (refreshTimer) clearTimeout(refreshTimer);

  // Refresh 2 minutes before expiry (minimum 10s to avoid tight loops)
  const delay = Math.max(expiresInMs - 120_000, 10_000);

  refreshTimer = setTimeout(async () => {
    const newToken = await refreshAccessToken();
    if (newToken) {
      // Read the freshly persisted expiry to schedule the next refresh
      const expiryStr = loadPersistedToken("expiry");
      const expiry = expiryStr ? Number(expiryStr) : 0;
      scheduleTokenRefresh(expiry - Date.now());

      if (mainWindow) {
        mainWindow.webContents.send("auth:token", newToken);
      }
    } else {
      // Refresh failed — sign the user out
      clearPersistedTokens();
      if (mainWindow) {
        mainWindow.webContents.send("auth:token", null);
      }
    }
  }, delay);
}

function clearRefreshTimer() {
  if (refreshTimer) {
    clearTimeout(refreshTimer);
    refreshTimer = null;
  }
}

// ── Authorization Code → Token Exchange (back-channel) ─────────────────
async function exchangeCodeForTokens(code: string) {
  try {
    const codeVerifier = pendingCodeVerifier;
    // Clear ephemeral auth state immediately
    pendingCodeVerifier = null;
    pendingState = null;

    const body = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: `${PROTOCOL}://auth`,
      client_id: CLERK_OAUTH_CLIENT_ID,
      ...(codeVerifier ? { code_verifier: codeVerifier } : {}),
    });

    const res = await fetch(CLERK_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error(`[auth] Token exchange failed (${res.status}): ${text}`);
      return;
    }

    const data = (await res.json()) as {
      access_token: string;
      id_token?: string;
      refresh_token?: string;
      token_type: string;
      expires_in: number;
    };

    // Persist tokens
    persistToken("access", data.access_token);
    if (data.refresh_token) {
      persistToken("refresh", data.refresh_token);
    }
    persistToken("expiry", String(Date.now() + data.expires_in * 1000));

    // Schedule proactive refresh before expiry
    scheduleTokenRefresh(data.expires_in * 1000);

    // Deliver to renderer
    if (mainWindow) {
      mainWindow.webContents.send("auth:token", data.access_token);
      mainWindow.focus();
    } else {
      pendingAuthToken = data.access_token;
    }
  } catch (err) {
    console.error("[auth] Token exchange error:", err);
  }
}

// ── Token Revocation (RFC 7009) ────────────────────────────────────────
async function revokeTokens() {
  const refreshToken = loadPersistedToken("refresh");
  if (!refreshToken) return;

  try {
    await fetch(CLERK_REVOKE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        token: refreshToken,
        token_type_hint: "refresh_token",
        client_id: CLERK_OAUTH_CLIENT_ID,
      }).toString(),
    });
  } catch (err) {
    console.error("[auth] Token revocation error:", err);
  }
}

// ── Sign-In Initiation (RFC 8252 §4) ──────────────────────────────────
function initiateSignIn() {
  pendingCodeVerifier = generateCodeVerifier();
  pendingState = generateState();

  const params = new URLSearchParams({
    client_id: CLERK_OAUTH_CLIENT_ID,
    response_type: "code",
    redirect_uri: `${PROTOCOL}://auth`,
    scope: "openid profile email offline_access",
    state: pendingState,
    code_challenge: generateCodeChallenge(pendingCodeVerifier),
    code_challenge_method: "S256",
  });

  shell.openExternal(`${CLERK_AUTHORIZE_URL}?${params.toString()}`);
}

// macOS: handle deep link when app is already running or cold-started
app.on("open-url", (event, url) => {
  event.preventDefault();
  handleDeepLink(url);
});

function registerHotkey(hotkey: string) {
  if (currentHotkey) {
    globalShortcut.unregister(currentHotkey);
  }
  try {
    globalShortcut.register(hotkey, () => {
      startCapture();
    });
    currentHotkey = hotkey;
  } catch (err) {
    console.error(`[hotkey] Failed to register "${hotkey}":`, err);
  }
}

function buildAppMenu() {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: app.name,
      submenu: [
        {
          label: "Preferences...",
          accelerator: "CmdOrCtrl+,",
          click: () => {
            showPreferences((newHotkey) => {
              registerHotkey(newHotkey);
            });
          },
        },
        { type: "separator" },
        { role: "quit" },
      ],
    },
    {
      label: "Edit",
      submenu: [
        { role: "undo" },
        { role: "redo" },
        { type: "separator" },
        { role: "cut" },
        { role: "copy" },
        { role: "paste" },
        { role: "selectAll" },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    titleBarStyle: "hiddenInset",
    trafficLightPosition: { x: 16, y: 18 },
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
    },
  });

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`)
    );
  }

  mainWindow.webContents.on("did-finish-load", () => {
    if (pendingAuthToken && mainWindow) {
      mainWindow.webContents.send("auth:token", pendingAuthToken);
      pendingAuthToken = null;
    }
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  // Initialize capture system
  initCaptureManager(mainWindow);
}

// ── IPC Handlers ─────────────────────────────────────────────────────────
ipcMain.on("open-external", (_event, url: string) => {
  if (typeof url === "string" && url.startsWith("https://")) {
    shell.openExternal(url);
  } else if (typeof url === "string" && url.startsWith("http://localhost")) {
    shell.openExternal(url);
  }
});

// Renderer requests sign-in → open system browser
ipcMain.on("auth:sign-in", () => {
  initiateSignIn();
});

// Renderer requests sign-out → revoke + clear stored tokens
ipcMain.on("auth:sign-out", () => {
  clearRefreshTimer();
  revokeTokens().finally(() => clearPersistedTokens());
});

// Renderer asks for current token (e.g. on app launch)
ipcMain.handle("auth:get-token", async () => {
  const token = loadPersistedToken("access");
  if (!token) return null;

  const expiryStr = loadPersistedToken("expiry");
  const expiry = expiryStr ? Number(expiryStr) : 0;

  // Refresh if expiring within 60 seconds
  if (Date.now() > expiry - 60_000) {
    const refreshed = await refreshAccessToken();
    if (!refreshed) {
      clearPersistedTokens();
      return null;
    }
    // Re-schedule proactive refresh with the new expiry
    const newExpiryStr = loadPersistedToken("expiry");
    const newExpiry = newExpiryStr ? Number(newExpiryStr) : 0;
    scheduleTokenRefresh(newExpiry - Date.now());
    return refreshed;
  }

  // Ensure proactive refresh is scheduled (e.g. after app restart)
  if (!refreshTimer) {
    scheduleTokenRefresh(expiry - Date.now());
  }

  return token;
});

app.on("ready", () => {
  cleanupStaleTmpFiles();
  buildAppMenu();
  createWindow();

  // Create persistent overlay window (invisible, click-through until activated)
  initOverlayWindow();

  // Register global capture hotkey
  const settings = loadSettings();
  registerHotkey(settings.hotkey);

  // Process any deep link that arrived before the app was ready
  if (pendingDeepLinkUrl) {
    handleDeepLink(pendingDeepLinkUrl);
    pendingDeepLinkUrl = null;
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on("will-quit", () => {
  globalShortcut.unregisterAll();
  cleanupTmpFile();
});
