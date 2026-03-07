import { AppShell } from "@curate/ui";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { useAuth } from "./AuthProvider";
import { TRPCProvider } from "./TRPCProvider";
import { LibraryView } from "./LibraryView";
import { CollectionView } from "./CollectionView";
import { trpc } from "./trpc";

type View =
  | { type: "library" }
  | { type: "collection"; id: string };

function SignInScreen() {
  const { signIn } = useAuth();
  const [status, setStatus] = useState<"idle" | "waiting">("idle");

  const handleSignIn = useCallback(() => {
    signIn();
    setStatus("waiting");
  }, [signIn]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background">
      <div className="flex flex-col items-center gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Curate</h1>
        <p className="text-sm text-muted-foreground">
          Sign in to access your design library
        </p>
      </div>

      {status === "idle" && (
        <button
          onClick={handleSignIn}
          className="rounded-md bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition-all duration-200 hover:bg-primary/90"
        >
          Sign in with browser
        </button>
      )}

      {status === "waiting" && (
        <div className="flex flex-col items-center gap-2">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-ink-whisper border-t-orange" />
          <p className="text-sm text-muted-foreground">
            Waiting for sign-in...
          </p>
        </div>
      )}
    </div>
  );
}

function AppContent() {
  const { signOut, isSigningOut } = useAuth();
  const queryClient = useQueryClient();
  const utils = trpc.useUtils();

  const [view, setView] = useState<View>({ type: "library" });
  const [createError, setCreateError] = useState<string | null>(null);

  const handleSignOut = useCallback(async () => {
    queryClient.clear();
    await signOut();
  }, [signOut, queryClient]);

  const { data: collectionsData, isLoading: isLoadingCollections } =
    trpc.collection.list.useQuery();

  const createCollection = trpc.collection.create.useMutation({
    onSuccess: () => {
      void utils.collection.list.invalidate();
      setCreateError(null);
    },
    onError: (err) => {
      setCreateError(err.message ?? "Failed to create collection");
    },
  });

  const collections = (collectionsData ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    color: c.color,
    captureCount: c._count.captures,
    href: `/collections/${c.id}`,
  }));

  async function handleCreateCollection(name: string) {
    setCreateError(null);
    await createCollection.mutateAsync({ name });
  }

  // Derive activePath for sidebar highlighting
  const activePath =
    view.type === "collection" ? `/collections/${view.id}` : "/library";

  function handleNavClick(href: string) {
    if (href === "/library") {
      setView({ type: "library" });
    } else if (href.startsWith("/collections/")) {
      const id = href.replace("/collections/", "");
      setView({ type: "collection", id });
    }
  }

  return (
    <AppShell
      activePath={activePath}
      platform="desktop"
      onSignOut={handleSignOut}
      isSigningOut={isSigningOut}
      collections={collections}
      isLoadingCollections={isLoadingCollections}
      onCreateCollection={handleCreateCollection}
      createError={createError}
      onNavClick={handleNavClick}
    >
      {view.type === "library" ? (
        <LibraryView />
      ) : (
        <CollectionView
          collectionId={view.id}
          onBack={() => setView({ type: "library" })}
        />
      )}
    </AppShell>
  );
}

export function App() {
  const { isLoading, isSignedIn } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-ink-whisper border-t-orange" />
      </div>
    );
  }

  if (!isSignedIn) {
    return <SignInScreen />;
  }

  return (
    <TRPCProvider>
      <AppContent />
    </TRPCProvider>
  );
}
