import { execFile } from "child_process";
import path from "path";
import { app } from "electron";
import { getBrowserUrl, isBrowser } from "./browserUrl";

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
  if (/^[a-zA-Z0-9][\w.-]+\.[a-zA-Z]{2,}(\/.*)?$/.test(trimmed)) {
    return `https://${trimmed}`;
  }
  return null;
}

interface SwiftWindowInfo {
  appName: string | null;
  bundleId: string | null;
  windowTitle: string | null;
  browserUrl?: string | null;
}

function getSwiftBinaryPath(): string {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, "swift-helpers/window-info");
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

    execFile(binaryPath, args, (error, stdout) => {
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

      // For Firefox-based browsers, the Swift binary reads the URL bar
      // directly via the Accessibility API (osascript can't do this from
      // Electron's process context). For Chromium/Safari, use AppleScript.
      const sourceUrl = windowInfo.browserUrl
        ? validateBareUrl(windowInfo.browserUrl)
        : await getBrowserUrl(appName);
      console.log("[windowContext] sourceUrl result:", sourceUrl);

      // For browsers, use the window title (page title) instead of the
      // browser app name. Some browsers append their name to the title
      // (e.g. "Page Title - Google Chrome"), others don't (e.g. Zen just
      // shows "Page Title"). Strip common suffixes if present.
      let sourceApp = appName;
      if (isBrowser(appName) && windowInfo.windowTitle) {
        const cleaned = windowInfo.windowTitle
          .replace(/\s*[—–\-|]\s*(Zen Browser|Zen|Firefox|Google Chrome|Chrome|Brave Browser|Microsoft Edge|Arc|Safari|Waterfox|LibreWolf)\s*$/i, "")
          .trim();
        if (cleaned.length > 0) {
          sourceApp = cleaned;
        }
      }

      return { sourceApp, sourceUrl };
    } catch {
      return NULL_CONTEXT;
    }
  })();

  return Promise.race([resolutionPromise, timeoutPromise]);
}
