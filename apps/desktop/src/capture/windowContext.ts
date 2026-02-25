import { execFile } from "child_process";
import path from "path";
import { app } from "electron";
import { getBrowserUrl, isBrowser } from "./browserUrl";
import { readAxBrowserUrl } from "./axUrlReader";

export interface WindowContext {
  sourceApp: string | null;
  sourceUrl: string | null;
}

const NULL_CONTEXT: WindowContext = { sourceApp: null, sourceUrl: null };

/** Handle bare domains (e.g. "console.neon.tech") that lack a protocol prefix. */
function validateBareUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (trimmed.length === 0) return null;
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://") || trimmed.startsWith("file://")) {
    return trimmed;
  }
  if (/^[a-zA-Z0-9][\w.-]*\.[a-zA-Z]{2,}(\/.*)?$/.test(trimmed)) {
    return `https://${trimmed}`;
  }
  return null;
}

// Bundle IDs for Firefox-based browsers (used to decide AX addon vs AppleScript)
const FIREFOX_BUNDLE_IDS = new Set([
  "org.mozilla.firefox",
  "org.mozilla.firefoxdeveloperedition",
  "app.zen-browser.zen",
  "net.waterfox.waterfox",
  "io.gitlab.librewolf-community",
]);

interface SwiftWindowInfo {
  appName: string | null;
  bundleId: string | null;
  windowTitle: string | null;
  pid: number | null;
  browserUrl?: string | null;
}

function getSwiftBinaryPath(): string {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, "window-info");
  }
  return path.join(app.getAppPath(), "swift-helpers/window-info");
}

function runSwiftBinary(
  binaryPath: string,
  rect: { x: number; y: number; width: number; height: number }
): Promise<SwiftWindowInfo> {
  return new Promise((resolve, reject) => {
    const args = [
      String(rect.x),
      String(rect.y),
      String(rect.width),
      String(rect.height),
    ];

    execFile(binaryPath, args, (error, stdout, stderr) => {
      if (stderr) {
        console.log("[windowContext] Swift stderr:", stderr);
      }
      if (error) {
        reject(error);
        return;
      }
      try {
        const parsed = JSON.parse(stdout) as SwiftWindowInfo;
        resolve(parsed);
      } catch (parseError) {
        reject(parseError);
      }
    });
  });
}

export async function resolveWindowContext(
  selectedRect: { x: number; y: number; width: number; height: number }
): Promise<WindowContext> {
  const timeoutPromise = new Promise<WindowContext>((resolve) => {
    setTimeout(() => resolve(NULL_CONTEXT), 3000);
  });

  const resolutionPromise = (async (): Promise<WindowContext> => {
    try {
      console.log("[windowContext] Selected rect:", JSON.stringify(selectedRect));
      const binaryPath = getSwiftBinaryPath();
      const windowInfo = await runSwiftBinary(binaryPath, selectedRect);

      console.log("[windowContext] Swift binary returned:", JSON.stringify(windowInfo));
      const appName = windowInfo.appName ?? null;
      if (appName === null) {
        return NULL_CONTEXT;
      }

      let sourceUrl: string | null = null;

      // For Firefox-based browsers, use the native AX addon (runs in-process,
      // so it has Electron's TCC accessibility permission).
      // Falls back to session file if the addon fails.
      if (windowInfo.bundleId && FIREFOX_BUNDLE_IDS.has(windowInfo.bundleId) && windowInfo.pid) {
        console.log("[windowContext] Firefox-based browser detected, trying native AX addon...");
        const axUrl = readAxBrowserUrl(windowInfo.pid, windowInfo.windowTitle ?? undefined);
        if (axUrl) {
          console.log("[windowContext] Got URL from native AX addon:", axUrl);
          sourceUrl = validateBareUrl(axUrl);
        } else {
          console.log("[windowContext] AX addon returned null, falling back to session file...");
          sourceUrl = await getBrowserUrl(appName, windowInfo.windowTitle ?? undefined);
        }
      } else {
        // Chromium/Safari — use AppleScript via getBrowserUrl
        sourceUrl = await getBrowserUrl(appName, windowInfo.windowTitle ?? undefined);
      }

      console.log("[windowContext] sourceUrl result:", sourceUrl);

      // For browsers with a resolved URL, derive sourceApp from the domain.
      // Takes the second-to-last part as the product name — this is the
      // registrable domain name and works for virtually all SaaS products:
      //   x.com → x, console.neon.tech → neon, app.linear.app → linear,
      //   www.figma.com → figma, mail.google.com → google
      let sourceApp = appName;
      if (isBrowser(appName) && sourceUrl) {
        try {
          const hostname = new URL(sourceUrl).hostname;
          const parts = hostname.split(".");
          if (parts.length >= 2) {
            sourceApp = parts[parts.length - 2]!;
          }
        } catch {
          // URL parsing failed — keep appName
        }
      }

      return { sourceApp, sourceUrl };
    } catch {
      return NULL_CONTEXT;
    }
  })();

  return Promise.race([resolutionPromise, timeoutPromise]);
}
