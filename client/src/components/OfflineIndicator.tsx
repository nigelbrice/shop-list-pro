import { useOnlineStatus } from "@/hooks/useOnlineStatus";

export default function OfflineIndicator() {
  const online = useOnlineStatus();

  if (online) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        background: "#f97316",
        color: "white",
        textAlign: "center",
        padding: "8px",
        fontSize: "14px",
        zIndex: 9999,
      }}
    >
      You are offline. Changes will sync when connection returns.
    </div>
  );
}