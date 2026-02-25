/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_WEB_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface ElectronAPI {
  signIn: () => void;
  signOut: () => void;
  getToken: () => Promise<string | null>;
  onAuthToken: (callback: (token: string) => void) => () => void;
  openExternal: (url: string) => void;
  onCaptureComplete: (callback: () => void) => () => void;
}

interface Window {
  electronAPI: ElectronAPI;
}
