import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App, AppErrorBoundary } from "./App";
import "./styles.css";
import "./project.css";
import "./workspace-navigation.css";

const root = document.getElementById("root");
if (!root) throw new Error("ATOMburn renderer root is missing.");

createRoot(root).render(
  <StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </StrictMode>
);

requestAnimationFrame(() => window.atomBurn?.rendererReady());
