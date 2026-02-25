import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electronAPI", {
  // ── Auth ────────────────────────────────────────────────────────────
  /** Open system browser to Clerk sign-in (RFC 8252 flow) */
  signIn: () => ipcRenderer.send("auth:sign-in"),

  /** Clear persisted JWT and sign out */
  signOut: () => ipcRenderer.send("auth:sign-out"),

  /** Get the current persisted JWT (null if signed out) */
  getToken: (): Promise<string | null> => ipcRenderer.invoke("auth:get-token"),

  /** Listen for fresh JWT delivered after deep-link ticket exchange */
  onAuthToken: (callback: (token: string) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, token: string) =>
      callback(token);
    ipcRenderer.on("auth:token", listener);
    return () => {
      ipcRenderer.removeListener("auth:token", listener);
    };
  },

  // ── General ─────────────────────────────────────────────────────────
  openExternal: (url: string) => {
    ipcRenderer.send("open-external", url);
  },

  onCaptureComplete: (callback: () => void) => {
    const listener = () => callback();
    ipcRenderer.on("capture:complete", listener);
    return () => {
      ipcRenderer.removeListener("capture:complete", listener);
    };
  },
});
