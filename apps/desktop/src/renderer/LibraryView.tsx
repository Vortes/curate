import { useEffect, useState } from "react";
import { CaptureGrid } from "@synthesis/ui";
import { Upload } from "lucide-react";
import { trpc } from "./trpc";

export function LibraryView() {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const utils = trpc.useUtils();
  const { data: captures = [], isLoading } = trpc.capture.list.useQuery();

  const deleteCapture = trpc.capture.delete.useMutation({
    onMutate: ({ id }) => setDeletingId(id),
    onSettled: () => {
      setDeletingId(null);
      utils.capture.list.invalidate();
    },
  });

  // Listen for capture completion from main process
  useEffect(() => {
    const cleanup = window.electronAPI.onCaptureComplete(() => {
      utils.capture.list.invalidate();
    });
    return cleanup;
  }, [utils]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted-foreground border-t-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {captures.length} capture{captures.length !== 1 ? "s" : ""}
        </p>
      </div>

      <CaptureGrid
        captures={captures}
        onDelete={(id) => deleteCapture.mutate({ id })}
        deletingId={deletingId}
      />

      {captures.length === 0 && (
        <div className="flex items-center gap-2 rounded-md border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
          <Upload className="h-4 w-4 shrink-0" />
          <span>
            Press{" "}
            <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 text-xs font-mono">
              Cmd+Shift+S
            </kbd>{" "}
            to capture a screen region, or use the web app to upload
          </span>
        </div>
      )}
    </div>
  );
}
