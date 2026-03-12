import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { NotFoundException } from "@zxing/library";
import { Loader2, CheckCircle2 } from "lucide-react";

type Props = {
  onScan: (barcode: string) => void;
  onClose: () => void;
};

type ScannerState = "starting" | "scanning" | "scanned" | "error";

export default function BarcodeScanner({ onScan, onClose }: Props) {

  const videoRef = useRef<HTMLVideoElement>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const hasScannedRef = useRef(false);

  const [state, setState] = useState<ScannerState>("starting");
  const [scannedCode, setScannedCode] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {

    hasScannedRef.current = false;

    const reader = new BrowserMultiFormatReader();
    readerRef.current = reader;

    if (!videoRef.current) return;

    reader.decodeFromConstraints(
      {
        video: {
          facingMode: "environment",
        },
      },
      videoRef.current,
      (result, error) => {

        if (hasScannedRef.current) return;

        if (result) {
          hasScannedRef.current = true;
          const text = result.getText();
          setScannedCode(text);
          setState("scanned");

          // Small delay so the success screen is visible before we hand off
          setTimeout(() => onScan(text), 800);
        }

        if (error && !(error instanceof NotFoundException)) {
          // NotFoundException fires on every non-barcode frame — ignore it
          console.warn("[ZXing]", error);
        }
      }
    )
      .then(() => setState("scanning"))
      .catch((err) => {
        const msg = String(err);
        setErrorMessage(
          msg.toLowerCase().includes("permission") || msg.toLowerCase().includes("allowed")
            ? "Camera permission denied. Please allow access and try again."
            : "Could not start camera: " + msg
        );
        setState("error");
      });

    // Cleanup — ZXing stops cleanly by resetting the reader
    return () => {
      try {
        BrowserMultiFormatReader.releaseAllStreams();
      } catch (_) {}
    };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleCancel() {
    try {
      BrowserMultiFormatReader.releaseAllStreams();
    } catch (_) {}
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex flex-col items-center justify-center p-4 gap-4">

      <div className="bg-card rounded-2xl overflow-hidden w-full max-w-sm shadow-2xl">

        {/* Header */}
        <div className="px-4 py-3 border-b border-border/40 flex items-center justify-between">
          <span className="font-semibold">Scan Barcode</span>
          <button
            onClick={handleCancel}
            className="text-muted-foreground hover:text-foreground text-xl leading-none"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="bg-black min-h-[240px] relative flex items-center justify-center">

          {/* Video element — always in DOM, ZXing attaches to it directly */}
          <video
            ref={videoRef}
            className={`w-full ${state === "scanning" ? "block" : "hidden"}`}
            muted
            playsInline
          />

          {state === "starting" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
              <Loader2 className="w-8 h-8 animate-spin text-white/60" />
              <span className="text-white/50 text-sm">Starting camera...</span>
            </div>
          )}

          {state === "scanned" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black px-6">
              <CheckCircle2 className="w-12 h-12 text-green-400" />
              <span className="text-white font-semibold">Barcode detected!</span>
              <span className="text-white/40 text-xs font-mono">{scannedCode}</span>
              <div className="flex items-center gap-2 mt-1">
                <Loader2 className="w-4 h-4 animate-spin text-white/40" />
                <span className="text-white/40 text-xs">Looking up product...</span>
              </div>
            </div>
          )}

          {state === "error" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6">
              <span className="text-red-400 text-sm text-center">{errorMessage}</span>
              <button
                onClick={handleCancel}
                className="px-4 py-2 rounded-lg bg-card border text-sm"
              >
                Close
              </button>
            </div>
          )}

        </div>

        {/* Footer */}
        {state === "scanning" && (
          <div className="px-4 py-3 text-center text-sm text-muted-foreground">
            Point your camera at a barcode
          </div>
        )}

      </div>

      {(state === "starting" || state === "scanning") && (
        <button
          onClick={handleCancel}
          className="text-white/70 hover:text-white text-sm"
        >
          Cancel
        </button>
      )}

    </div>
  );
}