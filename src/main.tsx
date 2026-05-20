import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { initializeDesktopPersistence } from "./lib/desktopPersistenceAdapter";
import "./styles.css";

const renderApp = () => {
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
};

void initializeDesktopPersistence().finally(renderApp);
