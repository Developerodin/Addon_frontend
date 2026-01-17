"use client";

import { useEffect, useState } from 'react';
import { isQZLoaded, connectQZ, getDefaultPrinter, getAvailablePrinters, PrinterInfo } from '@/shared/utils/qzTray';

interface QZTrayStatusProps {
  onStatusChange?: (status: {
    scriptLoaded: boolean;
    connected: boolean;
    printer: PrinterInfo | null;
    printers: PrinterInfo[];
  }) => void;
}

export const QZTrayStatus = ({ onStatusChange }: QZTrayStatusProps) => {
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [connected, setConnected] = useState(false);
  const [printer, setPrinter] = useState<PrinterInfo | null>(null);
  const [printers, setPrinters] = useState<PrinterInfo[]>([]);
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isUntrusted, setIsUntrusted] = useState(false);

  const checkStatus = async () => {
    if (isChecking || (window as any)._qzChecking) return;

    setIsChecking(true);
    (window as any)._qzChecking = true;
    setError(null);

    try {
      // Check if site is untrusted (HTTP on non-localhost)
      if (typeof window !== 'undefined') {
        const isHTTP = window.location.protocol === 'http:';
        const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        setIsUntrusted(isHTTP && !isLocalhost);
      }

      // Check script loading
      const loaded = isQZLoaded();
      setScriptLoaded(loaded);

      if (!loaded) {
        setConnected(false);
        setPrinter(null);
        setPrinters([]);
        onStatusChange?.({
          scriptLoaded: false,
          connected: false,
          printer: null,
          printers: [],
        });
        setIsChecking(false);
        return;
      }

      // Check connection - same method as HTML test file
      const isActive = typeof window !== 'undefined' &&
        typeof window.qz !== 'undefined' &&
        window.qz.websocket &&
        window.qz.websocket.isActive() === true;
      setConnected(isActive);

      if (!isActive) {
        setPrinter(null);
        setPrinters([]);
        onStatusChange?.({
          scriptLoaded: true,
          connected: false,
          printer: null,
          printers: [],
        });
        setIsChecking(false);
        return;
      }

      // Get printers
      try {
        const availablePrinters = await getAvailablePrinters();
        setPrinters(availablePrinters);

        const defaultPrinter = await getDefaultPrinter();
        setPrinter(defaultPrinter);

        onStatusChange?.({
          scriptLoaded: true,
          connected: true,
          printer: defaultPrinter,
          printers: availablePrinters,
        });
      } catch (printerError: any) {
        console.error('Error getting printers:', printerError);
        setError(printerError?.message || 'Failed to get printer information');
      }
    } catch (err: any) {
      console.error('Error checking QZ Tray status:', err);
      setError(err?.message || 'Failed to check status');
    } finally {
      setIsChecking(false);
      (window as any)._qzChecking = false;
    }
  };

  // Check status on mount and periodically
  useEffect(() => {
    // Initial check
    checkStatus();

    // Check status periodically (less aggressive)
    const interval = setInterval(() => {
      // Logic moved inside to avoid closure capture of stale state if needed, 
      // but 'isChecking' from the component's state is needed.
      // However, we MUST avoid triggering this useEffect when state changes.
      // We use a window property or just a safer check.
      if (!(window as any)._qzChecking) {
        checkStatus();
      }
    }, 20000); // 20 seconds is plenty for status updates

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // EMPTY dependencies to run only once on mount

  // Auto-connect if script is loaded but not connected (only once on mount)
  useEffect(() => {
    if (scriptLoaded && !connected && !isChecking) {
      const autoConnect = async () => {
        try {
          // Only attempt auto-connect once to avoid prompt loops
          const connection = await connectQZ();
          if (connection.isConnected) {
            await checkStatus();
          }
        } catch (err) {
          console.log('[QZ Tray] Auto-connect silently failed');
        }
      };

      const timeout = setTimeout(autoConnect, 2000);
      return () => clearTimeout(timeout);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scriptLoaded]);

  const handleManualConnect = async () => {
    if (isChecking) return;

    setIsChecking(true);
    setError(null);

    try {
      const connection = await connectQZ();
      if (connection.isConnected) {
        await checkStatus();
      } else {
        setError(connection.error || 'Failed to connect');
      }
    } catch (err: any) {
      setError(err?.message || 'Connection failed');
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div className="flex items-center gap-2 text-xs">
      {/* Script Status */}
      <div className="flex items-center gap-1" title={scriptLoaded ? 'Script Loaded' : 'Script Not Loaded'}>
        <div
          className={`w-2 h-2 rounded-full ${scriptLoaded ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
            }`}
        />
        <span className={`text-[10px] ${scriptLoaded ? 'text-green-700' : 'text-gray-500'}`}>
          Script
        </span>
      </div>

      {/* Connection Status */}
      <div className="flex items-center gap-1" title={
        connected
          ? 'Connected to QZ Tray'
          : isUntrusted
            ? 'Not Connected - Untrusted website (HTTP). Check "Remember this decision" when prompt appears.'
            : 'Not Connected to QZ Tray'
      }>
        <div
          className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500 animate-pulse' : isUntrusted ? 'bg-yellow-500' : 'bg-red-500'
            }`}
        />
        <span className={`text-[10px] ${connected ? 'text-green-700' : isUntrusted ? 'text-yellow-600' : 'text-red-600'
          }`}>
          QZ Tray
        </span>
        {isUntrusted && !connected && (
          <i className="ri-shield-cross-line text-yellow-600 text-xs" title="Untrusted website - use HTTPS or check 'Remember this decision'"></i>
        )}
      </div>

      {/* Printer Status */}
      {connected && printer && (
        <div className="flex items-center gap-1 text-green-700" title={`Default Printer: ${printer.name}`}>
          <i className="ri-printer-line text-xs"></i>
          <span className="max-w-[120px] truncate text-[10px] font-medium">
            {printer.name}
          </span>
        </div>
      )}

      {connected && !printer && (
        <div className="flex items-center gap-1 text-yellow-600" title="No default printer set">
          <i className="ri-printer-line text-xs"></i>
          <span className="text-[10px]">No Printer</span>
        </div>
      )}

      {/* Manual Connect Button - show when script loaded but not connected */}
      {scriptLoaded && !connected && !isChecking && (
        <button
          onClick={handleManualConnect}
          className="flex items-center gap-1 px-2 py-0.5 bg-blue-600 text-white text-[9px] font-bold rounded hover:bg-blue-700 transition-colors"
          title="Click to connect to QZ Tray"
        >
          <i className="ri-plug-line text-xs"></i>
          Connect
        </button>
      )}

      {/* Refresh Button - show when connected */}
      {connected && (
        <button
          onClick={checkStatus}
          disabled={isChecking}
          className="flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-600 text-[9px] font-bold rounded hover:bg-gray-200 transition-colors disabled:opacity-50"
          title="Refresh status"
        >
          <i className={`ri-refresh-line text-xs ${isChecking ? 'animate-spin' : ''}`}></i>
        </button>
      )}

      {/* Error Message - only show if not checking */}
      {error && !isChecking && (
        <div className="text-red-600 text-[9px] max-w-[150px] truncate" title={error}>
          <i className="ri-error-warning-line text-xs"></i>
        </div>
      )}

      {/* Loading Indicator */}
      {isChecking && !connected && (
        <i className="ri-loader-4-line animate-spin text-blue-500 text-xs" title="Checking status..."></i>
      )}
    </div>
  );
};
