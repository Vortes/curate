import { app, safeStorage } from "electron";
import fs from "node:fs";
import path from "node:path";

export type TokenKind = "access" | "refresh" | "expiry";

export function tokenPath(kind: TokenKind): string {
  return path.join(app.getPath("userData"), `curate_${kind}_token.enc`);
}

export function persistToken(kind: TokenKind, value: string) {
  try {
    if (!safeStorage.isEncryptionAvailable()) {
      console.warn("[auth] safeStorage encryption unavailable — skipping persist");
      return;
    }
    const encrypted = safeStorage.encryptString(value);
    fs.writeFileSync(tokenPath(kind), encrypted.toString("base64"), "utf-8");
  } catch (err) {
    console.error(`[auth] Failed to persist ${kind} token:`, err);
  }
}

export function loadPersistedToken(kind: TokenKind): string | null {
  try {
    if (!safeStorage.isEncryptionAvailable()) return null;
    const p = tokenPath(kind);
    if (!fs.existsSync(p)) return null;
    const raw = fs.readFileSync(p, "utf-8");
    return safeStorage.decryptString(Buffer.from(raw, "base64"));
  } catch {
    // macOS keychain access denied (app update, cert change, user clicked "Deny")
    // or corrupted file — treat as signed out, wipe stale tokens
    clearPersistedTokens();
    return null;
  }
}

export function clearPersistedTokens() {
  for (const kind of ["access", "refresh", "expiry"] as const) {
    try {
      const p = tokenPath(kind);
      if (fs.existsSync(p)) fs.unlinkSync(p);
    } catch {
      // best-effort
    }
  }
}
