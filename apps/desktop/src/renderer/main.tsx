import { createRoot } from "react-dom/client";
import { ClerkProvider } from "@clerk/clerk-react";
import { dark } from "@clerk/themes";
import { App } from "./App";
import "./index.css";

const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string | undefined;

document.documentElement.classList.add("dark");

const root = createRoot(document.getElementById("root")!);

if (!CLERK_PUBLISHABLE_KEY) {
  root.render(
    <div style={{ color: "white", padding: 32, fontFamily: "system-ui" }}>
      <h1>Missing Clerk key</h1>
      <p>Add <code>VITE_CLERK_PUBLISHABLE_KEY</code> to <code>apps/desktop/.env</code></p>
    </div>
  );
} else {
  root.render(
    <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY} appearance={{ baseTheme: dark }}>
      <App />
    </ClerkProvider>
  );
}
