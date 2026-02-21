import { BrowserWindow, screen } from "electron";

interface ThumbnailEntry {
  window: BrowserWindow;
  timer: ReturnType<typeof setTimeout>;
}

const thumbnails: ThumbnailEntry[] = [];
const THUMBNAIL_WIDTH = 200;
const THUMBNAIL_HEIGHT = 140;
const MARGIN = 16;
const MAX_VISIBLE = 3;
const AUTO_DISMISS_MS = 5000;

function positionThumbnails() {
  const display = screen.getPrimaryDisplay();
  const { width: screenW, height: screenH } = display.workAreaSize;

  thumbnails.forEach((entry, index) => {
    if (entry.window.isDestroyed()) return;
    const x = screenW - THUMBNAIL_WIDTH - MARGIN;
    const y =
      screenH - (index + 1) * (THUMBNAIL_HEIGHT + MARGIN);
    entry.window.setPosition(x, y);
  });
}

function removeThumbnail(entry: ThumbnailEntry) {
  clearTimeout(entry.timer);
  const idx = thumbnails.indexOf(entry);
  if (idx !== -1) thumbnails.splice(idx, 1);
  if (!entry.window.isDestroyed()) entry.window.close();
  positionThumbnails();
}

export function showThumbnail(imageDataUrl: string) {
  // Evict oldest if at max
  while (thumbnails.length >= MAX_VISIBLE) {
    const oldest = thumbnails.shift();
    if (oldest) {
      clearTimeout(oldest.timer);
      if (!oldest.window.isDestroyed()) oldest.window.close();
    }
  }

  const display = screen.getPrimaryDisplay();
  const { width: screenW, height: screenH } = display.workAreaSize;

  const win = new BrowserWindow({
    width: THUMBNAIL_WIDTH,
    height: THUMBNAIL_HEIGHT,
    x: screenW - THUMBNAIL_WIDTH - MARGIN,
    y: screenH - THUMBNAIL_HEIGHT - MARGIN,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    focusable: false,
    hasShadow: true,
    transparent: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          background: transparent;
          font-family: -apple-system, sans-serif;
          overflow: hidden;
        }
        .container {
          width: ${THUMBNAIL_WIDTH}px;
          height: ${THUMBNAIL_HEIGHT}px;
          border-radius: 10px;
          overflow: hidden;
          position: relative;
          background: #1a1a1a;
          border: 1px solid rgba(255,255,255,0.1);
          box-shadow: 0 8px 32px rgba(0,0,0,0.4);
        }
        img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .badge {
          position: absolute;
          top: 6px;
          left: 8px;
          background: rgba(0,0,0,0.6);
          color: #4ade80;
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 500;
          backdrop-filter: blur(4px);
        }
      </style>
    </head>
    <body>
      <div class="container">
        <img src="${imageDataUrl}" />
        <div class="badge">Captured</div>
      </div>
    </body>
    </html>
  `;

  win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);

  const entry: ThumbnailEntry = {
    window: win,
    timer: setTimeout(() => removeThumbnail(entry), AUTO_DISMISS_MS),
  };

  thumbnails.push(entry);
  positionThumbnails();
}
