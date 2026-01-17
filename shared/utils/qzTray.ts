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
 * Digital certificate provided by the user
 */
const QZ_CERTIFICATE = `-----BEGIN CERTIFICATE-----
MIIECzCCAvOgAwIBAgIGAZvLNfeEMA0GCSqGSIb3DQEBCwUAMIGiMQswCQYDVQQG
EwJVUzELMAkGA1UECAwCTlkxEjAQBgNVBAcMCUNhbmFzdG90YTEbMBkGA1UECgwS
UVogSW5kdXN0cmllcywgTExDMRswGQYDVQQLDBJRWiBJbmR1c3RyaWVzLCBMTEMx
HDAaBgkqhkiG9w0BCQEWDXN1cHBvcnRAcXouaW8xGjAYBgNVBAMMEVFaIFRyYXkg
RGVtbyBDZXJ0MB4XDTI2MDExNjA5MDc1MFoXDTQ2MDExNjA5MDc1MFowgaIxCzAJ
BgNVBAYTAlVTMQswCQYDVQQIDAJOWTESMBAGA1UEBwwJQ2FuYXN0b3RhMRswGQYD
VQQKDBJRWiBJbmR1c3RyaWVzLCBMTEMxGzAZBgNVBAsMElFaIEluZHVzdHJpZXMs
IExMQzEcMBoGCSqGSIb3DQEJARYNc3VwcG9ydEBxei5pbzEaMBgGA1UEAwwRUVog
VHJheSBEZW1vIENlcnQwggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAwggEKAoIBAQCy
Hq9PWKlgWckI/1+qBXc29yGQnDet70+NQYTj/FG50nnGLIK5U8seWrO0L2bisPOE
vppAZFP1l3G2pHySQ8j0z2sqTQyhwUCwKFZU3VmyApITF39AiRXtN3QfYLFFhjQq
rC7QIhwErGsg4iNmthaN5U2qkgLqoNJxoTE0o5v20aGIt2f9k8AbFbUWmgQU3Wzk
qWbfxbhl0DPOfah0aOROnwB27cnzW1Zp4aOO3IyXl6CPf1LIn0ahULVbhvjyTysj
VMzY6WD0JnOOuH7ocLZgNo63IxhD+T6N6vslhS/a2sN96B1mzu33wESIpGsryM2M
sLsATAwKBva4beD8uBDjAgMBAAGjRTBDMBIGA1UdEwEB/wQIMAYBAf8CAQEwDgYD
VR0PAQH/BAQDAgEGMB0GA1UdDgQWBBRyIL/rCEojxgVIw316Rs/Su8W51TANBgkq
hkiG9w0BAQsFAAOCAQEAWgoNjLQcfPQo/CdxwgqiCT8fYYt4y5FLqBUa3ZS+alDE
Co6TFi3KLRY9g79nGtNP1bwR8saydEvFctQd2j0kR2zwTPzQT31xqCwUyzVr8tHZ
YN0uwRc15Mzt5aDpego2DUL72XlWJg3TAU8x1/dJxjtlTmd4Z41qptlB76MsxVWr
SybDhwcFqZzsucStGMrtxnDmCl1eonLl2Q+qYzqBL7xGl4F+VIyPnzqfw3H3J0wz
kTOPGUbU9POVytVT12XsizbzWPCad7nj8Q2ioPHTnL4vFp/gtj08rEygFRmu+mIc
kJNY1UAX4y9bLlGt4fgQ+46/sbkRR8bzHIj/mb+hrg==
-----END CERTIFICATE-----`;

/**
 * Configure QZ Tray security promises for digital signing
 */
const configureQZSecurity = () => {
  if (!isQZLoaded()) return;

  // 1. Set the certificate
  window.qz.security.setCertificatePromise((resolve: any) => {
    resolve(QZ_CERTIFICATE);
  });

  // 2. Set the signature algorithm explicitly to SHA1 (common for demo certs)
  window.qz.security.setSignatureAlgorithm("SHA1");

  // 3. Set the signature promise (calls our Next.js API route)
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

    // Configure security promises (digital signing)
    configureQZSecurity();

    // Check if already connected
    if (window.qz.websocket.isActive()) {
      return { isConnected: true };
    }

    // Check site trust status (informational only, don't block)
    const trustStatus = checkSiteTrust();
    const isHTTP = typeof window !== 'undefined' && window.location.protocol === 'http:';
    const isLocalhost = typeof window !== 'undefined' &&
      (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
    const isUntrusted = isHTTP && !isLocalhost;

    // Get URLs for warning
    const currentUrl = typeof window !== 'undefined'
      ? `${window.location.protocol}//${window.location.hostname}${window.location.port ? ':' + window.location.port : ''}`
      : '';
    const httpsUrl = typeof window !== 'undefined'
      ? `https://${window.location.hostname}${window.location.port ? ':' + window.location.port : ''}`
      : '';

    // Log informational messages (but don't block connection)
    if (isUntrusted && typeof window !== 'undefined' && (window as any).console) {
      console.info(`[QZ Tray] ℹ️ HTTP connection detected - certificate prompt may appear`);
      console.info(`[QZ Tray] 💡 Tip: HTTPS allows QZ Tray to save certificate approvals automatically`);
    } else if (typeof window !== 'undefined' && (window as any).console) {
      console.info(`[QZ Tray] ✅ HTTPS connection - certificate will be trusted automatically`);
    }

    // Show instructions before connecting (in case prompt appears)
    showCertificateInstructions();

    // Show visual warning if HTTP (untrusted website)
    if (isUntrusted && typeof window !== 'undefined') {
      const isIP = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(window.location.hostname);

      // Trigger custom event to show warning modal
      window.dispatchEvent(new CustomEvent('qz-tray-untrusted-warning', {
        detail: {
          currentUrl,
          httpsUrl,
          isIP,
          hostname: window.location.hostname
        }
      }));
    }

    // Connect to QZ Tray - match HTML file approach (simple connection without timeout racing)
    // NOTE: The security prompt cannot be bypassed programmatically for security reasons
    // User MUST manually check "Remember this decision" when prompt appears
    // When "Remember this decision" is checked, connection may take longer as QZ Tray saves certificate

    try {
      // Simple connection like HTML file - no timeout racing on first attempt
      // This allows user to interact with security prompt and check "Remember this decision"
      // The connection will wait for user interaction
      await window.qz.websocket.connect();

      // Connection successful
    } catch (connectError: any) {
      // If connection fails, check if it's a certificate/trust issue
      if (connectError?.message?.includes('certificate') ||
        connectError?.message?.includes('trust') ||
        connectError?.message?.includes('untrusted') ||
        connectError?.message?.includes('denied')) {
        throw connectError;
      }

      // For other errors (like QZ Tray not running), throw immediately
      throw connectError;
    }

    // Provide helpful message
    if (typeof window !== 'undefined' && (window as any).console) {
      console.info('[QZ Tray] ✅ Connected successfully');

      // If HTTP, provide optional tip (but connection worked)
      if (isUntrusted) {
        console.info('[QZ Tray] ℹ️ Connected on HTTP - if certificate prompt keeps appearing:');
        console.info('[QZ Tray] 💡 Tip: Using HTTPS allows QZ Tray to save certificate approvals automatically');
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
      const hostname = typeof window !== 'undefined' ? window.location.hostname : '';

      const fixSteps = isMac
        ? `\n\n🔧 If certificate prompt keeps appearing or "Remember this decision" is grayed out:\n\n1. Quit QZ Tray completely\n2. Run in Terminal: rm -rf ~/Library/Application\\ Support/qz/auth/*\n3. Restart QZ Tray\n4. Reconnect and check "Remember this decision" BEFORE clicking "Allow"\n\n💡 Permanent Fix: Open QZ Tray → Site Manager → Add "${currentUrl}"`
        : `\n\n🔧 If certificate prompt keeps appearing or "Remember this decision" is grayed out:\n\n1. Close QZ Tray completely\n2. Delete folder: %APPDATA%\\qz\\auth\\\n3. Restart QZ Tray\n4. Reconnect and check "Remember this decision" BEFORE clicking "Allow"\n\n💡 Permanent Fix: Open QZ Tray → Site Manager → Add "${currentUrl}"`;

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

    // Print all barcodes
    for (const barcode of barcodes) {
      try {
        const zpl = generateZPLBarcode(barcode.barcodeValue, {
          boxId: barcode.boxId,
          supplier: barcode.supplier,
          yarnName: barcode.yarnName,
          shadeCode: barcode.shadeCode,
          yarnColour: barcode.yarnColour,
          shadeName: barcode.shadeName,
          lotNumber: barcode.lotNumber,
        });

        await window.qz.print(config, [zpl]);
        printed++;
      } catch (error: any) {
        errors.push(`${barcode.barcodeValue}: ${error?.message || 'Print failed'}`);
      }

      // Small delay between prints
      if (delay > 0 && printed < barcodes.length) {
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    return {
      success: errors.length === 0,
      printed,
      errors,
    };
  } catch (error: any) {
    return {
      success: false,
      printed,
      errors: [...errors, error?.message || 'Failed to print barcodes'],
    };
  }
};
