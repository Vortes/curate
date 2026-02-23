import { execFile } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";

// AppleScript commands for Chromium-based and Safari browsers.
// Keys must exactly match the app name returned by CGWindowListCopyWindowInfo.
const BROWSER_SCRIPTS: Record<string, string> = {
  "Google Chrome":
    'tell application "Google Chrome" to get URL of active tab of front window',
  "Google Chrome Canary":
    'tell application "Google Chrome Canary" to get URL of active tab of front window',
  "Brave Browser":
    'tell application "Brave Browser" to get URL of active tab of front window',
  "Microsoft Edge":
    'tell application "Microsoft Edge" to get URL of active tab of front window',
  Arc: 'tell application "Arc" to get URL of active tab of front window',
  Safari: 'tell application "Safari" to get URL of front document',
  "Safari Technology Preview":
    'tell application "Safari Technology Preview" to get URL of front document',
};

// Lowercase process names for Firefox-based browsers.
const FIREFOX_BASED_NAMES = new Set([
  "firefox",
  "zen",
  "waterfox",
  "librewolf",
]);

// Map from lowercase process name to Application Support directory name
const FIREFOX_PROFILE_DIRS: Record<string, string> = {
  firefox: "Firefox",
  zen: "zen",
  waterfox: "Waterfox",
  librewolf: "LibreWolf",
};

function runOsascript(script: string): Promise<string | null> {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => resolve(null), 2000);

    const tmpFile = path.join(
      os.tmpdir(),
      `synthesis-osascript-${Date.now()}.scpt`,
    );
    fs.writeFileSync(tmpFile, script, "utf-8");

    execFile("osascript", [tmpFile], (error, stdout) => {
      clearTimeout(timeout);
      try {
        fs.unlinkSync(tmpFile);
      } catch {}
      if (error) {
        resolve(null);
        return;
      }
      resolve(stdout);
    });
  });
}

function validateUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (trimmed.length === 0) return null;
  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("file://")
  ) {
    return trimmed;
  }
  // Some browsers show bare domains without the protocol
  if (/^[a-zA-Z0-9][\w.-]+\.[a-zA-Z]{2,}(\/.*)?$/.test(trimmed)) {
    return `https://${trimmed}`;
  }
  return null;
}

// --- LZ4 block decompressor (pure Node, no dependencies) ---
// Handles the subset of LZ4 that Firefox uses in jsonlz4 files.
function decompressLz4Block(input: Buffer, uncompressedSize: number): Buffer {
  const output = Buffer.alloc(uncompressedSize);
  let ip = 0;
  let op = 0;

  while (ip < input.length) {
    const token = input[ip++]!;
    let literalLen = token >>> 4;

    if (literalLen === 15) {
      let b: number;
      do {
        b = input[ip++]!;
        literalLen += b;
      } while (b === 255);
    }

    input.copy(output, op, ip, ip + literalLen);
    ip += literalLen;
    op += literalLen;

    if (ip >= input.length) break;

    const offset = input[ip++]! | (input[ip++]! << 8);
    let matchLen = (token & 0x0f) + 4;

    if (matchLen === 19) {
      let b: number;
      do {
        b = input[ip++]!;
        matchLen += b;
      } while (b === 255);
    }

    let matchPos = op - offset;
    for (let i = 0; i < matchLen; i++) {
      output[op++] = output[matchPos++]!;
    }
  }

  return output;
}

/**
 * Read the active tab URL from a Firefox/Zen session recovery file.
 * These browsers write session state to a compressed jsonlz4 file every ~15s.
 *
 * jsonlz4 format: 8-byte magic ("mozLz40\0") + 4-byte LE size + lz4 block data
 */
function getFirefoxSessionUrl(browserName: string): string | null {
  const appDir = FIREFOX_PROFILE_DIRS[browserName];
  if (!appDir) return null;

  const profilesDir = path.join(
    os.homedir(),
    "Library",
    "Application Support",
    appDir,
    "Profiles",
  );

  let profiles: string[];
  try {
    profiles = fs.readdirSync(profilesDir);
  } catch {
    return null;
  }

  for (const profile of profiles) {
    const recoveryPath = path.join(
      profilesDir,
      profile,
      "sessionstore-backups",
      "recovery.jsonlz4",
    );

    try {
      if (!fs.existsSync(recoveryPath)) continue;

      const buf = fs.readFileSync(recoveryPath);
      const magic = buf.slice(0, 8).toString();
      if (!magic.startsWith("mozLz40")) continue;

      const uncompressedSize = buf.readUInt32LE(8);
      const compressed = buf.slice(12);
      const decompressed = decompressLz4Block(compressed, uncompressedSize);
      const session = JSON.parse(decompressed.toString("utf-8"));

      const windows = session.windows;
      if (!windows?.length) continue;

      const selWinIdx = Math.max(
        0,
        Math.min((session.selectedWindow || 1) - 1, windows.length - 1),
      );
      const win = windows[selWinIdx];
      const tabs = win.tabs;
      if (!tabs?.length) continue;

      const selTabIdx = Math.max(
        0,
        Math.min((win.selected || 1) - 1, tabs.length - 1),
      );
      const tab = tabs[selTabIdx];
      const entries = tab.entries;
      if (!entries?.length) continue;

      const url = entries[entries.length - 1].url;
      if (url && typeof url === "string") {
        return url;
      }
    } catch {
      continue;
    }
  }

  return null;
}

/** Returns true if the given app name is a known browser. */
export function isBrowser(appName: string): boolean {
  return (
    appName in BROWSER_SCRIPTS ||
    FIREFOX_BASED_NAMES.has(appName.toLowerCase())
  );
}

export async function getBrowserUrl(
  appName: string,
): Promise<string | null> {
  // 1. Chromium-based / Safari — use native AppleScript (reliable)
  const chromiumScript = BROWSER_SCRIPTS[appName];
  if (chromiumScript !== undefined) {
    const raw = await runOsascript(chromiumScript);
    if (raw === null) return null;
    return validateUrl(raw);
  }

  // 2. Firefox-based browsers — read session recovery file (reliable,
  //    may be up to ~15s stale). The Accessibility API approach doesn't
  //    work from Electron's process context, so we skip it entirely.
  if (FIREFOX_BASED_NAMES.has(appName.toLowerCase())) {
    const url = getFirefoxSessionUrl(appName.toLowerCase());
    if (url) {
      console.log("[browserUrl] Got URL from session file:", url);
      return validateUrl(url) ?? url;
    }
    console.log("[browserUrl] Session file fallback failed for", appName);
    return null;
  }

  // 3. Not a known browser.
  return null;
}
