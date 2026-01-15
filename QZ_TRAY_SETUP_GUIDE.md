# QZ Tray Setup Guide

Complete guide for installing and configuring QZ Tray for silent barcode printing.

## Table of Contents

1. [What is QZ Tray?](#what-is-qz-tray)
2. [System Requirements](#system-requirements)
3. [Installation](#installation)
4. [Configuration](#configuration)
5. [Testing](#testing)
6. [Troubleshooting](#troubleshooting)
7. [Security & Permissions](#security--permissions)

---

## What is QZ Tray?

QZ Tray is a cross-platform application that enables web applications to communicate with local printers, scanners, and other hardware devices. It acts as a bridge between your browser and local hardware, allowing silent printing without browser print dialogs.

**Why we use it:**
- Silent printing directly to thermal/Zebra printers
- No browser print dialog interruption
- Supports ZPL (Zebra Programming Language) for barcode labels
- Works with local printers connected to the user's machine

---

## System Requirements

### Supported Operating Systems
- **Windows**: Windows 7, 8, 10, 11 (32-bit and 64-bit)
- **macOS**: macOS 10.12 (Sierra) or later
- **Linux**: Ubuntu 16.04+, Debian 9+, Fedora 28+, CentOS 7+

### Browser Requirements
- **Chrome/Edge**: Version 60+ (recommended)
- **Firefox**: Version 55+
- **Safari**: Version 11+ (macOS only)

### Network Requirements
- **HTTPS connection** (required for security)
- OR **localhost** (for development)
- Port **8181** must be available (default QZ Tray port)

---

## Installation

### Step 1: Download QZ Tray

1. Visit the official QZ Tray download page:
   ```
   https://qz.io/download/
   ```

2. Select your operating system:
   - **Windows**: Download `qz-tray-2.x.x.exe`
   - **macOS**: Download `qz-tray-2.x.x.pkg`
   - **Linux**: Download appropriate package for your distribution

### Step 2: Install QZ Tray

#### Windows Installation

1. **Run the installer** (`qz-tray-2.x.x.exe`)
2. **Follow the installation wizard**:
   - Click "Next" on the welcome screen
   - Accept the license agreement
   - Choose installation location (default is fine)
   - Click "Install"
   - Click "Finish" when complete

3. **Verify installation**:
   - Look for QZ Tray icon in the system tray (bottom-right corner)
   - If not visible, search for "QZ Tray" in Start menu and launch it

#### macOS Installation

1. **Open the downloaded `.pkg` file**
2. **Follow the installation wizard**:
   - Click "Continue" on the introduction screen
   - Read and accept the license agreement
   - Select installation location (default is fine)
   - Click "Install"
   - Enter your macOS password when prompted
   - Click "Close" when complete

3. **Launch QZ Tray**:
   - Open Applications folder
   - Double-click "QZ Tray" to launch
   - Look for QZ Tray icon in the menu bar (top-right corner)

#### Linux Installation

**Ubuntu/Debian:**
```bash
# Download the .deb package
wget https://github.com/qzind/tray/releases/download/v2.3/qz-tray-2.3.deb

# Install using dpkg
sudo dpkg -i qz-tray-2.3.deb

# Fix any dependency issues
sudo apt-get install -f

# Launch QZ Tray
qz-tray
```

**Fedora/CentOS:**
```bash
# Download the .rpm package
wget https://github.com/qzind/tray/releases/download/v2.3/qz-tray-2.3.rpm

# Install using rpm
sudo rpm -i qz-tray-2.3.rpm

# Launch QZ Tray
qz-tray
```

### Step 3: Verify QZ Tray is Running

1. **Check system tray/menu bar**:
   - **Windows**: Look for QZ Tray icon in system tray (bottom-right)
   - **macOS**: Look for QZ Tray icon in menu bar (top-right)
   - **Linux**: Check system tray or run `ps aux | grep qz-tray`

2. **Right-click the icon** (Windows/Linux) or **click the icon** (macOS):
   - You should see a menu with options
   - Select "About" to verify version

3. **Test connection**:
   - Open a browser and navigate to: `https://qz.io/api/`
   - You should see QZ Tray API information if it's running

---

## Configuration

### Step 1: Set Default Printer

Before printing, ensure your thermal/Zebra printer is set as the default printer:

#### Windows

1. Open **Settings** → **Devices** → **Printers & scanners**
2. Find your thermal/Zebra printer in the list
3. Click on it and select **"Set as default"**
4. Verify it shows "Default" below the printer name

**Alternative method:**
1. Press `Windows + R` to open Run dialog
2. Type `control printers` and press Enter
3. Right-click your printer → **"Set as default printer"**

#### macOS

1. Open **System Preferences** → **Printers & Scanners**
2. Select your thermal/Zebra printer from the list
3. Click **"Options & Supplies"**
4. Click **"Set Default Printer"** dropdown
5. Select your printer

**Alternative method:**
1. Open **System Preferences** → **Printers & Scanners**
2. Right-click your printer → **"Set Default Printer"**

#### Linux

```bash
# List available printers
lpstat -p -d

# Set default printer
lpoptions -d "PRINTER_NAME"
```

### Step 2: Configure Printer Settings

#### Label Size Configuration

The application uses default label size of **3" x 2"** (609 x 406 dots at 203 DPI).

If your labels are different sizes, you may need to adjust the ZPL template in:
```
shared/utils/qzTray.ts
```

Look for the `generateZPLBarcode` function and modify:
```typescript
labelWidth = 609,  // Adjust based on your label width
labelHeight = 406, // Adjust based on your label height
```

**Common label sizes:**
- 4" x 3": 812 x 609 dots (203 DPI)
- 4" x 2": 812 x 406 dots (203 DPI)
- 3" x 2": 609 x 406 dots (203 DPI) ← Default
- 2" x 1": 406 x 203 dots (203 DPI)

---

## Security & Permissions

### First Connection Certificate

When you first use QZ Tray from the web application:

1. **Certificate prompt will appear**:
   - Browser will show a security warning
   - QZ Tray will ask for permission to connect

2. **Click "Allow"**:
   - Check **"Remember this decision"** checkbox
   - Click **"Allow"** or **"Yes"**

3. **This is a one-time setup** - future connections will be automatic

### macOS Specific Permissions

#### Accessibility Permission (Required)

1. Open **System Preferences** → **Security & Privacy** → **Privacy** tab
2. Select **"Accessibility"** from the left sidebar
3. Click the **lock icon** (bottom-left) and enter your password
4. Find **"QZ Tray"** in the list
5. **Check the checkbox** next to QZ Tray
6. If QZ Tray is not in the list:
   - Click the **"+"** button
   - Navigate to `/Applications/QZ Tray.app`
   - Add it to the list
   - Check the checkbox

#### Firewall Permission (If Blocked)

1. Open **System Preferences** → **Security & Privacy** → **Firewall** tab
2. Click **"Firewall Options"** (if firewall is enabled)
3. Find **"QZ Tray"** in the list
4. Set it to **"Allow incoming connections"**
5. If not in list, click **"+"** and add QZ Tray

### Windows Specific Permissions

#### Firewall Permission (If Blocked)

1. Open **Windows Defender Firewall**:
   - Press `Windows + R`
   - Type `firewall.cpl` and press Enter

2. Click **"Allow an app or feature through Windows Defender Firewall"**

3. Find **"QZ Tray"** in the list:
   - Check both **"Private"** and **"Public"** checkboxes
   - If not found, click **"Allow another app"** and browse to QZ Tray

#### Antivirus Exceptions

Some antivirus software may flag QZ Tray. If you encounter issues:

1. Add QZ Tray to your antivirus exceptions/whitelist
2. Common antivirus locations:
   - **Windows Defender**: Settings → Virus & threat protection → Exclusions
   - **Norton**: Settings → Antivirus → Scans and Risks → Exclusions
   - **McAfee**: Real-Time Scanning → Excluded Files

---

## Testing

### Test 1: Verify QZ Tray is Running

1. Open your browser's developer console (F12)
2. Navigate to your application
3. Open the console and type:
   ```javascript
   console.log(typeof window.qz);
   ```
4. Should output: `"object"` (if QZ Tray is loaded)

### Test 2: Test Connection

1. In browser console, type:
   ```javascript
   window.qz.websocket.connect().then(() => {
     console.log('Connected to QZ Tray!');
   }).catch(err => {
     console.error('Connection failed:', err);
   });
   ```
2. You should see "Connected to QZ Tray!" message

### Test 3: Test Printer Detection

1. In browser console, type:
   ```javascript
   window.qz.printers.getDefault().then(printer => {
     console.log('Default printer:', printer);
   }).catch(err => {
     console.error('Error:', err);
   });
   ```
2. Should output your default printer name

### Test 4: Test Print Function

1. Navigate to the purchase order processing page
2. Click **"Print All Barcodes"** or **"Print Lot Barcodes"**
3. Check for:
   - Success toast message
   - Barcode printed on your thermal printer
   - No browser print dialog appears

---

## Troubleshooting

### Issue: "QZ Tray is not running"

**Symptoms:**
- Error message: "QZ Tray is not installed or not running"
- Connection fails

**Solutions:**
1. **Check if QZ Tray is running**:
   - Windows: Check system tray for QZ Tray icon
   - macOS: Check menu bar for QZ Tray icon
   - Linux: Run `ps aux | grep qz-tray`

2. **If not running, launch QZ Tray**:
   - Windows: Start menu → Search "QZ Tray" → Launch
   - macOS: Applications → QZ Tray → Double-click
   - Linux: Run `qz-tray` from terminal

3. **Set QZ Tray to start on boot**:
   - Windows: Right-click QZ Tray icon → Settings → Enable "Start with Windows"
   - macOS: System Preferences → Users & Groups → Login Items → Add QZ Tray
   - Linux: Add to startup applications or systemd service

### Issue: "No printer found"

**Symptoms:**
- Error message: "No printer found. Please set a default printer"

**Solutions:**
1. **Verify printer is connected**:
   - Check USB cable (if USB printer)
   - Check network connection (if network printer)
   - Verify printer is powered on

2. **Set default printer** (see Configuration section above)

3. **Check printer drivers**:
   - Ensure printer drivers are installed
   - Reinstall drivers if necessary

4. **Test printer from OS**:
   - Print a test page from OS printer settings
   - If OS can't print, fix printer issues first

### Issue: "Connection failed" or Certificate Error

**Symptoms:**
- Browser shows security warning
- Connection timeout errors

**Solutions:**
1. **Accept certificate on first connection**:
   - Click "Allow" when prompted
   - Check "Remember this decision"

2. **Check HTTPS requirement**:
   - QZ Tray requires HTTPS (or localhost)
   - Ensure you're using `https://` not `http://`

3. **Check firewall settings** (see Security & Permissions section)

4. **Check port 8181**:
   - Ensure port 8181 is not blocked
   - Check if another application is using the port

### Issue: "Barcode prints but is unreadable"

**Symptoms:**
- Printer prints but barcode is too small/large
- Barcode is cut off
- Barcode is not scannable

**Solutions:**
1. **Adjust label size in code**:
   - Edit `shared/utils/qzTray.ts`
   - Modify `labelWidth` and `labelHeight` in `generateZPLBarcode`

2. **Check printer DPI settings**:
   - Most Zebra printers use 203 DPI
   - Some use 300 DPI (adjust calculations accordingly)

3. **Adjust barcode height**:
   - In `generateZPLBarcode`, modify `barcodeHeight` value
   - Increase for larger barcodes, decrease for smaller

4. **Check label alignment**:
   - Use printer's calibration feature
   - Adjust label position in printer settings

### Issue: "Permission denied" (macOS)

**Symptoms:**
- macOS shows permission error
- QZ Tray can't access printer

**Solutions:**
1. **Grant Accessibility permission** (see Security & Permissions section)

2. **Restart QZ Tray** after granting permissions:
   - Quit QZ Tray completely
   - Relaunch QZ Tray
   - Try printing again

3. **Check System Integrity Protection (SIP)**:
   - Usually not an issue, but verify SIP is not blocking QZ Tray

### Issue: "Print job stuck" or "Nothing prints"

**Symptoms:**
- Click print but nothing happens
- No error message but no printout

**Solutions:1. **Check printer queue**:
   - Windows: Settings → Devices → Printers → Right-click printer → "See what's printing"
   - macOS: System Preferences → Printers & Scanners → Open Print Queue
   - Clear any stuck print jobs

2. **Restart QZ Tray**:
   - Quit QZ Tray completely
   - Relaunch QZ Tray
   - Try printing again

3. **Restart printer**:
   - Power off printer
   - Wait 10 seconds
   - Power on printer
   - Try printing again

4. **Check printer status**:
   - Verify printer is online (not offline)
   - Check for error lights on printer
   - Ensure printer has paper/labels

### Issue: "Script loading failed"

**Symptoms:**
- Error: "Failed to load QZ Tray script"
- `window.qz` is undefined

**Solutions:**
1. **Check internet connection**:
   - QZ Tray script loads from CDN
   - Ensure internet is available

2. **Check browser console**:
   - Look for network errors
   - Verify script URL is accessible

3. **Check Content Security Policy (CSP)**:
   - If your app has CSP, ensure it allows `https://cdn.jsdelivr.net`

---

## Advanced Configuration

### Custom Printer Selection

If you want to use a specific printer instead of default:

```typescript
import { printBarcode } from '@/shared/utils/qzTray';

await printBarcode('BARCODE123', {
  printerName: 'Zebra ZT410', // Specify printer name
  // ... other options
});
```

### Adjust Print Delay

For faster printing (may cause issues with some printers):

```typescript
import { printMultipleBarcodes } from '@/shared/utils/qzTray';

await printMultipleBarcodes(barcodes, {
  delayBetweenPrints: 200, // Reduce from default 500ms
});
```

### Custom ZPL Template

Modify `generateZPLBarcode` in `shared/utils/qzTray.ts` to customize label layout, fonts, and fields.

---

## Support & Resources

### Official Resources

- **QZ Tray Website**: https://qz.io/
- **Documentation**: https://qz.io/docs/
- **GitHub**: https://github.com/qzind/tray
- **Support Forum**: https://qz.io/support/

### Application-Specific Help

For issues specific to this application:
1. Check browser console for errors
2. Review error messages in toast notifications
3. Contact your system administrator
4. Refer to application logs

---

## Quick Reference Checklist

Use this checklist for initial setup:

- [ ] QZ Tray downloaded and installed
- [ ] QZ Tray is running (icon visible in system tray/menu bar)
- [ ] Default printer is set
- [ ] Printer is connected and powered on
- [ ] Printer drivers are installed
- [ ] Test print from OS works
- [ ] Certificate accepted on first connection
- [ ] macOS: Accessibility permission granted (if macOS)
- [ ] Firewall allows QZ Tray (if prompted)
- [ ] Test print from application works

---

## Version Information

- **QZ Tray Version**: 2.3+ (recommended)
- **Last Updated**: 2024
- **Application Version**: See package.json

---

**Need Help?** Contact your IT support or refer to the troubleshooting section above.
