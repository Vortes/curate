import { useEffect, useMemo, useState } from "react";
import {
  SearchGateway,
  CaptureGrid,
  CaptureDetailModal,
  OrganizeModeProvider,
  useOrganizeMode,
  FloatingActionBar,
  OrganizeModal,
} from "@curate/ui";
import type { CaptureCardData, CaptureGroup, CollectionForOrganize } from "@curate/ui";
import { ImageIcon, Upload } from "lucide-react";
import { trpc } from "./trpc";

function groupCapturesByDate(captures: CaptureCardData[]): CaptureGroup[] {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const groups: Record<string, CaptureCardData[]> = {};
  const groupOrder: string[] = [];

  for (const capture of captures) {
    const date = new Date(capture.createdAt);
    const captureDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());

    let label: string;
    if (captureDay.getTime() === today.getTime()) {
      label = "Today";
    } else if (captureDay.getTime() === yesterday.getTime()) {
      label = "Yesterday";
    } else {
      label = captureDay.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    }

    if (!groups[label]) {
      groups[label] = [];
      groupOrder.push(label);
    }
    groups[label]!.push(capture);
  }

  return groupOrder.map((label) => ({ label, captures: groups[label]! }));
}

function LibraryContent() {
  const [query, setQuery] = useState("");
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [activeApps, setActiveApps] = useState<string[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedCapture, setSelectedCapture] = useState<CaptureCardData | null>(null);
  const [showOrganizeModal, setShowOrganizeModal] = useState(false);
  const utils = trpc.useUtils();

  const { isOrganizing, selectedIds, enterOrganize, exitOrganize, toggle, clearSelection } = useOrganizeMode();

  const { data: captures = [], isLoading } = trpc.capture.list.useQuery();

  // Collections for organize modal
  const selectedIdsArray = [...selectedIds];
  const { data: collectionsData = [] } = trpc.collection.list.useQuery();
  const { data: captureCollections = {} } = trpc.collection.captureCollections.useQuery(
    { captureIds: selectedIdsArray },
    { enabled: showOrganizeModal && selectedIdsArray.length > 0 },
  );

  const collectionsForOrganize: CollectionForOrganize[] = collectionsData.map((c) => ({
    id: c.id,
    name: c.name,
    color: c.color,
    captureCount: c._count.captures,
    containedCaptureIds: captureCollections[c.id] ?? [],
  }));

  const addToCollection = trpc.collection.addCaptures.useMutation({
    onSuccess: () => {
      void utils.collection.list.invalidate();
      void utils.collection.captureCollections.invalidate();
    },
  });

  const removeFromCollection = trpc.collection.removeCaptures.useMutation({
    onSuccess: () => {
      void utils.collection.list.invalidate();
      void utils.collection.captureCollections.invalidate();
    },
  });

  const createCollectionForOrganize = trpc.collection.create.useMutation({
    onSuccess: (newCollection) => {
      void utils.collection.list.invalidate();
      if (newCollection) {
        addToCollection.mutate({
          collectionId: newCollection.id,
          captureIds: selectedIdsArray,
        });
      }
    },
  });

  const deleteCapture = trpc.capture.delete.useMutation({
    onMutate: ({ id }) => setDeletingId(id),
    onSettled: () => {
      setDeletingId(null);
      void utils.capture.list.invalidate();
    },
  });

  // Optimistic local ordering for drag-and-drop reorder
  const [localOrder, setLocalOrder] = useState<string[] | null>(null);

  // Reset local order when organize mode exits
  useEffect(() => {
    if (!isOrganizing) {
      setLocalOrder(null);
    }
  }, [isOrganizing]);

  const reorderLibrary = trpc.capture.reorderLibrary.useMutation({
    onSuccess: () => void utils.capture.list.invalidate(),
  });

  // Listen for capture completion from main process
  useEffect(() => {
    const cleanup = window.electronAPI.onCaptureComplete(() => {
      void utils.capture.list.invalidate();
    });
    return cleanup;
  }, [utils]);

  // Full tag + app pool for autocomplete
  const allTags = useMemo(() => {
    const tags = new Set(captures.flatMap((c) => c.tags ?? []));
    for (const c of captures) {
      if (c.sourceApp) tags.add(c.sourceApp);
    }
    return [...tags].sort();
  }, [captures]);

  // Derive suggested app pills from the library
  const suggestedApps = useMemo(() => {
    const apps = new Set(captures.map((c: any) => c.sourceApp).filter(Boolean) as string[]);
    return [...apps].sort();
  }, [captures]);

  // Derive suggested tag pills from the library
  const suggestedTags = useMemo(() => {
    if (!captures.length) return [];

    if (!query.trim() && activeTags.length === 0) {
      const firstTags = captures
        .map((c) => c.tags?.[0])
        .filter(Boolean) as string[];
      const counts = new Map<string, number>();
      for (const tag of firstTags) {
        counts.set(tag, (counts.get(tag) ?? 0) + 1);
      }
      return [...counts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([tag]) => tag);
    }

    const q = query.toLowerCase();
    const allTagsSet = new Set(captures.flatMap((c) => c.tags ?? []));
    return [...allTagsSet]
      .filter((tag) => tag.includes(q) && !activeTags.includes(tag))
      .slice(0, 6);
  }, [captures, query, activeTags]);

  // Apply local drag order on top of server data for optimistic reordering
  const displayedCaptures = useMemo(() => {
    if (!localOrder) return captures;
    const map = new Map(captures.map((c) => [c.id, c]));
    return localOrder.map((id) => map.get(id)).filter(Boolean) as typeof captures;
  }, [captures, localOrder]);

  // Client-side filtering — synchronous, no spinner
  const filteredCaptures = useMemo(() => {
    let results = displayedCaptures;

    if (activeApps.length > 0) {
      results = results.filter((c: any) => c.sourceApp && activeApps.includes(c.sourceApp));
    }

    if (activeTags.length > 0) {
      results = results.filter((c) =>
        activeTags.every((tag) => c.tags?.includes(tag)),
      );
    }

    const trimmed = query.trim().toLowerCase();
    if (trimmed) {
      const words = trimmed.split(/\s+/);
      results = results.filter((c) =>
        words.every((word) =>
          c.tags?.some((t) => t.includes(word)) ||
          (c.sourceApp && c.sourceApp.toLowerCase().includes(word)),
        ),
      );
    }

    return results;
  }, [displayedCaptures, query, activeTags, activeApps]);

  const isFiltering = query.trim().length > 0 || activeTags.length > 0 || activeApps.length > 0;

  // Build groups for CaptureGrid
  const groups: CaptureGroup[] = useMemo(() => {
    if (isFiltering) {
      return filteredCaptures.length > 0
        ? [{ label: "", captures: filteredCaptures }]
        : [];
    }
    return groupCapturesByDate(filteredCaptures);
  }, [isFiltering, filteredCaptures]);

  const totalCount = captures.length;
  const filteredCount = filteredCaptures.length;

  const countLabel = isFiltering
    ? `${filteredCount} of ${totalCount} captures`
    : `${totalCount} capture${totalCount === 1 ? "" : "s"}`;

  async function handleBulkDelete() {
    const ids = [...selectedIds];
    const confirmed = window.confirm(
      `Permanently delete ${ids.length} capture${ids.length === 1 ? "" : "s"}?`,
    );
    if (!confirmed) return;

    clearSelection();
    for (const id of ids) {
      await deleteCapture.mutateAsync({ id });
    }
  }

  return (
    <>
      {/* Search gateway — hidden in organize mode */}
      {isOrganizing ? (
        <div className="px-10 pt-8 pb-4 text-center">
          <p className="text-lg font-semibold text-ink">Select &amp; Rearrange</p>
          <p className="text-[13px] text-ink-quiet mt-1">
            Select multiple captures or drag them to rearrange
          </p>
        </div>
      ) : (
        <SearchGateway
          onQueryChange={setQuery}
          onActiveTagsChange={setActiveTags}
          suggestedTags={suggestedTags}
          suggestedApps={suggestedApps}
          allTags={allTags}
          onActiveAppsChange={setActiveApps}
        />
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-ink-whisper border-t-orange" />
        </div>
      )}

      {/* Library grid */}
      {!isLoading && (
        <div className="flex-1 overflow-y-auto px-10 pt-3 pb-10 scrollbar-thin">
          {/* Count label row — includes Organize button */}
          {totalCount > 0 && (
            <div className="flex items-center justify-between mb-5">
              <p className="font-mono text-[11px] font-light tracking-[0.06em] text-ink-whisper">
                {isOrganizing ? `${selectedIds.size} selected` : countLabel}
              </p>
              {!isOrganizing && (
                <button
                  onClick={enterOrganize}
                  className="text-[13px] text-ink-quiet hover:text-ink-mid cursor-pointer transition-colors px-3 py-1 rounded-md hover:bg-black/[0.03] border-0 bg-transparent"
                >
                  Organize
                </button>
              )}
            </div>
          )}

          {/* No matches state */}
          {!isOrganizing && isFiltering && filteredCount === 0 && totalCount > 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-20 text-ink-quiet">
              <ImageIcon className="h-10 w-10" />
              <p className="text-sm">No matches</p>
            </div>
          ) : (
            <>
              <CaptureGrid
                groups={groups}
                onDelete={isOrganizing ? undefined : (id) => deleteCapture.mutate({ id })}
                deletingId={deletingId}
                onCardClick={isOrganizing ? undefined : setSelectedCapture}
                isOrganizing={isOrganizing}
                selectedIds={selectedIds}
                onSelect={toggle}
                onReorder={(orderedIds) => {
                  setLocalOrder(orderedIds);
                  reorderLibrary.mutate({ orderedCaptureIds: orderedIds });
                }}
              />

              {/* Desktop-specific empty state with capture shortcut hint */}
              {totalCount === 0 && (
                <div className="flex items-center gap-2 rounded-xl bg-surface-warm px-4 py-3 text-sm text-ink-quiet shadow-card">
                  <Upload className="h-4 w-4 shrink-0" />
                  <span>
                    Press{" "}
                    <kbd className="rounded border border-edge bg-surface-cool px-1.5 py-0.5 text-xs font-mono">
                      Cmd+Shift+S
                    </kbd>{" "}
                    to capture a screen region, or use the web app to upload
                  </span>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Floating action bar — only in organize mode */}
      {isOrganizing && (
        <FloatingActionBar
          selectedCount={selectedIds.size}
          onOrganize={() => setShowOrganizeModal(true)}
          onRemove={handleBulkDelete}
          onDone={exitOrganize}
          removeLabel="Delete"
          isDestructiveRemove={true}
        />
      )}

      <OrganizeModal
        open={showOrganizeModal}
        onClose={() => setShowOrganizeModal(false)}
        selectedCaptureIds={selectedIdsArray}
        collections={collectionsForOrganize}
        onAddToCollection={(collectionId, captureIds) =>
          addToCollection.mutate({ collectionId, captureIds })
        }
        onRemoveFromCollection={(collectionId, captureIds) =>
          removeFromCollection.mutate({ collectionId, captureIds })
        }
        onCreateCollection={async (name) => {
          await createCollectionForOrganize.mutateAsync({ name });
        }}
        isCreating={createCollectionForOrganize.isPending}
      />

      <CaptureDetailModal
        capture={selectedCapture}
        onClose={() => setSelectedCapture(null)}
        onDelete={(id) => {
          deleteCapture.mutate({ id });
          setSelectedCapture(null);
        }}
      />
    </>
  );
}

export function LibraryView() {
  return (
    <OrganizeModeProvider context={{ type: "library" }}>
      <LibraryContent />
    </OrganizeModeProvider>
  );
}
