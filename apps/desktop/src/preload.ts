import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electronAPI", {
  onAuthToken: (callback: (token: string) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, token: string) =>
      callback(token);
    ipcRenderer.on("auth:token", listener);
    return () => {
      ipcRenderer.removeListener("auth:token", listener);
    };
  },
  openExternal: (url: string) => {
    ipcRenderer.send("open-external", url);
  },
  onRequestAuthToken: (callback: () => Promise<string | null>) => {
    const listener = async () => {
      const token = await callback();
      ipcRenderer.send("auth:token-response", token);
    };
    ipcRenderer.on("auth:request-token", listener);
    return () => {
      ipcRenderer.removeListener("auth:request-token", listener);
    };
  },
  onCaptureComplete: (callback: () => void) => {
    const listener = () => callback();
    ipcRenderer.on("capture:complete", listener);
    return () => {
      ipcRenderer.removeListener("capture:complete", listener);
    };
  },
});
