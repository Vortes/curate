"use client"

import { useState, useMemo, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { ImageIcon } from "lucide-react"
import { toast } from "sonner"
import { trpc } from "@/trpc/client"
import {
  CaptureGrid,
  CaptureDetailModal,
  CollectionHeader,
  EditCollectionDialog,
  DeleteCollectionDialog,
  OrganizeModeProvider,
  useOrganizeMode,
  FloatingActionBar,
  OrganizeModal,
} from "@curate/ui"
import type { CaptureCardData, CaptureGroup, CollectionForOrganize } from "@curate/ui"

function CollectionDetailContent() {
  const params = useParams()
  const id = params.id as string
  const router = useRouter()
  const utils = trpc.useUtils()

  const { isOrganizing, selectedIds, enterOrganize, exitOrganize, toggle, clearSelection } = useOrganizeMode()

  const [showOrganizeModal, setShowOrganizeModal] = useState(false)

  const { data: collection, isLoading } = trpc.collection.byId.useQuery({ id })

  const updateCollection = trpc.collection.update.useMutation({
    onSuccess: (updated) => {
      void utils.collection.byId.invalidate({ id })
      void utils.collection.list.invalidate()
      setShowEditDialog(false)
      toast.success(`"${updated?.name ?? "Collection"}" updated`)
    },
  })

  const deleteCollection = trpc.collection.delete.useMutation({
    onSuccess: () => {
      toast.success("Collection deleted")
      router.push("/library")
    },
  })

  const deleteCapture = trpc.capture.delete.useMutation({
    onMutate: ({ id: captureId }) => setDeletingId(captureId),
    onSettled: () => {
      setDeletingId(null)
      void utils.collection.byId.invalidate({ id })
      void utils.capture.list.invalidate()
    },
  })

  const removeCaptures = trpc.collection.removeCaptures.useMutation({
    onSuccess: (_, variables) => {
      void utils.collection.byId.invalidate({ id })
      void utils.collection.list.invalidate()
      const n = variables.captureIds.length
      toast.success(`Removed ${n} capture${n === 1 ? "" : "s"} from "${collection?.name ?? "collection"}"`)
    },
  })

  // Optimistic local ordering for drag-and-drop reorder
  const [localOrder, setLocalOrder] = useState<string[] | null>(null)

  // Reset local order when organize mode exits
  useEffect(() => {
    if (!isOrganizing) {
      setLocalOrder(null)
    }
  }, [isOrganizing])

  const reorderCollection = trpc.collection.reorder.useMutation({
    onSuccess: () => void utils.collection.byId.invalidate({ id }),
  })

  // Organize modal — collections data and membership
  const selectedIdsArray = [...selectedIds]
  const { data: collectionsData = [] } = trpc.collection.list.useQuery()
  const { data: captureCollections = {} } = trpc.collection.captureCollections.useQuery(
    { captureIds: selectedIdsArray },
    { enabled: showOrganizeModal && selectedIdsArray.length > 0 },
  )

  const collectionsForOrganize: CollectionForOrganize[] = collectionsData.map((c) => ({
    id: c.id,
    name: c.name,
    color: c.color,
    captureCount: c._count.captures,
    containedCaptureIds: captureCollections[c.id] ?? [],
  }))

  const addToCollection = trpc.collection.addCaptures.useMutation({
    onSuccess: (_, variables) => {
      void utils.collection.list.invalidate()
      void utils.collection.captureCollections.invalidate()
      void utils.collection.byId.invalidate({ id })
      const collectionName = collectionsForOrganize.find((c) => c.id === variables.collectionId)?.name
      if (collectionName) toast.success(`Added to "${collectionName}"`)
    },
  })

  const removeFromCollection = trpc.collection.removeCaptures.useMutation({
    onSuccess: (_, variables) => {
      void utils.collection.list.invalidate()
      void utils.collection.captureCollections.invalidate()
      void utils.collection.byId.invalidate({ id })
      const collectionName = collectionsForOrganize.find((c) => c.id === variables.collectionId)?.name
      if (collectionName) toast.success(`Removed from "${collectionName}"`)
    },
  })

  const createCollectionForOrganize = trpc.collection.create.useMutation({
    onSuccess: (newCollection) => {
      void utils.collection.list.invalidate()
      if (newCollection) {
        addToCollection.mutate({
          collectionId: newCollection.id,
          captureIds: selectedIdsArray,
        })
      }
    },
  })

  const [selectedCapture, setSelectedCapture] = useState<CaptureCardData | null>(null)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [editName, setEditName] = useState("")
  const [editDescription, setEditDescription] = useState("")
  const [deletingId, setDeletingId] = useState<string | null>(null)

  function handleOpenEdit() {
    setEditName(collection?.name ?? "")
    setEditDescription(collection?.description ?? "")
    setShowEditDialog(true)
  }

  function handleSaveEdit(data: { name: string; description: string }) {
    updateCollection.mutate({ id, name: data.name, description: data.description })
  }

  function handleConfirmDelete() {
    deleteCollection.mutate({ id })
  }

  async function handleBulkRemove() {
    const ids = [...selectedIds]
    const collectionName = collection?.name ?? "this collection"
    const confirmed = window.confirm(
      `Remove ${ids.length} capture${ids.length === 1 ? "" : "s"} from ${collectionName}? They will still be in your library.`,
    )
    if (!confirmed) return

    clearSelection()
    await removeCaptures.mutateAsync({ collectionId: id, captureIds: ids })
  }

  // Map join rows to CaptureCardData
  const captures: CaptureCardData[] = (collection?.captures ?? []).map((row) => ({
    id: row.capture.id,
    imageUrl: row.capture.imageUrl,
    createdAt: row.capture.createdAt,
    analyzedAt: row.capture.analyzedAt,
    tags: row.capture.tags,
    sourceApp: row.capture.sourceApp,
    sourceUrl: row.capture.sourceUrl,
    description: row.capture.description,
  }))

  // Apply local drag order on top of server data for optimistic reordering
  const displayedCaptures = useMemo(() => {
    if (!localOrder) return captures
    const map = new Map(captures.map((c) => [c.id, c]))
    return localOrder.map((id) => map.get(id)).filter((c): c is CaptureCardData => c !== undefined)
  }, [captures, localOrder])

  const groups: CaptureGroup[] = [{ label: "", captures: displayedCaptures }]

  if (isLoading) {
    return (
      <div className="flex-1 overflow-y-auto px-10 pt-3 pb-10 scrollbar-thin">
        {/* Header skeleton */}
        <div className="mb-6">
          <div className="h-7 w-48 rounded animate-pulse bg-black/[0.06] mb-2" />
          <div className="h-4 w-20 rounded animate-pulse bg-black/[0.06]" />
        </div>

        {/* Grid skeleton */}
        <div className="grid grid-cols-[repeat(auto-fill,minmax(340px,1fr))] gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="aspect-[4/3] rounded-lg animate-pulse bg-black/[0.06]"
            />
          ))}
        </div>
      </div>
    )
  }

  if (!collection) {
    return (
      <div className="flex-1 overflow-y-auto px-10 pt-3 pb-10">
        <p className="text-sm text-ink-quiet">Collection not found.</p>
      </div>
    )
  }

  return (
    <>
      <div className="flex-1 overflow-y-auto px-10 pt-3 pb-10 scrollbar-thin">
        <CollectionHeader
          name={collection.name}
          description={collection.description}
          captureCount={captures.length}
          onEdit={handleOpenEdit}
          onOrganize={enterOrganize}
          onDelete={() => setShowDeleteDialog(true)}
        />

        {captures.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-20 text-ink-quiet">
            <ImageIcon className="h-10 w-10" />
            <p className="text-sm">No captures in this collection yet</p>
            <p className="text-[12px] text-ink-whisper">Use Organize mode to add captures</p>
          </div>
        ) : (
          <CaptureGrid
            groups={groups}
            onDelete={isOrganizing ? undefined : (captureId) => deleteCapture.mutate({ id: captureId })}
            deletingId={deletingId}
            onCardClick={isOrganizing ? undefined : setSelectedCapture}
            isOrganizing={isOrganizing}
            selectedIds={selectedIds}
            onSelect={toggle}
            onReorder={(orderedIds) => {
              setLocalOrder(orderedIds)
              reorderCollection.mutate({ collectionId: id, orderedCaptureIds: orderedIds })
            }}
          />
        )}
      </div>

      {/* Floating action bar — only in organize mode */}
      {isOrganizing && (
        <FloatingActionBar
          selectedCount={selectedIds.size}
          onOrganize={() => setShowOrganizeModal(true)}
          onRemove={handleBulkRemove}
          onDone={exitOrganize}
          removeLabel="Remove"
          isDestructiveRemove={false}
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
          await createCollectionForOrganize.mutateAsync({ name })
        }}
        isCreating={createCollectionForOrganize.isPending}
      />

      <CaptureDetailModal
        capture={selectedCapture}
        onClose={() => setSelectedCapture(null)}
        onDelete={(captureId) => {
          deleteCapture.mutate({ id: captureId })
          setSelectedCapture(null)
        }}
      />

      <EditCollectionDialog
        open={showEditDialog}
        onClose={() => setShowEditDialog(false)}
        name={editName}
        description={editDescription}
        onSave={handleSaveEdit}
      />

      <DeleteCollectionDialog
        open={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        collectionName={collection.name}
        onConfirm={handleConfirmDelete}
      />
    </>
  )
}

export default function CollectionDetailPage() {
  const params = useParams()
  const id = params.id as string

  return (
    <OrganizeModeProvider context={{ type: "collection", collectionId: id, collectionName: "" }}>
      <CollectionDetailContent />
    </OrganizeModeProvider>
  )
}
