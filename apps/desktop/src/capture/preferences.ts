import { app, BrowserWindow } from "electron";
import fs from "node:fs";
import path from "node:path";

export interface Settings {
  hotkey: string;
}

const DEFAULTS: Settings = {
  hotkey: "CommandOrControl+Shift+S",
};

function getSettingsPath(): string {
  return path.join(app.getPath("userData"), "settings.json");
}

export function loadSettings(): Settings {
  try {
    const raw = fs.readFileSync(getSettingsPath(), "utf-8");
    const parsed = JSON.parse(raw);
    return { ...DEFAULTS, ...parsed };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveSettings(settings: Partial<Settings>): Settings {
  const current = loadSettings();
  const merged = { ...current, ...settings };
  fs.writeFileSync(getSettingsPath(), JSON.stringify(merged, null, 2));
  return merged;
}

let prefsWindow: BrowserWindow | null = null;

export function showPreferences(
  onHotkeyChanged: (newHotkey: string) => void
) {
  if (prefsWindow && !prefsWindow.isDestroyed()) {
    prefsWindow.focus();
    return;
  }

  const settings = loadSettings();

  prefsWindow = new BrowserWindow({
    width: 400,
    height: 200,
    title: "Preferences",
    resizable: false,
    minimizable: false,
    maximizable: false,
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
          font-family: -apple-system, BlinkMacSystemFont, sans-serif;
          background: #1a1a1a;
          color: #e5e5e5;
          padding: 24px;
          -webkit-app-region: no-drag;
        }
        h2 { font-size: 15px; font-weight: 600; margin-bottom: 16px; }
        label { font-size: 13px; color: #a3a3a3; display: block; margin-bottom: 6px; }
        input {
          width: 100%;
          padding: 8px 12px;
          background: #262626;
          border: 1px solid #404040;
          border-radius: 6px;
          color: #e5e5e5;
          font-size: 13px;
          outline: none;
        }
        input:focus { border-color: #7c3aed; }
        .hint { font-size: 11px; color: #737373; margin-top: 4px; }
        .actions { margin-top: 20px; display: flex; justify-content: flex-end; gap: 8px; }
        button {
          padding: 6px 16px;
          border-radius: 6px;
          font-size: 13px;
          cursor: pointer;
          border: none;
        }
        .cancel { background: #333; color: #e5e5e5; }
        .save { background: #7c3aed; color: white; font-weight: 500; }
        .save:hover { background: #6d28d9; }
      </style>
    </head>
    <body>
      <h2>Capture Settings</h2>
      <label for="hotkey">Global Capture Hotkey</label>
      <input id="hotkey" type="text" value="${settings.hotkey}" />
      <div class="hint">e.g. CommandOrControl+Shift+S</div>
      <div class="actions">
        <button class="cancel" onclick="window.close()">Cancel</button>
        <button class="save" onclick="save()">Save</button>
      </div>
      <script>
        function save() {
          const hotkey = document.getElementById('hotkey').value.trim();
          if (hotkey) {
            // Post message to be caught by main process
            document.title = 'SAVE:' + hotkey;
          }
        }
      </script>
    </body>
    </html>
  `;

  prefsWindow.loadURL(
    `data:text/html;charset=utf-8,${encodeURIComponent(html)}`
  );

  // Watch for title change as communication channel
  prefsWindow.on("page-title-updated", (event, title) => {
    event.preventDefault();
    if (title.startsWith("SAVE:")) {
      const newHotkey = title.slice(5);
      saveSettings({ hotkey: newHotkey });
      onHotkeyChanged(newHotkey);
      if (prefsWindow && !prefsWindow.isDestroyed()) {
        prefsWindow.close();
      }
    }
  });

  prefsWindow.on("closed", () => {
    prefsWindow = null;
  });
}
