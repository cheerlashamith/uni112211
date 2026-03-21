import React, { useEffect, useState, useRef } from 'react';
import { Camera, CameraOff, Keyboard, X } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';

interface QRScannerProps {
  onScanSuccess: (decodedText: string) => void;
  onScanError?: (errorMessage: string) => void;
  onClose?: () => void;
}

const QRScanner: React.FC<QRScannerProps> = ({ 
  onScanSuccess, 
  onScanError,
  onClose 
}) => {
  const [hasCamera, setHasCamera] = useState(true);
  const [manualEntry, setManualEntry] = useState(false);
  const [manualId, setManualId] = useState('');
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const SCANNER_ID = "qr-reader-element";

  const stopScanner = async () => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      try {
        await scannerRef.current.stop();
        setScanning(false);
      } catch (err) {
        console.error("Failed to stop scanner", err);
      }
    }
  };

  const startScanner = async () => {
    try {
      console.log("Starting scanner...");
      setError(null);
      setManualEntry(false);
      setScanning(false);
      
      // Cleanup previous instance if any
      if (scannerRef.current) {
        try {
          if (scannerRef.current.isScanning) {
            await scannerRef.current.stop();
          }
        } catch (e) {
          console.error("Cleanup error", e);
        }
      }

      const html5QrCode = new Html5Qrcode(SCANNER_ID);
      scannerRef.current = html5QrCode;

      const config = { 
        fps: 15, 
        qrbox: (viewWidth: number, viewHeight: number) => {
          const minDim = Math.min(viewWidth, viewHeight);
          return { width: minDim * 0.7, height: minDim * 0.7 };
        },
        aspectRatio: 1.0
      };

      // Try environment camera first, then fall back to any camera
      try {
        await html5QrCode.start(
          { facingMode: "environment" },
          config,
          (decodedText) => {
            console.log("Scan success:", decodedText);
            onScanSuccess(decodedText);
            stopScanner();
          },
          () => {} // Silent errors during scanning
        );
      } catch (envError) {
        console.warn("Environment camera failed, trying any camera", envError);
        await html5QrCode.start(
          { facingMode: "user" }, // Try front camera if back fails
          config,
          (decodedText) => {
            onScanSuccess(decodedText);
            stopScanner();
          },
          () => {}
        );
      }

      setScanning(true);
      setHasCamera(true);
    } catch (err: any) {
      console.error('Camera startup error:', err);
      let userMessage = 'Camera not available.';
      
      if (err.name === 'NotAllowedError') {
        userMessage = 'Camera permission denied. Please allow camera access in your browser settings.';
      } else if (err.name === 'NotFoundError') {
        userMessage = 'No camera found on this device.';
      } else if (err.name === 'NotReadableError') {
        userMessage = 'Camera is already in use by another application.';
      } else if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
        userMessage = 'Camera access requires HTTPS. Please ensure your site is secure.';
      }
      
      setHasCamera(false);
      setError(userMessage);
      if (onScanError) onScanError(userMessage);
    }
  };

  useEffect(() => {
    startScanner();
    return () => {
      stopScanner();
    };
  }, []);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualId.trim()) {
      onScanSuccess(manualId.trim());
    }
  };

  if (manualEntry || !hasCamera) {
    return (
      <div className="bg-white rounded-2xl p-6 max-w-sm mx-auto shadow-xl">
        <div className="flex justify-between items-start mb-6">
          <div className="text-center flex-1">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Keyboard size={32} className="text-red-primary" />
            </div>
            <h3 className="text-lg font-bold mb-2">Manual ID Entry</h3>
            <p className="text-sm text-gray-500">Enter the registration ID or unique identifier manually</p>
          </div>
          {onClose && (
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
              <X size={20} />
            </button>
          )}
        </div>
        
        <form onSubmit={handleManualSubmit} className="space-y-4">
          <div>
            <input
              type="text"
              value={manualId}
              onChange={(e) => setManualId(e.target.value)}
              placeholder="Enter ID (e.g. REG-1234)"
              className="w-full px-4 py-4 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-red-primary/10 focus:border-red-primary transition-all"
              autoFocus
            />
          </div>
          <div className="flex gap-3">
            {hasCamera && (
              <button
                type="button"
                onClick={startScanner}
                className="flex-1 btn-secondary py-3 text-xs font-bold"
              >
                Use Camera
              </button>
            )}
            <button
              type="submit"
              disabled={!manualId.trim()}
              className="flex-1 btn-primary py-3 text-xs font-bold disabled:opacity-50"
            >
              Verify Identity
            </button>
          </div>
        </form>
        
        {error && (
          <div className="mt-6 p-3 bg-red-50 border border-red-100 rounded-xl flex items-center gap-2 text-red-600 text-[10px] font-bold uppercase">
             <CameraOff size={14} /> {error}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl overflow-hidden max-w-sm mx-auto shadow-2xl border-4 border-red-primary/10">
      <div className="relative bg-black aspect-square">
        <div id={SCANNER_ID} className="w-full h-full" />
        
        {!scanning && !error && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80 backdrop-blur-sm z-10">
            <div className="text-center text-white px-6">
              <Camera size={48} className="mx-auto mb-4 text-red-primary animate-pulse" />
              <p className="font-bold mb-4">Camera Initializing...</p>
              <button 
                onClick={startScanner}
                className="bg-red-primary text-white px-6 py-2 rounded-xl text-xs font-bold"
              >
                Grant Access
              </button>
            </div>
          </div>
        )}

        {onClose && (
          <button
            onClick={() => { stopScanner(); onClose(); }}
            className="absolute top-4 right-4 z-20 w-10 h-10 bg-black/50 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-red-primary transition-all shadow-lg"
          >
            <X size={20} />
          </button>
        )}
      </div>
      
      <div className="p-6 text-center bg-white">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-red-50 text-red-primary rounded-full text-[10px] font-bold uppercase mb-4 animate-pulse">
          <div className="w-1.5 h-1.5 bg-red-primary rounded-full" />
          Scanner Active
        </div>
        <p className="text-sm text-gray-500 mb-6 font-medium">Align the QR code within the frame to automatically scan and verify participants.</p>
        <button
          onClick={() => { stopScanner(); setManualEntry(true); }}
          className="w-full py-3 bg-gray-50 text-gray-400 hover:text-red-primary hover:bg-red-50 rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-2"
        >
          <Keyboard size={16} /> Use manual ID entry instead
        </button>
      </div>
    </div>
  );
};
export default QRScanner;
