import { BrowserWindow, ipcMain, screen } from "electron";
import path from "node:path";

let overlayWindow: BrowserWindow | null = null;
let pendingScreenshot: string | null = null;
let isActive = false;

function getOverlayHTML(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; overflow: hidden; background: transparent; cursor: crosshair; }
    canvas { position: absolute; top: 0; left: 0; width: 100%; height: 100%; cursor: crosshair; }
  </style>
</head>
<body>
  <canvas id="overlay-canvas"></canvas>
  <script>
    const canvas = document.getElementById("overlay-canvas");
    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;

    let screenshotImage = null;
    let screenshotReady = false;
    let isDrawing = false;
    let startX = 0, startY = 0, currentX = 0, currentY = 0;
    let mouseX = -1, mouseY = -1;

    function resizeCanvas() {
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = w + "px";
      canvas.style.height = h + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw();
    }

    function draw() {
      const w = window.innerWidth;
      const h = window.innerHeight;
      ctx.clearRect(0, 0, w, h);

      if (!screenshotReady || !screenshotImage) return;

      ctx.drawImage(screenshotImage, 0, 0, w, h);

      if (isDrawing) {
        const x = Math.min(startX, currentX);
        const y = Math.min(startY, currentY);
        const sw = Math.abs(currentX - startX);
        const sh = Math.abs(currentY - startY);

        // Dim everything outside the selection
        ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
        ctx.fillRect(0, 0, w, y);
        ctx.fillRect(0, y + sh, w, h - y - sh);
        ctx.fillRect(0, y, x, sh);
        ctx.fillRect(x + sw, y, w - x - sw, sh);

        // Selection border
        ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, sw, sh);

        // Dimensions label
        if (sw > 30 && sh > 15) {
          const label = Math.round(sw) + " x " + Math.round(sh);
          ctx.font = "11px -apple-system, BlinkMacSystemFont, sans-serif";
          const metrics = ctx.measureText(label);
          const lx = x + sw / 2 - metrics.width / 2 - 6;
          const ly = y + sh + 8;
          ctx.fillStyle = "rgba(0, 0, 0, 0.65)";
          ctx.beginPath();
          ctx.roundRect(lx, ly, metrics.width + 12, 20, 4);
          ctx.fill();
          ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
          ctx.fillText(label, lx + 6, ly + 14);
        }
      }

      drawCrosshair();
    }

    function drawCrosshair() {
      if (mouseX < 0) return;
      const gap = 4;
      const len = 14;

      ctx.save();
      // Dark shadow for contrast on light backgrounds
      ctx.strokeStyle = "rgba(0, 0, 0, 0.4)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(mouseX - len, mouseY); ctx.lineTo(mouseX - gap, mouseY);
      ctx.moveTo(mouseX + gap, mouseY); ctx.lineTo(mouseX + len, mouseY);
      ctx.moveTo(mouseX, mouseY - len); ctx.lineTo(mouseX, mouseY - gap);
      ctx.moveTo(mouseX, mouseY + gap); ctx.lineTo(mouseX, mouseY + len);
      ctx.stroke();

      // White crosshair on top
      ctx.strokeStyle = "rgba(255, 255, 255, 0.95)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(mouseX - len, mouseY); ctx.lineTo(mouseX - gap, mouseY);
      ctx.moveTo(mouseX + gap, mouseY); ctx.lineTo(mouseX + len, mouseY);
      ctx.moveTo(mouseX, mouseY - len); ctx.lineTo(mouseX, mouseY - gap);
      ctx.moveTo(mouseX, mouseY + gap); ctx.lineTo(mouseX, mouseY + len);
      ctx.stroke();
      ctx.restore();
    }

    window.electronAPI.onActivate(function() {
      screenshotImage = null;
      screenshotReady = false;
      isDrawing = false;
      mouseX = -1; mouseY = -1;
      canvas.style.cursor = "crosshair";
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    });

    window.electronAPI.onScreenshot(function(filePath, cursorX, cursorY) {
      screenshotImage = new Image();
      screenshotImage.onload = function() {
        screenshotReady = true;
        canvas.style.cursor = "none";
        if (cursorX != null && cursorY != null) {
          mouseX = cursorX;
          mouseY = cursorY;
        }
        resizeCanvas();
        window.electronAPI.screenshotReady();
      };
      screenshotImage.src = "file://" + filePath;
    });

    window.electronAPI.onClear(function() {
      screenshotImage = null;
      screenshotReady = false;
      isDrawing = false;
      mouseX = -1; mouseY = -1;
      canvas.style.cursor = "crosshair";
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    });

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    canvas.addEventListener("mousedown", function(e) {
      if (!screenshotReady) return;
      isDrawing = true;
      startX = e.clientX; startY = e.clientY;
      currentX = e.clientX; currentY = e.clientY;
    });

    canvas.addEventListener("mousemove", function(e) {
      mouseX = e.clientX; mouseY = e.clientY;
      if (isDrawing) {
        currentX = e.clientX; currentY = e.clientY;
      }
      if (screenshotReady) draw();
    });

    canvas.addEventListener("mouseleave", function() {
      mouseX = -1; mouseY = -1;
      draw();
    });

    canvas.addEventListener("mouseup", function(e) {
      if (!isDrawing) return;
      isDrawing = false;
      currentX = e.clientX; currentY = e.clientY;

      const x = Math.min(startX, currentX);
      const y = Math.min(startY, currentY);
      const width = Math.abs(currentX - startX);
      const height = Math.abs(currentY - startY);

      if (width < 10 || height < 10) return;
      window.electronAPI.sendCaptureRegion({ x: x, y: y, width: width, height: height });
    });

    document.addEventListener("keydown", function(e) {
      if (e.key === "Escape") {
        window.electronAPI.cancelCapture();
      }
    });
  </script>
</body>
</html>`;
}

/**
 * Create the persistent overlay window once at app startup.
 * It stays alive but invisible and click-through until activated.
 */
export function initOverlayWindow() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { x, y, width, height } = primaryDisplay.bounds;

  overlayWindow = new BrowserWindow({
    x,
    y,
    width,
    height,
    show: true,
    frame: false,
    transparent: true,
    backgroundColor: "#00000000",
    skipTaskbar: true,
    resizable: false,
    movable: false,
    hasShadow: false,
    focusable: true,
    fullscreenable: false,
    enableLargerThanScreen: true,
    webPreferences: {
      preload: path.join(__dirname, "overlay-preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false,
      webSecurity: false, // allow file:// image loads from data: origin overlay
    },
  });

  // Start invisible and click-through
  overlayWindow.setOpacity(0);
  overlayWindow.setIgnoreMouseEvents(true);
  overlayWindow.setAlwaysOnTop(true, "screen-saver");
  overlayWindow.setVisibleOnAllWorkspaces(true, {
    visibleOnFullScreen: true,
  });

  const html = getOverlayHTML();
  overlayWindow.loadURL(
    `data:text/html;charset=utf-8,${encodeURIComponent(html)}`
  );

  // Update bounds when display changes
  const updateBounds = () => {
    if (!overlayWindow || overlayWindow.isDestroyed()) return;
    const display = screen.getPrimaryDisplay();
    overlayWindow.setBounds(display.bounds);
  };
  screen.on("display-metrics-changed", updateBounds);
}

/**
 * Activate the overlay immediately — transparent canvas with CSS crosshair.
 * The user sees their desktop through the overlay with a crosshair cursor.
 * Call setOverlayScreenshot() after to load the actual screenshot.
 */
export function activateOverlay() {
  if (!overlayWindow || overlayWindow.isDestroyed()) return;
  if (isActive) return;

  isActive = true;
  overlayWindow.webContents.send("overlay:activate");
  overlayWindow.setIgnoreMouseEvents(false);
  overlayWindow.setOpacity(1);
  overlayWindow.focus();
}

/**
 * Send the screenshot file path to the overlay renderer.
 * It loads via file:// and switches from CSS crosshair to custom drawn crosshair.
 */
export function setOverlayScreenshot(screenshotPath: string) {
  if (!overlayWindow || overlayWindow.isDestroyed()) return;

  pendingScreenshot = screenshotPath;
  const cursor = screen.getCursorScreenPoint();
  const bounds = overlayWindow.getBounds();
  const cursorX = cursor.x - bounds.x;
  const cursorY = cursor.y - bounds.y;
  overlayWindow.webContents.send("overlay:screenshot", screenshotPath, cursorX, cursorY);
}

/**
 * Deactivate the overlay — instant, no flash.
 */
export function deactivateOverlay() {
  if (!overlayWindow || overlayWindow.isDestroyed()) return;

  isActive = false;
  pendingScreenshot = null;
  overlayWindow.setOpacity(0);
  overlayWindow.setIgnoreMouseEvents(true);
  overlayWindow.webContents.send("overlay:clear");
}

// Screenshot is drawn on canvas — overlay is already visible, just acknowledge
ipcMain.on("overlay:screenshot-ready", () => {});

export function isOverlayActive(): boolean {
  return isActive;
}
