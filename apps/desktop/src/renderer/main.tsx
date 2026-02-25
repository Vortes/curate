import { createRoot } from "react-dom/client";
import { AuthProvider } from "./AuthProvider";
import { App } from "./App";
import "./index.css";

const root = createRoot(document.getElementById("root")!);

root.render(
  <AuthProvider>
    <App />
  </AuthProvider>
);
