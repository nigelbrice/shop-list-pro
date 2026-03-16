/// <reference types="vite-plugin-pwa/react" />
import { useEffect } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";

export function PwaUpdater() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r: ServiceWorkerRegistration | undefined) {
      if (!r) return;

      // Check for updates every 60 seconds
      setInterval(() => r.update(), 60 * 1000);

      // If there's already a waiting worker when we register
      // (e.g. page was open during a deploy), activate it now
      if (r.waiting) {
        r.waiting.postMessage({ type: "SKIP_WAITING" });
      }

      // Also listen for future waiting workers
      r.addEventListener("updatefound", () => {
        const newWorker = r.installing;
        if (!newWorker) return;
        newWorker.addEventListener("statechange", () => {
          if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
            // New worker installed and waiting — tell it to take over
            newWorker.postMessage({ type: "SKIP_WAITING" });
          }
        });
      });
    },
  });

  // Once needRefresh fires, apply the update
  useEffect(() => {
    if (!needRefresh) return;
    updateServiceWorker(true);
  }, [needRefresh, updateServiceWorker]);

  // Listen for the controller change (new worker took over)
  // and reload — catches cases where skipWaiting fires outside
  // the needRefresh flow
  useEffect(() => {
    let refreshing = false;
    const handleControllerChange = () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener("controllerchange", handleControllerChange);
    return () => navigator.serviceWorker.removeEventListener("controllerchange", handleControllerChange);
  }, []);

  return null;
}