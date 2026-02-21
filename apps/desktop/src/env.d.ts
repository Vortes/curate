/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CLERK_PUBLISHABLE_KEY: string;
  readonly VITE_WEB_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface ElectronAPI {
  onAuthToken: (callback: (token: string) => void) => () => void;
  openExternal: (url: string) => void;
  onRequestAuthToken: (
    callback: () => Promise<string | null>
  ) => () => void;
  onCaptureComplete: (callback: () => void) => () => void;
}

interface Window {
  electronAPI: ElectronAPI;
}
