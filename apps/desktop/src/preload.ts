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
});
