import { useEffect } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";

export function PwaUpdater() {

  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      // Check for updates every 60 seconds
      if (r) {
        setInterval(() => r.update(), 60 * 1000);
      }
    },
  });

  useEffect(() => {
    if (needRefresh) {
      // New version available — update and reload automatically
      updateServiceWorker(true);
    }
  }, [needRefresh, updateServiceWorker]);

  return null;
}