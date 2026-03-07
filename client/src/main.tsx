import { createRoot } from "react-dom/client";

import App from "./App";
import "./index.css";



createRoot(document.getElementById("root")!).render(<App />);

import { processOfflineQueue } from "@/lib/offlineQueue";

window.addEventListener("online", () => {
  processOfflineQueue();
});