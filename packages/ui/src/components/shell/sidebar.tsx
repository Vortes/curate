import { Images, FolderOpen } from "lucide-react";
import { cn } from "../../lib/utils";

const navItems = [
  { label: "Library", icon: Images, href: "/" },
  { label: "Collections", icon: FolderOpen, href: "/collections" },
] as const;

interface SidebarProps {
  activePath?: string;
  className?: string;
}

export function Sidebar({ activePath = "/", className }: SidebarProps) {
  return (
    <aside
      className={cn(
        "flex h-full w-56 flex-col border-r border-border bg-sidebar",
        className
      )}
    >
      <div className="flex h-14 items-center gap-2 border-b border-border px-4">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-xs font-bold text-primary-foreground">
          S
        </div>
        <span className="text-sm font-semibold text-sidebar-foreground">
          Synthesis
        </span>
      </div>

      <nav className="flex-1 space-y-1 p-2">
        {navItems.map((item) => {
          const isActive = activePath === item.href;
          return (
            <a
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
                isActive
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </a>
          );
        })}
      </nav>
    </aside>
  );
}
