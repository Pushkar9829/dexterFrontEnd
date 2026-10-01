import React from "react";
import { createRoot } from "react-dom/client";
import App from "./app/App.jsx";
import { captureWaitsForSignIn, loadCaptureScript } from "./app/figmaCapture.js";
import { registerServiceWorker } from "./pwa/installPrompt.js";
import "./styles/global.css";

registerServiceWorker();
if (!captureWaitsForSignIn) loadCaptureScript(1500);

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
