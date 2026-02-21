import { BrowserWindow, ipcMain, nativeImage, screen } from "electron";
import { execFile, type ChildProcess } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  activateOverlay,
  deactivateOverlay,
  isOverlayActive,
  setOverlayScreenshot,
} from "./overlayWindow";
import { uploadCapture } from "./uploader";
import { showThumbnail } from "./thumbnailManager";

let mainWindow: BrowserWindow | null = null;
let capturedScreenshot: Electron.NativeImage | null = null;
let tmpScreenshotPath: string | null = null;
let isCaptureInProgress = false;
let activeScreencapture: ChildProcess | null = null;

export function cleanupTmpFile() {
  if (tmpScreenshotPath) {
    try {
      fs.unlinkSync(tmpScreenshotPath);
    } catch {
      // file may already be gone
    }
    tmpScreenshotPath = null;
  }
}

export function cleanupStaleTmpFiles() {
  try {
    const tmpDir = os.tmpdir();
    const files = fs.readdirSync(tmpDir);
    for (const file of files) {
      if (file.startsWith("synthesis-capture-") && file.endsWith(".png")) {
        try {
          fs.unlinkSync(path.join(tmpDir, file));
        } catch {
          // ignore individual failures
        }
      }
    }
  } catch {
    // tmpdir read failed, not critical
  }
}

export function initCaptureManager(win: BrowserWindow) {
  mainWindow = win;

  ipcMain.on(
    "capture:region-selected",
    async (
      _event,
      rect: { x: number; y: number; width: number; height: number }
    ) => {
      deactivateOverlay();
      await handleRegionSelected(rect);
    }
  );

  ipcMain.on("capture:cancel", () => {
    if (activeScreencapture) {
      activeScreencapture.kill();
      activeScreencapture = null;
    }
    deactivateOverlay();
    capturedScreenshot = null;
    isCaptureInProgress = false;
    cleanupTmpFile();
  });

  ipcMain.on("auth:token-response", (_event, token: string | null) => {
    pendingTokenResolve?.(token);
    pendingTokenResolve = null;
  });
}

let pendingTokenResolve: ((token: string | null) => void) | null = null;

function requestAuthToken(): Promise<string | null> {
  return new Promise((resolve) => {
    if (!mainWindow || mainWindow.isDestroyed()) {
      resolve(null);
      return;
    }
    pendingTokenResolve = resolve;
    mainWindow.webContents.send("auth:request-token");

    // Timeout after 10s
    setTimeout(() => {
      if (pendingTokenResolve) {
        pendingTokenResolve(null);
        pendingTokenResolve = null;
      }
    }, 10000);
  });
}

export async function startCapture() {
  if (isCaptureInProgress || isOverlayActive()) return;

  isCaptureInProgress = true;

  // Show overlay immediately — transparent canvas with CSS crosshair
  activateOverlay();

  try {
    tmpScreenshotPath = path.join(
      os.tmpdir(),
      `synthesis-capture-${Date.now()}.png`
    );

    await new Promise<void>((resolve, reject) => {
      activeScreencapture = execFile(
        "screencapture",
        ["-x", "-t", "png", tmpScreenshotPath!],
        (err) => {
          activeScreencapture = null;
          if (err) reject(err);
          else resolve();
        }
      );
    });

    // If overlay was dismissed (Escape) while screencapture was running, bail out
    if (!isOverlayActive()) {
      isCaptureInProgress = false;
      cleanupTmpFile();
      return;
    }

    const buffer = fs.readFileSync(tmpScreenshotPath);
    capturedScreenshot = nativeImage.createFromBuffer(buffer);
    const size = capturedScreenshot.getSize();

    if (size.width === 0 || size.height === 0) {
      console.error(
        "[capture] Empty screenshot — check Screen Recording permission in System Settings > Privacy & Security"
      );
      deactivateOverlay();
      isCaptureInProgress = false;
      cleanupTmpFile();
      return;
    }

    // Send screenshot to overlay — it swaps from CSS crosshair to custom drawn crosshair
    setOverlayScreenshot(tmpScreenshotPath);
  } catch (err) {
    console.error("[capture] Failed to start capture:", err);
    deactivateOverlay();
    isCaptureInProgress = false;
    cleanupTmpFile();
  }
}

async function handleRegionSelected(rect: {
  x: number;
  y: number;
  width: number;
  height: number;
}) {
  if (!capturedScreenshot) return;

  try {
    const scaleFactor = screen.getPrimaryDisplay().scaleFactor;
    const cropRect = {
      x: Math.round(rect.x * scaleFactor),
      y: Math.round(rect.y * scaleFactor),
      width: Math.round(rect.width * scaleFactor),
      height: Math.round(rect.height * scaleFactor),
    };

    const cropped = capturedScreenshot.crop(cropRect);
    const pngBuffer = cropped.toPNG();

    showThumbnail(cropped.toDataURL());

    const token = await requestAuthToken();
    if (!token) {
      console.error("[capture] No auth token available");
      return;
    }

    const result = await uploadCapture(pngBuffer, token);
    if (result) {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send("capture:complete");
      }
    }
  } catch (err) {
    console.error("[capture] Region handling failed:", err);
  } finally {
    capturedScreenshot = null;
    isCaptureInProgress = false;
    cleanupTmpFile();
  }
}
