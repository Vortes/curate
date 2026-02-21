import {
  SignedIn,
  SignedOut,
  useAuth,
  useSignIn,
  UserButton,
} from "@clerk/clerk-react";
import { AppShell } from "@synthesis/ui";
import { useCallback, useEffect, useState } from "react";
import { TRPCProvider } from "./TRPCProvider";
import { LibraryView } from "./LibraryView";

function AuthTokenProvider({ children }: { children: React.ReactNode }) {
  const { getToken } = useAuth();

  useEffect(() => {
    const cleanup = window.electronAPI.onRequestAuthToken(async () => {
      try {
        return await getToken();
      } catch {
        return null;
      }
    });
    return cleanup;
  }, [getToken]);

  return <>{children}</>;
}

function SignInScreen() {
  const { signIn, setActive } = useSignIn();
  const [status, setStatus] = useState<"idle" | "waiting" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const handleSignIn = useCallback(() => {
    const webUrl = import.meta.env.VITE_WEB_URL || "http://localhost:3000";
    window.electronAPI.openExternal(
      `${webUrl}/sign-in?redirect_url=/desktop-callback`
    );
    setStatus("waiting");
  }, []);

  useEffect(() => {
    const cleanup = window.electronAPI.onAuthToken(async (token) => {
      try {
        if (!signIn || !setActive) return;
        const result = await signIn.create({
          strategy: "ticket",
          ticket: token,
        });
        if (result.createdSessionId) {
          await setActive({ session: result.createdSessionId });
        }
      } catch (err) {
        setStatus("error");
        setErrorMsg(err instanceof Error ? err.message : "Sign-in failed");
      }
    });
    return cleanup;
  }, [signIn, setActive]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background">
      <div className="flex flex-col items-center gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Synthesis</h1>
        <p className="text-sm text-muted-foreground">
          Sign in to access your design library
        </p>
      </div>

      {status === "idle" && (
        <button
          onClick={handleSignIn}
          className="rounded-md bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
        >
          Sign in with browser
        </button>
      )}

      {status === "waiting" && (
        <div className="flex flex-col items-center gap-2">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-muted-foreground border-t-primary" />
          <p className="text-sm text-muted-foreground">
            Waiting for sign-in...
          </p>
        </div>
      )}

      {status === "error" && (
        <div className="flex flex-col items-center gap-3">
          <p className="text-sm text-destructive">{errorMsg}</p>
          <button
            onClick={() => {
              setStatus("idle");
              setErrorMsg("");
            }}
            className="rounded-md bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
        </div>
      )}
    </div>
  );
}

export function App() {
  return (
    <>
      <SignedOut>
        <SignInScreen />
      </SignedOut>

      <SignedIn>
        <AuthTokenProvider>
          <TRPCProvider>
            <AppShell
              activePath="/library"
              pageTitle="Library"
              userButton={<UserButton afterSignOutUrl="" />}
            >
              <LibraryView />
            </AppShell>
          </TRPCProvider>
        </AuthTokenProvider>
      </SignedIn>
    </>
  );
}
