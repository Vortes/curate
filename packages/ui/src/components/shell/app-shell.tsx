import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { cn } from "../../lib/utils";

interface AppShellProps {
  activePath?: string;
  pageTitle?: string;
  children: React.ReactNode;
  className?: string;
  userButton?: React.ReactNode;
}

export function AppShell({
  activePath,
  pageTitle,
  children,
  className,
  userButton,
}: AppShellProps) {
  return (
    <div className="flex h-screen bg-background text-foreground">
      <Sidebar activePath={activePath} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar title={pageTitle} userButton={userButton} />
        <main className={cn("flex-1 overflow-auto p-6", className)}>
          {children}
        </main>
      </div>
    </div>
  );
}
