"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { UserButton, useClerk } from "@clerk/nextjs";
import { AppShell } from "@curate/ui";
import { trpc } from "@/trpc/client";
import { Toaster, toast } from "sonner";

const pageTitles: Record<string, string> = {
  "/library": "Library",
  "/collections": "Collections",
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const pageTitle = pageTitles[pathname] ?? "Curate";
  const { signOut } = useClerk();
  const [createError, setCreateError] = useState<string | null>(null);

  const utils = trpc.useUtils();

  const { data: collectionsData, isLoading: isLoadingCollections } =
    trpc.collection.list.useQuery();

  const createCollection = trpc.collection.create.useMutation({
    onSuccess: (newCollection) => {
      void utils.collection.list.invalidate();
      setCreateError(null);
      if (newCollection) {
        toast.success(`"${newCollection.name}" created`);
      }
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

  return (
    <>
      <AppShell
        activePath={pathname}
        pageTitle={pageTitle}
        userButton={<UserButton afterSignOutUrl="/" />}
        onSignOut={() => signOut({ redirectUrl: "/sign-in" })}
        collections={collections}
        isLoadingCollections={isLoadingCollections}
        onCreateCollection={handleCreateCollection}
        createError={createError}
      >
        {children}
      </AppShell>
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            fontFamily: "var(--font-outfit, sans-serif)",
            fontSize: "13px",
          },
        }}
      />
    </>
  );
}
