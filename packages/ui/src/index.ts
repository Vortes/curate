// Utilities
export { cn } from "./lib/utils";

// UI components
export { Button, buttonVariants, type ButtonProps } from "./components/ui/button";
export { Card, CardHeader, CardTitle, CardContent } from "./components/ui/card";
export {
  Dialog,
  DialogTrigger,
  DialogPortal,
  DialogOverlay,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "./components/ui/dialog";

// Shell components
export { AppShell } from "./components/shell/app-shell";
export { Sidebar } from "./components/shell/sidebar";
export { Topbar } from "./components/shell/topbar";
export { SearchGateway } from "./components/shell/search-gateway";

// Library components
export { CaptureCard, type CaptureCardData } from "./components/library/capture-card";
export { CaptureGrid, type CaptureGroup } from "./components/library/capture-grid";
export { SortableCaptureCard } from "./components/library/sortable-capture-card";
export { CaptureDetailModal } from "./components/library/capture-detail-modal";
export { OrganizeModeProvider, useOrganizeMode, type OrganizeContext } from "./components/library/organize-mode";
export { FloatingActionBar } from "./components/library/floating-action-bar";

// Collection components
export { CollectionHeader } from "./components/collections/collection-header";
export { EditCollectionDialog } from "./components/collections/edit-collection-dialog";
export { DeleteCollectionDialog } from "./components/collections/delete-collection-dialog";
export { OrganizeModal, type CollectionForOrganize } from "./components/collections/organize-modal";
