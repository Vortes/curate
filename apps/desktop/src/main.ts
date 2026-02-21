import {
  app,
  BrowserWindow,
  globalShortcut,
  ipcMain,
  Menu,
  shell,
} from "electron";
import path from "node:path";
import {
  cleanupStaleTmpFiles,
  cleanupTmpFile,
  initCaptureManager,
  startCapture,
} from "./capture/captureManager";
import { initOverlayWindow } from "./capture/overlayWindow";
import { loadSettings, showPreferences } from "./capture/preferences";

const PROTOCOL = "synthesis";

let mainWindow: BrowserWindow | null = null;
let pendingAuthToken: string | null = null;
let currentHotkey: string | null = null;

// Register deep link protocol
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

// macOS: single instance lock
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on("second-instance", (_event, argv) => {
    // Windows/Linux: deep link URL is in argv
    const url = argv.find((arg) => arg.startsWith(`${PROTOCOL}://`));
    if (url) handleDeepLink(url);
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

function handleDeepLink(url: string) {
  try {
    const parsed = new URL(url);
    if (parsed.hostname === "auth") {
      const token = parsed.searchParams.get("token");
      if (token) {
        if (mainWindow) {
          mainWindow.webContents.send("auth:token", token);
          mainWindow.focus();
        } else {
          pendingAuthToken = token;
        }
      }
    }
  } catch {
    // Ignore malformed URLs
  }
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

// IPC: open external URL (only allow https)
ipcMain.on("open-external", (_event, url: string) => {
  if (typeof url === "string" && url.startsWith("https://")) {
    shell.openExternal(url);
  } else if (typeof url === "string" && url.startsWith("http://localhost")) {
    shell.openExternal(url);
  }
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
