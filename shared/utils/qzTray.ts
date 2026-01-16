/**
 * QZ Tray Utility Functions
 * Handles connection, printer detection, and ZPL barcode printing
 */

declare global {
  interface Window {
    qz?: any;
  }
}

export interface QZConnection {
  isConnected: boolean;
  error?: string;
}

export interface PrinterInfo {
  name: string;
  driver?: string;
}

/**
 * Check if QZ Tray script is loaded
 */
export const isQZLoaded = (): boolean => {
  return typeof window !== 'undefined' && typeof window.qz !== 'undefined';
};

/**
 * CDN URLs to try in order (2.2.5 is the working version)
 */
const QZ_CDN_URLS = [
  'https://cdn.jsdelivr.net/npm/qz-tray@2.2.5/qz-tray.js',
  'https://cdn.jsdelivr.net/npm/qz-tray@2.2.5/qz-tray.min.js',
  'https://unpkg.com/qz-tray@2.2.5/qz-tray.js',
  'https://unpkg.com/qz-tray@2.2.5/qz-tray.min.js'
];

/**
 * Load QZ Tray script dynamically with fallback CDN support
 */
export const loadQZScript = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (isQZLoaded()) {
      resolve();
      return;
    }

    if (typeof window === 'undefined') {
      reject(new Error('QZ Tray can only be loaded in browser environment'));
      return;
    }

    // Check if script tag already exists
    const existingScript = document.querySelector('script[src*="qz-tray"]');
    if (existingScript) {
      // Wait for existing script to load
      let attempts = 0;
      const maxAttempts = 50; // 5 seconds total
      const checkInterval = setInterval(() => {
        attempts++;
        if (isQZLoaded()) {
          clearInterval(checkInterval);
          resolve();
        } else if (attempts >= maxAttempts) {
          clearInterval(checkInterval);
          reject(new Error('QZ Tray script loaded but qz object not found'));
        }
      }, 100);
      return;
    }

    // Try each CDN URL until one works
    let currentIndex = 0;
    let lastError: Error | null = null;

    const tryNextCDN = () => {
      if (currentIndex >= QZ_CDN_URLS.length) {
        reject(new Error(
          `Failed to load QZ Tray from all CDN sources.\n\n` +
          `Tried URLs:\n${QZ_CDN_URLS.join('\n')}\n\n` +
          `Possible issues:\n` +
          `1. No internet connection\n` +
          `2. All CDNs are blocked\n` +
          `3. Content Security Policy restrictions\n` +
          `4. Check browser console (F12) for detailed errors`
        ));
        return;
      }

      const url = QZ_CDN_URLS[currentIndex];
      if (typeof window !== 'undefined' && (window as any).console) {
        console.log(`[QZ Tray] Attempting to load from: ${url}`);
      }

      const script = document.createElement('script');
      script.src = url;
      script.async = true;
      script.crossOrigin = 'anonymous';
      
      script.onload = () => {
        // Wait a bit for qz to be available, check multiple times
        let attempts = 0;
        const maxAttempts = 50; // 5 seconds total
        const checkInterval = setInterval(() => {
          attempts++;
          if (isQZLoaded()) {
            clearInterval(checkInterval);
            if (typeof window !== 'undefined' && (window as any).console) {
              console.log(`[QZ Tray] ✅ Loaded successfully from: ${url}`);
            }
            resolve();
          } else if (attempts >= maxAttempts) {
            clearInterval(checkInterval);
            // Try next CDN
            currentIndex++;
            tryNextCDN();
          }
        }, 100);
      };
      
      script.onerror = (error) => {
        if (typeof window !== 'undefined' && (window as any).console) {
          console.error(`[QZ Tray] ❌ Failed to load from ${url}:`, error);
        }
        lastError = new Error(`Failed to load from ${url}`);
        currentIndex++;
        tryNextCDN();
      };
      
      document.head.appendChild(script);
    };

    tryNextCDN();
  });
};

/**
 * Check if current site is trusted by QZ Tray
 */
const checkSiteTrust = (): { isTrusted: boolean; message: string } => {
  const protocol = typeof window !== 'undefined' ? window.location.protocol : '';
  const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
  
  // HTTPS is always trusted
  if (protocol === 'https:') {
    return { isTrusted: true, message: 'HTTPS connection - certificate will be trusted' };
  }
  
  // localhost is usually trusted
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return { isTrusted: true, message: 'Localhost connection - certificate prompt may appear' };
  }
  
  // HTTP on non-localhost may show "Untrusted website"
  return { 
    isTrusted: false, 
    message: 'HTTP connection detected. For better security, use HTTPS. Certificate prompt will appear.' 
  };
};

/**
 * Display helpful instructions for certificate approval
 */
const showCertificateInstructions = () => {
  if (typeof window === 'undefined' || !(window as any).console) {
    return;
  }

  console.group('%c🔒 QZ Tray Certificate Approval Required', 'color: #ff6b6b; font-weight: bold; font-size: 14px;');
  console.log('%c⚠️ IMPORTANT: To stop repeated prompts, you MUST:', 'color: #ff6b6b; font-weight: bold;');
  console.log('1. When the security prompt appears, click "Allow"');
  console.log('2. ✅ CHECK "Remember this decision" checkbox (CRITICAL!)');
  console.log('3. Click "Allow" again');
  console.log('');
  console.log('%cIf "Remember this decision" checkbox is disabled or grayed out:', 'color: #ffa500;');
  console.log('• Close QZ Tray completely');
  console.log('• Delete certificate cache:');
  console.log('  - Windows: %APPDATA%\\qz\\auth\\');
  console.log('  - macOS: ~/Library/Application Support/qz/auth/');
  console.log('  - Linux: ~/.qz/auth/');
  console.log('• Restart QZ Tray');
  console.log('• Try connecting again');
  console.groupEnd();
};

/**
 * Connect to QZ Tray with automatic certificate handling
 */
export const connectQZ = async (): Promise<QZConnection> => {
  try {
    if (!isQZLoaded()) {
      await loadQZScript();
    }

    if (!window.qz) {
      return {
        isConnected: false,
        error: 'QZ Tray is not installed or not running. Please install QZ Tray from https://qz.io/download/',
      };
    }

    // Check if already connected
    if (window.qz.websocket.isActive()) {
      return { isConnected: true };
    }

    // Check site trust status
    const trustStatus = checkSiteTrust();
    const isHTTP = typeof window !== 'undefined' && window.location.protocol === 'http:';
    const isLocalhost = typeof window !== 'undefined' && 
                       (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
    const isUntrusted = isHTTP && !isLocalhost;
    
    if (isUntrusted && typeof window !== 'undefined' && (window as any).console) {
      console.warn(`[QZ Tray] ⚠️ "Untrusted website" detected - QZ Tray may not save certificate approval`);
      console.warn(`[QZ Tray] 💡 Solution: Use HTTPS or localhost to allow certificate saving`);
      console.warn(`[QZ Tray] 💡 Current URL: ${window.location.protocol}//${window.location.hostname}`);
      console.warn(`[QZ Tray] 💡 Recommended: https://${window.location.hostname}${window.location.port ? ':' + window.location.port : ''}`);
    }
    
    // Show instructions before connecting (in case prompt appears)
    showCertificateInstructions();
    
    // Connect to QZ Tray with timeout
    // NOTE: The security prompt cannot be bypassed programmatically for security reasons
    // User MUST manually check "Remember this decision" when prompt appears
    try {
      // Set a reasonable timeout for connection (8 seconds)
      const connectPromise = window.qz.websocket.connect();
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error('Connection timeout. QZ Tray may not be running or is not responding.'));
        }, 8000);
      });

      await Promise.race([connectPromise, timeoutPromise]);
    } catch (connectError: any) {
      // If it's a timeout, provide helpful message
      if (connectError?.message?.includes('timeout')) {
        throw new Error('Connection timeout. Please ensure QZ Tray is running and try again.');
      }
      throw connectError;
    }
    
    // Provide helpful message
    if (typeof window !== 'undefined' && (window as any).console) {
      console.info('[QZ Tray] ✅ Connected successfully');
      
      // If untrusted, warn about potential issues
      if (isUntrusted) {
        console.warn('[QZ Tray] ⚠️ Since this is an "Untrusted website", QZ Tray may not save the certificate approval.');
        console.warn('[QZ Tray] 💡 To fix permanently:');
        console.warn('[QZ Tray]    1. Close QZ Tray completely');
        console.warn('[QZ Tray]    2. Delete certificate cache');
        console.warn('[QZ Tray]    3. Restart QZ Tray');
        console.warn(`[QZ Tray]    4. Use HTTPS: https://${window.location.hostname}${window.location.port ? ':' + window.location.port : ''}`);
      }
    }
    
    return { isConnected: true };
  } catch (error: any) {
    const errorMessage = error?.message || 'Failed to connect to QZ Tray. Make sure QZ Tray is running.';
    
    // Check if QZ Tray is actually running by checking for WebSocket errors
    const isWebSocketError = errorMessage.includes('WebSocket') || 
                             errorMessage.includes('ECONNREFUSED') ||
                             errorMessage.includes('timeout') ||
                             errorMessage.includes('not running');
    
    if (isWebSocketError && !errorMessage.includes('certificate') && !errorMessage.includes('trust')) {
      return {
        isConnected: false,
        error: `QZ Tray is not running or not responding.\n\n🔧 Please:\n1. Check if QZ Tray is installed\n2. Start QZ Tray application\n3. Look for QZ Tray icon in system tray/menu bar\n4. If still not working, restart QZ Tray\n\nDownload: https://qz.io/download/`,
      };
    }
    
    // If connection fails due to certificate, provide manual instructions
    if (errorMessage.includes('certificate') || errorMessage.includes('trust') || errorMessage.includes('untrusted') || errorMessage.includes('denied')) {
      const isMac = typeof navigator !== 'undefined' && navigator.platform.toLowerCase().includes('mac');
      const currentUrl = typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.hostname}${window.location.port ? ':' + window.location.port : ''}` : '';
      const httpsUrl = typeof window !== 'undefined' ? `https://${window.location.hostname}${window.location.port ? ':' + window.location.port : ''}` : '';
      
      const fixSteps = isMac 
        ? `\n\n🔧 macOS FIX for "Untrusted website" issue:\n\n1. Quit QZ Tray completely (right-click menu bar icon → Quit)\n2. Open Terminal and run:\n   rm -rf ~/Library/Application\\ Support/qz/auth/*\n3. Restart QZ Tray\n4. Try connecting again\n5. When prompt appears:\n   - Check "Remember this decision" ✅\n   - Click "Allow"\n\n💡 Better solution: Use HTTPS instead of HTTP\n   Current: ${currentUrl}\n   Recommended: ${httpsUrl}\n   This allows QZ Tray to properly save the certificate.`
        : `\n\n🔧 FIX if prompt keeps appearing:\n\n1. Close QZ Tray completely\n2. Delete certificate cache:\n   • Windows: %APPDATA%\\qz\\auth\\\n   • macOS: ~/Library/Application Support/qz/auth/\n   • Linux: ~/.qz/auth/\n3. Restart QZ Tray\n4. Try again\n\n💡 If using HTTP, switch to HTTPS to allow certificate saving.\n   Current: ${currentUrl}\n   Recommended: ${httpsUrl}`;
      
      return {
        isConnected: false,
        error: `${errorMessage}\n\n🔒 Certificate Approval Required:\n\nWhen the security prompt appears:\n1. Click "Allow"\n2. ✅ CHECK "Remember this decision" checkbox (CRITICAL!)\n3. Click "Allow" again${fixSteps}`,
      };
    }
    
    return {
      isConnected: false,
      error: errorMessage,
    };
  }
};

/**
 * Disconnect from QZ Tray
 */
export const disconnectQZ = async (): Promise<void> => {
  if (isQZLoaded() && window.qz?.websocket?.isActive()) {
    try {
      await window.qz.websocket.disconnect();
    } catch (error) {
      console.error('Error disconnecting from QZ Tray:', error);
    }
  }
};

/**
 * Get default printer
 */
export const getDefaultPrinter = async (): Promise<PrinterInfo | null> => {
  try {
    if (!isQZLoaded() || !window.qz?.websocket?.isActive()) {
      const connection = await connectQZ();
      if (!connection.isConnected) {
        throw new Error(connection.error || 'Not connected to QZ Tray');
      }
    }

    const printer = await window.qz.printers.getDefault();
    return { name: printer };
  } catch (error: any) {
    console.error('Error getting default printer:', error);
    return null;
  }
};

/**
 * Get list of available printers
 */
export const getAvailablePrinters = async (): Promise<PrinterInfo[]> => {
  try {
    if (!isQZLoaded() || !window.qz?.websocket?.isActive()) {
      const connection = await connectQZ();
      if (!connection.isConnected) {
        throw new Error(connection.error || 'Not connected to QZ Tray');
      }
    }

    const printers = await window.qz.printers.find();
    return printers.map((name: string) => ({ name }));
  } catch (error: any) {
    console.error('Error getting available printers:', error);
    return [];
  }
};

/**
 * Generate ZPL code for barcode label
 * Optimized for box labels on thermal printers (Zebra, etc.)
 */
export const generateZPLBarcode = (
  barcodeValue: string,
  options: {
    boxId?: string;
    supplier?: string;
    yarnName?: string;
    shadeCode?: string;
    yarnColour?: string;
    shadeName?: string;
    lotNumber?: string;
    labelWidth?: number; // in dots (203 DPI = ~8 inches = 1624 dots)
    labelHeight?: number; // in dots
  } = {}
): string => {
  const {
    boxId = '',
    supplier = '',
    yarnName = '',
    shadeCode = '',
    yarnColour = '',
    shadeName = '',
    lotNumber = '',
    labelWidth = 609, // 3 inches at 203 DPI (default for 4x3 labels)
    labelHeight = 406, // 2 inches at 203 DPI
  } = options;

  // ZPL commands
  // ^XA = Start of label
  // ^FO = Field Origin (x, y position)
  // ^A0 = Font 0 (default)
  // ^FD = Field Data
  // ^BY = Barcode parameters (module width, ratio, height)
  // ^BC = Code 128 barcode
  // ^XZ = End of label

  const fontSize = 20;
  const smallFontSize = 15;
  const barcodeHeight = 80;
  const lineHeight = 25;
  let yPos = 20;

  let zpl = `^XA\n`; // Start label
  zpl += `^CF0,${fontSize}\n`; // Set font

  // Box ID (top)
  if (boxId) {
    zpl += `^FO20,${yPos}^FDBox ID: ${boxId}^FS\n`;
    yPos += lineHeight + 5;
  }

  // Barcode (centered, larger)
  const barcodeY = yPos;
  zpl += `^FO20,${barcodeY}^BY3,2,${barcodeHeight}^BCN,${barcodeHeight},Y,N,N^FD${barcodeValue}^FS\n`;
  yPos += barcodeHeight + 15;

  // Barcode value text below barcode
  zpl += `^CF0,${smallFontSize}\n`;
  zpl += `^FO20,${yPos}^FD${barcodeValue}^FS\n`;
  yPos += lineHeight + 10;

  // Details section
  if (supplier || yarnName || shadeCode || yarnColour || shadeName || lotNumber) {
    zpl += `^FO20,${yPos}^GB570,1,1^FS\n`; // Horizontal line
    yPos += 5;

    if (supplier) {
      zpl += `^FO20,${yPos}^FDSupplier: ${supplier.substring(0, 30)}^FS\n`;
      yPos += lineHeight;
    }
    if (yarnName) {
      zpl += `^FO20,${yPos}^FDYarn: ${yarnName.substring(0, 30)}^FS\n`;
      yPos += lineHeight;
    }
    if (shadeCode) {
      zpl += `^FO20,${yPos}^FDShade: ${shadeCode.substring(0, 30)}^FS\n`;
      yPos += lineHeight;
    }
    if (yarnColour) {
      zpl += `^FO20,${yPos}^FDColour: ${yarnColour.substring(0, 30)}^FS\n`;
      yPos += lineHeight;
    }
    if (shadeName) {
      zpl += `^FO20,${yPos}^FDShade Name: ${shadeName.substring(0, 30)}^FS\n`;
      yPos += lineHeight;
    }
    if (lotNumber) {
      zpl += `^FO20,${yPos}^FDLot: ${lotNumber}^FS\n`;
      yPos += lineHeight;
    }
  }

  zpl += `^XZ\n`; // End label

  return zpl;
};

/**
 * Print barcode using ZPL
 */
export const printBarcode = async (
  barcodeValue: string,
  options: {
    printerName?: string;
    boxId?: string;
    supplier?: string;
    yarnName?: string;
    shadeCode?: string;
    yarnColour?: string;
    shadeName?: string;
    lotNumber?: string;
    copies?: number;
  } = {}
): Promise<{ success: boolean; error?: string }> => {
  try {
    // Ensure connected
    if (!isQZLoaded() || !window.qz?.websocket?.isActive()) {
      const connection = await connectQZ();
      if (!connection.isConnected) {
        return {
          success: false,
          error: connection.error || 'Not connected to QZ Tray',
        };
      }
    }

    // Get printer name
    let printerName = options.printerName;
    if (!printerName) {
      const defaultPrinter = await getDefaultPrinter();
      if (!defaultPrinter) {
        return {
          success: false,
          error: 'No printer found. Please set a default printer or specify a printer name.',
        };
      }
      printerName = defaultPrinter.name;
    }

    // Generate ZPL
    const zpl = generateZPLBarcode(barcodeValue, {
      boxId: options.boxId,
      supplier: options.supplier,
      yarnName: options.yarnName,
      shadeCode: options.shadeCode,
      yarnColour: options.yarnColour,
      shadeName: options.shadeName,
      lotNumber: options.lotNumber,
    });

    // Find printer and create config
    const printer = await window.qz.printers.find(printerName);
    if (!printer) {
      return {
        success: false,
        error: `Printer "${printerName}" not found`,
      };
    }

    // Create print config for raw ZPL printing
    const config = window.qz.configs.create(printer);

    // Print
    const copies = options.copies || 1;
    for (let i = 0; i < copies; i++) {
      // For raw ZPL, pass as array of strings
      await window.qz.print(config, [zpl]);
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error printing barcode:', error);
    return {
      success: false,
      error: error?.message || 'Failed to print barcode',
    };
  }
};

/**
 * Print multiple barcodes sequentially
 */
export const printMultipleBarcodes = async (
  barcodes: Array<{
    barcodeValue: string;
    boxId?: string;
    supplier?: string;
    yarnName?: string;
    shadeCode?: string;
    yarnColour?: string;
    shadeName?: string;
    lotNumber?: string;
  }>,
  options: {
    printerName?: string;
    delayBetweenPrints?: number; // milliseconds
  } = {}
): Promise<{ success: boolean; printed: number; errors: string[] }> => {
  const errors: string[] = [];
  let printed = 0;
  const delay = options.delayBetweenPrints || 500;

  for (const barcode of barcodes) {
    const result = await printBarcode(barcode.barcodeValue, {
      printerName: options.printerName,
      ...barcode,
    });

    if (result.success) {
      printed++;
    } else {
      errors.push(`${barcode.barcodeValue}: ${result.error}`);
    }

    // Small delay between prints to avoid overwhelming the printer
    if (delay > 0 && printed < barcodes.length) {
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  return {
    success: errors.length === 0,
    printed,
    errors,
  };
};
