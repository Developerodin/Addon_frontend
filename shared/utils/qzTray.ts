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
 * Digital certificate fetched from the server
 */
let cachedCertificate: string | null = null;

/**
 * Fetches the digital certificate from the server API
 */
const fetchCertificate = async (): Promise<string | null> => {
  if (cachedCertificate) return cachedCertificate;

  try {
    const response = await fetch('/api/qz-tray/certificate');
    if (!response.ok) throw new Error('Failed to fetch certificate');
    const cert = await response.text();
    cachedCertificate = cert;
    return cert;
  } catch (error) {
    console.error('[QZ Tray] Error fetching certificate:', error);
    return null;
  }
};

/**
 * Configure QZ Tray security promises for digital signing
 * MUST only be called once per session
 */
let securityConfigured = false;
const configureQZSecurity = () => {
  if (!isQZLoaded() || securityConfigured) return;

  console.log('[QZ Tray] Configuring security promises (SHA1)...');

  // 1. Set the certificate
  window.qz.security.setCertificatePromise(async (resolve: any, reject: any) => {
    const cert = await fetchCertificate();
    if (cert) {
      resolve(cert);
    } else {
      reject('Could not load certificate from server');
    }
  });

  // 2. Set the signature algorithm explicitly to SHA1 (demo cert compatibility)
  window.qz.security.setSignatureAlgorithm("SHA1");

  // 3. Set the signature promise (calls our Next.js API route)
  // This must be set BEFORE connecting to allow automatic trust persistence
  window.qz.security.setSignaturePromise((toSign: string) => {
    return (resolve: any, reject: any) => {
      fetch('/api/qz-tray/sign', {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: toSign
      })
        .then(response => {
          if (!response.ok) {
            throw new Error(`Signing failed: ${response.statusText}`);
          }
          return response.text();
        })
        .then(signature => resolve(signature))
        .catch(error => {
          console.error('[QZ Tray] Signing error:', error);
          reject(error);
        });
    };
  });

  securityConfigured = true;
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
  console.log('%c⚠️ IMPORTANT: Order matters! Follow these steps:', 'color: #ff6b6b; font-weight: bold;');
  console.log('1. ✅ FIRST: CHECK "Remember this decision" checkbox (CRITICAL!)');
  console.log('2. THEN: Click "Allow" button');
  console.log('');
  console.log('%c💡 Note:', 'color: #4a90e2; font-weight: bold;');
  console.log('• After checking the checkbox, Allow button might appear disabled briefly');
  console.log('• This is normal - QZ Tray is processing the certificate');
  console.log('• Wait a moment and the button will become enabled');
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
 * Uses a singleton promise to prevent concurrent connection attempts
 */
let connectionPromise: Promise<QZConnection> | null = null;
export const connectQZ = async (): Promise<QZConnection> => {
  if (connectionPromise) {
    return connectionPromise;
  }

  connectionPromise = (async (): Promise<QZConnection> => {
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

      // Configure security promises ONCE (digital signing)
      if (!securityConfigured) {
        configureQZSecurity();
      }

      // Check if already connected
      if (window.qz.websocket.isActive()) {
        return { isConnected: true };
      }

      const isHTTP = typeof window !== 'undefined' && window.location.protocol === 'http:';
      const isLocalhost = typeof window !== 'undefined' &&
        (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
      const isUntrusted = isHTTP && !isLocalhost;

      // Show instructions before connecting (in case prompt appears)
      showCertificateInstructions();

      // Show visual warning if HTTP (untrusted website)
      if (isUntrusted && typeof window !== 'undefined') {
        const currentUrl = `${window.location.protocol}//${window.location.hostname}${window.location.port ? ':' + window.location.port : ''}`;
        const httpsUrl = `https://${window.location.hostname}${window.location.port ? ':' + window.location.port : ''}`;
        const isIP = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(window.location.hostname);

        window.dispatchEvent(new CustomEvent('qz-tray-untrusted-warning', {
          detail: { currentUrl, httpsUrl, isIP, hostname: window.location.hostname }
        }));
      }

      // Connect to QZ Tray
      try {
        await window.qz.websocket.connect();

        if (typeof window !== 'undefined' && (window as any).console) {
          console.info('[QZ Tray] ✅ Connected successfully');
          if (isUntrusted) {
            console.info('[QZ Tray] ℹ️ Connected on HTTP - if certificate prompt keeps appearing:');
            console.info('[QZ Tray] 💡 Tip: Using HTTPS or adding to "Site Manager" fixes this.');
          }
        }
        return { isConnected: true };
      } catch (connectError: any) {
        const errorMessage = connectError?.message || 'Failed to connect to QZ Tray.';

        // Handle certificate/trust errors specifically
        if (errorMessage.includes('certificate') || errorMessage.includes('trust') || errorMessage.includes('untrusted') || errorMessage.includes('denied')) {
          const isMac = typeof navigator !== 'undefined' && navigator.platform.toLowerCase().includes('mac');
          const currentUrl = typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.hostname}${window.location.port ? ':' + window.location.port : ''}` : '';

          const fixInstructions = isMac
            ? `\n\n🔧 If "Remember this decision" is grayed out:\n1. Quit QZ Tray\n2. Run: rm -rf ~/Library/Application\\ Support/qz/auth/*\n3. Restart QZ Tray\n4. Check the box BEFORE clicking Allow`
            : `\n\n🔧 If "Remember this decision" is grayed out:\n1. Close QZ Tray\n2. Delete: %APPDATA%\\qz\\auth\\\n3. Restart QZ Tray\n4. Check the box BEFORE clicking Allow`;

          return {
            isConnected: false,
            error: `${errorMessage}\n\n🔒 ACTION REQUIRED:\n1. Click "Allow"\n2. ✅ CHECK "Remember this decision"\n3. Click "Allow" again${fixInstructions}`,
          };
        }

        throw connectError;
      }
    } catch (error: any) {
      console.error('[QZ Tray] Connection error:', error);
      return {
        isConnected: false,
        error: error.message || 'Failed to connect to QZ Tray. Ensure QZ Tray is running.',
      };
    } finally {
      // Clear the promise after a small delay to prevent immediate re-attempts if it failed
      setTimeout(() => {
        connectionPromise = null;
      }, 5000);
    }
  })();

  return connectionPromise;
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
    // Handle "Request blocked" error specifically
    if (error?.message?.includes('blocked') || error?.message?.includes('Request blocked')) {
      const currentUrl = typeof window !== 'undefined'
        ? `${window.location.protocol}//${window.location.hostname}${window.location.port ? ':' + window.location.port : ''}`
        : '';

      console.error('QZ Tray Request Blocked:', {
        message: 'Your site is blocked by QZ Tray. You need to add it to QZ Tray\'s allowed list.',
        url: currentUrl,
        instructions: 'Open QZ Tray → Right-click icon → Site Manager → Click + button → Add your site URL'
      });

      // Trigger event to show instructions
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('qz-tray-request-blocked', {
          detail: { url: currentUrl }
        }));
      }
    }
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
  } = options;

  // 50mm x 70mm label at 203 DPI:
  // Width: 50mm / 25.4 * 203 ≈ 400 dots
  // Height: 70mm / 25.4 * 203 ≈ 560 dots
  const widthDots = 400;
  const heightDots = 560;

  const fontSize = 24;
  const smallFontSize = 18;
  const barcodeHeight = 100;
  const labelMargin = 20;
  const lineHeight = 30;
  let yPos = labelMargin;

  // ^XA = Start of label
  // ^PW = Print Width
  // ^LL = Label Length
  // ^FO = Field Origin
  // ^A0 = Font
  // ^FD = Field Data
  // ^BY = Barcode Scale
  // ^BC = Barcode 128

  let zpl = `^XA\n`;
  zpl += `^PW${widthDots}\n`; // Set width
  zpl += `^LL${heightDots}\n`; // Set height
  zpl += `^CF0,${fontSize}\n`; // Set default font

  // Box ID (top, bold)
  if (boxId) {
    zpl += `^FO${labelMargin},${yPos}^FDBox: ${boxId}^FS\n`;
    yPos += lineHeight + 10;
  }

  // Yarn Name
  if (yarnName) {
    zpl += `^CF0,${fontSize}\n`;
    const wrappedYarnName = yarnName.substring(0, 25);
    zpl += `^FO${labelMargin},${yPos}^FD${wrappedYarnName}^FS\n`;
    yPos += lineHeight;
  }

  // Shade & Lot on same line if possible (or separate)
  zpl += `^CF0,${smallFontSize}\n`;
  if (shadeCode) {
    zpl += `^FO${labelMargin},${yPos}^FDShade: ${shadeCode}^FS\n`;
    yPos += lineHeight;
  }
  if (lotNumber) {
    zpl += `^FO${labelMargin},${yPos}^FDLot: ${lotNumber}^FS\n`;
    yPos += lineHeight + 10;
  }

  // Barcode (centered, scaled)
  const barcodeY = yPos;
  // ^BY3 = Barcode module width 3
  zpl += `^FO${labelMargin},${barcodeY}^BY2,3,${barcodeHeight}^BCN,${barcodeHeight},Y,N,N^FD${barcodeValue}^FS\n`;
  yPos += barcodeHeight + 40;

  // Additional details if available
  zpl += `^CF0,16\n`;
  if (supplier) {
    zpl += `^FO${labelMargin},${yPos}^FDSupplier: ${supplier.substring(0, 30)}^FS\n`;
    yPos += 20;
  }
  if (yarnColour && yarnColour !== shadeCode) {
    zpl += `^FO${labelMargin},${yPos}^FDColour: ${yarnColour.substring(0, 30)}^FS\n`;
  }

  zpl += `^XZ\n`; // End label

  return zpl;
};

/**
 * Print barcode using ZPL - HTML file approach (simple and direct)
 * This matches the exact approach used in test-qz-tray.html
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
    // Ensure script is loaded (like HTML file)
    if (typeof window === 'undefined' || typeof window.qz === 'undefined') {
      if (!isQZLoaded()) {
        await loadQZScript();
      }
    }

    if (typeof window === 'undefined' || typeof window.qz === 'undefined') {
      return {
        success: false,
        error: 'QZ Tray script not loaded',
      };
    }

    // Connect if not connected (simple connection like HTML file)
    if (!window.qz.websocket.isActive()) {
      // Simple connection - no timeout, no retry logic, just like HTML file
      await window.qz.websocket.connect();
    }

    if (!window.qz.websocket.isActive()) {
      return {
        success: false,
        error: 'Not connected to QZ Tray',
      };
    }

    // Get default printer name (like HTML file)
    let printerName = options.printerName;
    if (!printerName) {
      printerName = await window.qz.printers.getDefault();
      if (!printerName) {
        return {
          success: false,
          error: 'No default printer found. Please set a default printer in your OS settings.',
        };
      }
    }

    // Find printer object (like HTML file)
    const printer = await window.qz.printers.find(printerName);
    if (!printer) {
      return {
        success: false,
        error: `Printer "${printerName}" not found`,
      };
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

    // Create print config for raw ZPL printing (like HTML file)
    const config = window.qz.configs.create(printer);

    // Print (ZPL must be passed as an array) - exactly like HTML file
    const copies = options.copies || 1;
    for (let i = 0; i < copies; i++) {
      await window.qz.print(config, [zpl]);
    }

    return { success: true };
  } catch (error: any) {
    // Handle "Request blocked" error specifically
    if (error?.message?.includes('blocked') || error?.message?.includes('Request blocked')) {
      const currentUrl = typeof window !== 'undefined'
        ? `${window.location.protocol}//${window.location.hostname}${window.location.port ? ':' + window.location.port : ''}`
        : '';

      console.error('QZ Tray Request Blocked:', {
        message: 'Your site is blocked by QZ Tray. You need to add it to QZ Tray\'s allowed list.',
        url: currentUrl,
        instructions: 'Open QZ Tray → Right-click icon → Site Manager → Click + button → Add your site URL'
      });

      // Trigger event to show instructions
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('qz-tray-request-blocked', {
          detail: { url: currentUrl }
        }));
      }

      return {
        success: false,
        error: `Request blocked by QZ Tray. Please add "${currentUrl}" to QZ Tray's allowed sites:\n\n1. Right-click QZ Tray icon (menu bar/tray)\n2. Click "Site Manager"\n3. Click the "+" button\n4. Add your site URL: ${currentUrl}\n5. Click "Close" and try again`,
      };
    }

    console.error('Error printing barcode:', error);
    return {
      success: false,
      error: error?.message || 'Failed to print barcode',
    };
  }
};

/**
 * Print multiple barcodes sequentially - HTML file approach
 * Connects once, then prints all barcodes
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

  try {
    // Connect once at the start (like HTML file approach)
    if (typeof window === 'undefined' || typeof window.qz === 'undefined') {
      if (!isQZLoaded()) {
        await loadQZScript();
      }
    }

    if (typeof window === 'undefined' || typeof window.qz === 'undefined') {
      return {
        success: false,
        printed: 0,
        errors: ['QZ Tray script not loaded'],
      };
    }

    // Connect if not connected (simple connection like HTML file)
    if (!window.qz.websocket.isActive()) {
      await window.qz.websocket.connect();
    }

    if (!window.qz.websocket.isActive()) {
      return {
        success: false,
        printed: 0,
        errors: ['Not connected to QZ Tray'],
      };
    }

    // Get printer once
    let printerName = options.printerName;
    if (!printerName) {
      printerName = await window.qz.printers.getDefault();
      if (!printerName) {
        return {
          success: false,
          printed: 0,
          errors: ['No default printer found'],
        };
      }
    }

    const printer = await window.qz.printers.find(printerName);
    if (!printer) {
      return {
        success: false,
        printed: 0,
        errors: [`Printer "${printerName}" not found`],
      };
    }

    const config = window.qz.configs.create(printer);

    // BATCH PRINTING: Combine all ZPL into a single array and send in one qz.print call
    // This minimizes security prompts and ensures all labels are sent at once
    const allLabels: string[] = [];

    for (const barcode of barcodes) {
      const zpl = generateZPLBarcode(barcode.barcodeValue, {
        boxId: barcode.boxId,
        supplier: barcode.supplier,
        yarnName: barcode.yarnName,
        shadeCode: barcode.shadeCode,
        yarnColour: barcode.yarnColour,
        shadeName: barcode.shadeName,
        lotNumber: barcode.lotNumber,
      });
      allLabels.push(zpl);
    }

    if (allLabels.length > 0) {
      await window.qz.print(config, allLabels);
      printed = allLabels.length;
    }

    return {
      success: true,
      printed,
      errors: [],
    };
  } catch (error: any) {
    return {
      success: false,
      printed,
      errors: [...errors, error?.message || 'Failed to print barcodes'],
    };
  }
};
