import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import { processOfflineQueue } from "@/lib/offlineQueue";

import App from "./App";
import "./index.css";

registerSW({ immediate: true });

createRoot(document.getElementById("root")!).render(<App />);

processOfflineQueue();

window.addEventListener("online", () => {
  processOfflineQueue();
});