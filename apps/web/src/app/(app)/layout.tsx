"use client";

import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { AppShell } from "@synthesis/ui";

const pageTitles: Record<string, string> = {
  "/library": "Library",
  "/collections": "Collections",
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const pageTitle = pageTitles[pathname] ?? "Synthesis";

  return (
    <AppShell
      activePath={pathname}
      pageTitle={pageTitle}
      userButton={<UserButton afterSignOutUrl="/" />}
    >
      {children}
    </AppShell>
  );
}
