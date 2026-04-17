import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { DisplayModeProvider } from "./context/DisplayModeContext";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <DisplayModeProvider>
      <App />
    </DisplayModeProvider>
  </React.StrictMode>,
);
