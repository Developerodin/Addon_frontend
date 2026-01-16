/**
 * QZ Tray Test Utility
 * Run these functions in browser console to test QZ Tray setup
 */

declare global {
  interface Window {
    qz?: any;
    testQZTray?: typeof testQZTray;
  }
}

export const testQZTray = {
  /**
   * Test 1: Check if QZ Tray script is loaded
   */
  async testScriptLoad(): Promise<string> {
    if (typeof window === 'undefined') {
      return '❌ Cannot test in server environment';
    }

    if (typeof window.qz === 'undefined') {
      return '❌ QZ Tray script not loaded!\n\nMake sure:\n1. Internet connection is available\n2. Script loads from CDN\n3. No CSP blocking the script';
    }

    const version = window.qz.version || 'Unknown';
    const isActive = window.qz.websocket.isActive();
    
    return `✅ QZ Tray script loaded!\n\nVersion: ${version}\nWebSocket Active: ${isActive}`;
  },

  /**
   * Test 2: Test connection to QZ Tray
   */
  async testConnection(): Promise<string> {
    if (typeof window === 'undefined') {
      return '❌ Cannot test in server environment';
    }

    if (typeof window.qz === 'undefined') {
      return '❌ QZ Tray script not loaded!';
    }

    try {
      if (window.qz.websocket.isActive()) {
        return '✅ Already connected to QZ Tray!';
      }

      await window.qz.websocket.connect();
      return '✅ Successfully connected to QZ Tray!\n\nCertificate accepted. Connection established.';
    } catch (error: any) {
      return `❌ Connection failed!\n\nError: ${error.message}\n\nPossible issues:\n1. QZ Tray is not running\n2. Certificate was rejected\n3. Firewall blocking\n4. Port 8181 blocked\n\nSolution: Install and start QZ Tray from https://qz.io/download/`;
    }
  },

  /**
   * Test 3: Get available printers
   */
  async testPrinters(): Promise<string> {
    if (typeof window === 'undefined') {
      return '❌ Cannot test in server environment';
    }

    try {
      if (typeof window.qz === 'undefined' || !window.qz.websocket.isActive()) {
        const connection = await this.testConnection();
        if (!connection.includes('✅')) {
          return '❌ Not connected to QZ Tray. Connection failed.';
        }
      }

      const printers = await window.qz.printers.find();
      
      if (printers.length === 0) {
        return '⚠️ No printers found!\n\nMake sure:\n1. Printer is connected (USB/Network)\n2. Printer drivers installed\n3. Printer is powered on';
      }

      let result = `✅ Found ${printers.length} printer(s):\n\n`;
      printers.forEach((printer: string, index: number) => {
        result += `${index + 1}. ${printer}\n`;
      });
      
      return result;
    } catch (error: any) {
      return `❌ Failed to get printers!\n\nError: ${error.message}`;
    }
  },

  /**
   * Test 4: Get default printer
   */
  async testDefaultPrinter(): Promise<string> {
    if (typeof window === 'undefined') {
      return '❌ Cannot test in server environment';
    }

    try {
      if (typeof window.qz === 'undefined' || !window.qz.websocket.isActive()) {
        const connection = await this.testConnection();
        if (!connection.includes('✅')) {
          return '❌ Not connected to QZ Tray. Connection failed.';
        }
      }

      const printer = await window.qz.printers.getDefault();
      
      if (!printer) {
        return '⚠️ No default printer set!\n\nPlease set a default printer in your OS settings:\n- Windows: Settings → Devices → Printers\n- macOS: System Preferences → Printers & Scanners';
      }

      return `✅ Default Printer:\n\n${printer}\n\nThis printer will be used for barcode printing.`;
    } catch (error: any) {
      return `❌ Failed to get default printer!\n\nError: ${error.message}\n\nMake sure a default printer is set in your OS.`;
    }
  },

  /**
   * Test 5: Test print a barcode
   */
  async testPrint(barcodeValue: string = 'TEST123456'): Promise<string> {
    if (typeof window === 'undefined') {
      return '❌ Cannot test in server environment';
    }

    try {
      if (typeof window.qz === 'undefined' || !window.qz.websocket.isActive()) {
        const connection = await this.testConnection();
        if (!connection.includes('✅')) {
          return '❌ Not connected to QZ Tray. Connection failed.';
        }
      }

      const printerName = await window.qz.printers.getDefault();
      if (!printerName) {
        return '❌ No default printer found!\n\nPlease set a default printer in your OS settings.';
      }

      // Find printer and create config
      const printer = await window.qz.printers.find(printerName);
      if (!printer) {
        return `❌ Printer "${printerName}" not found!`;
      }

      // Generate simple ZPL barcode
      const zpl = `^XA
^FO20,20^A0N,25,25^FDTest Barcode^FS
^FO20,60^BY3,2,80^BCN,80,Y,N,N^FD${barcodeValue}^FS
^FO20,150^A0N,20,20^FD${barcodeValue}^FS
^XZ`;

      // Create print config for raw ZPL printing
      const config = window.qz.configs.create(printer);
      await window.qz.print(config, [zpl]);
      
      return `✅ Print job sent successfully!\n\nPrinter: ${printerName}\nBarcode: ${barcodeValue}\n\nCheck your printer for the output.`;
    } catch (error: any) {
      return `❌ Print failed!\n\nError: ${error.message}\n\nPossible issues:\n1. Printer is offline\n2. Printer driver issue\n3. Invalid ZPL format\n4. Printer queue is full`;
    }
  },

  /**
   * Test 6: Full system check
   */
  async fullTest(): Promise<string> {
    if (typeof window === 'undefined') {
      return '❌ Cannot test in server environment';
    }

    let results = '🔍 QZ Tray Full System Test\n\n';
    results += '='.repeat(50) + '\n\n';

    // Test 1: Script Load
    results += '1. Script Loading:\n';
    const scriptTest = await this.testScriptLoad();
    results += scriptTest + '\n\n';

    // Test 2: Connection
    results += '2. Connection:\n';
    const connectionTest = await this.testConnection();
    results += connectionTest + '\n\n';

    // Test 3: Printers
    results += '3. Printer Detection:\n';
    const printerTest = await this.testPrinters();
    results += printerTest + '\n\n';

    // Test 4: Default Printer
    results += '4. Default Printer:\n';
    const defaultPrinterTest = await this.testDefaultPrinter();
    results += defaultPrinterTest + '\n\n';

    results += '='.repeat(50) + '\n';
    results += 'Test Complete!\n\n';

    const allPassed = 
      scriptTest.includes('✅') &&
      connectionTest.includes('✅') &&
      printerTest.includes('✅') &&
      defaultPrinterTest.includes('✅');

    if (allPassed) {
      results += '✅ All tests passed! QZ Tray is ready to use.';
    } else {
      results += '⚠️ Some tests failed. Please review the errors above.';
    }

    return results;
  }
};

// Make available globally for browser console testing
if (typeof window !== 'undefined') {
  window.testQZTray = testQZTray;
}
