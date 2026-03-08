import { useEffect, useState } from "react";

export default function NetworkStatus() {
  const [online, setOnline] = useState(navigator.onLine);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const goOnline = () => {
      setOnline(true);
      setVisible(true);

      setTimeout(() => {
        setVisible(false);
      }, 3000);
    };

    const goOffline = () => {
      setOnline(false);
      setVisible(true);
    };

    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);

    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50">
      {online ? (
        <div className="bg-green-600 text-white px-4 py-2 rounded-full shadow-lg text-sm">
          ✓ Back online
        </div>
      ) : (
        <div className="bg-orange-500 text-white px-4 py-2 rounded-full shadow-lg text-sm">
          ⚠ Offline — changes will sync automatically
        </div>
      )}
    </div>
  );
}