import { serverTrpc } from "@/trpc/server";

export default async function LibraryPage() {
  const api = await serverTrpc();
  const user = await api.user.me();
  const captures = await api.capture.list();

  return (
    <div className="space-y-4">
      {user ? (
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">
            Signed in as <span className="text-foreground font-medium">{user.email}</span>
          </p>
          <p className="text-sm text-muted-foreground">
            {captures.length} capture{captures.length !== 1 ? "s" : ""} in your library
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">
            User not found in database. Sign out and back in to trigger the webhook sync.
          </p>
        </div>
      )}
    </div>
  );
}
