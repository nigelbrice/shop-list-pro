import { useEffect } from "react";
import { Html5Qrcode } from "html5-qrcode";

type Props = {
  onDetected={(result) => {

  if (scannedRef.current) return;

  scannedRef.current = true;

  const barcode = result.codeResult.code;

  if (barcode) {
    onScan(barcode);
  }

}

export default function BarcodeScanner({ onScan, onClose }: Props) {

  const scannedRef = useRef(false);

  useEffect(() => {

    const scanner = new Html5Qrcode("scanner");
 
  useEffect(() => {
  scannedRef.current = false;
}, []);

    scanner.start(
      { facingMode: "environment" },
      { fps: 10, qrbox: 250 },
      (decodedText) => {
        scanner.stop();
        onScan(decodedText);
      },
      () => {}
    );

    return () => {
      scanner.stop().catch(() => {});
    };

  }, [onScan]);

  return (
    <div className="space-y-3">

      <div
        id="scanner"
        className="w-full rounded-xl overflow-hidden"
      />

      <button
        onClick={onClose}
        className="text-sm text-muted-foreground"
      >
        Cancel
      </button>

    </div>
  );
}