import { Search } from "lucide-react";
import { cn } from "../../lib/utils";

interface TopbarProps {
  title?: string;
  className?: string;
  userButton?: React.ReactNode;
}

export function Topbar({ title = "Library", className, userButton }: TopbarProps) {
  return (
    <header
      className={cn(
        "flex h-14 items-center justify-between border-b border-border bg-background px-6",
        className
      )}
    >
      <h1 className="text-lg font-semibold text-foreground">{title}</h1>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 rounded-md border border-input bg-background px-3 py-1.5 text-sm text-muted-foreground">
          <Search className="h-4 w-4" />
          <span>Search...</span>
        </div>
        {userButton}
      </div>
    </header>
  );
}
