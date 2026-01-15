# QZ Tray Barcode Printing Integration

## Overview

This integration enables silent barcode printing directly to local printers (Zebra/thermal printers) using QZ Tray, bypassing the browser print dialog.

## Files Created

1. **`shared/utils/qzTray.ts`** - Core QZ Tray utilities:
   - `connectQZ()` - Connect to QZ Tray
   - `getDefaultPrinter()` - Get default printer
   - `printBarcode()` - Print single barcode using ZPL
   - `printMultipleBarcodes()` - Print multiple barcodes sequentially
   - `generateZPLBarcode()` - Generate ZPL code for barcode labels

2. **`shared/components/qzTray/QZTrayLoader.tsx`** - Script loader component
3. **`shared/components/qzTray/PrintBarcodeButton.tsx`** - Reusable print button component

## Setup Requirements

### 1. Install QZ Tray

**Windows:**
- Download from: https://qz.io/download/
- Install the QZ Tray application
- Ensure it's running (check system tray icon)

**Mac:**
- Download from: https://qz.io/download/
- Install the QZ Tray application
- On first run, you may need to allow accessibility permissions:
  - System Preferences → Security & Privacy → Privacy → Accessibility
  - Enable QZ Tray
- Ensure it's running (check menu bar icon)

### 2. Printer Setup

- Set your thermal/Zebra printer as the default printer in your OS
- Or specify printer name in the print functions
- Ensure printer drivers are installed and printer is connected

### 3. Browser Permissions

- QZ Tray requires HTTPS or localhost for security
- First connection will prompt for certificate approval (click "Allow" permanently)

## Usage

### Basic Usage in Components

```tsx
import { QZTrayLoader } from '@/shared/components/qzTray';
import { printBarcode } from '@/shared/utils/qzTray';

// In your component
<QZTrayLoader />

// Print a barcode
await printBarcode('BARCODE123', {
  boxId: 'BOX001',
  supplier: 'Supplier Name',
  yarnName: '40s Cotton',
  shadeCode: 'SH001',
  lotNumber: 'LOT001',
});
```

### Using PrintBarcodeButton Component

```tsx
import { PrintBarcodeButton } from '@/shared/components/qzTray';

<PrintBarcodeButton
  barcode="BARCODE123"
  boxId="BOX001"
  supplier="Supplier Name"
  yarnName="40s Cotton"
  shadeCode="SH001"
  lotNumber="LOT001"
  variant="primary"
/>
```

## ZPL Label Format

The ZPL template is optimized for box labels:
- **Default size**: 3" x 2" (609 x 406 dots at 203 DPI)
- **Barcode**: Code 128 format
- **Fields included**:
  - Box ID
  - Barcode value
  - Supplier
  - Yarn Name
  - Shade Code
  - Yarn Colour
  - Shade Name
  - Lot Number

## Mac & Windows Compatibility Notes

### Mac Specific

1. **Accessibility Permissions**: Required on macOS
   - System Preferences → Security & Privacy → Privacy → Accessibility
   - Enable QZ Tray checkbox

2. **Firewall**: May need to allow QZ Tray through firewall
   - System Preferences → Security & Privacy → Firewall
   - Click "Firewall Options" and allow QZ Tray

3. **Certificate Trust**: First connection requires certificate approval
   - Click "Allow" and check "Remember this decision"

### Windows Specific

1. **Windows Firewall**: May prompt on first connection
   - Click "Allow access" when prompted

2. **Antivirus**: Some antivirus software may flag QZ Tray
   - Add QZ Tray to exceptions if needed

3. **Certificate Trust**: First connection requires certificate approval
   - Click "Allow" and check "Remember this decision"

## Error Handling

The implementation handles common errors:
- QZ Tray not running → Shows error with download link
- Printer not found → Shows error to set default printer
- Connection failures → Shows specific error messages
- Print failures → Logs errors and shows user-friendly messages

## Troubleshooting

1. **QZ Tray not connecting**:
   - Ensure QZ Tray is running (check system tray/menu bar)
   - Check browser console for errors
   - Verify HTTPS/localhost requirement

2. **Printer not found**:
   - Set default printer in OS settings
   - Or specify printer name in print functions
   - Verify printer is connected and powered on

3. **Barcode not printing**:
   - Check printer connection
   - Verify ZPL format is supported (Zebra printers)
   - Check printer settings (label size, DPI)

4. **Permission errors (Mac)**:
   - Grant accessibility permissions
   - Restart QZ Tray after granting permissions

## Production Considerations

- QZ Tray must be installed on each user's machine
- Consider providing installation instructions for end users
- Test on both Mac and Windows before deployment
- Monitor error logs for connection issues
- Provide fallback to browser print if QZ Tray unavailable (optional)
