# QZ Tray macOS Fix - "Untrusted website" Keeps Appearing

## 🚨 Problem: Prompt Appears Even With "Remember this decision" Checked

If you're on macOS and the security prompt keeps appearing even after checking "Remember this decision", this is because:

**QZ Tray cannot save certificates for "Untrusted website" (HTTP connections)**

## ✅ Solution

### Option 1: Use HTTPS (Recommended)

1. **Access your app via HTTPS instead of HTTP:**
   ```bash
   # Instead of: http://localhost:3000
   # Use: https://localhost:3000
   ```

2. **If your dev server doesn't support HTTPS:**
   - Configure Next.js to use HTTPS in development
   - Or use a tool like `mkcert` to create local SSL certificates

### Option 2: Fix Certificate Cache (If HTTPS Not Possible)

1. **Quit QZ Tray completely:**
   - Right-click the QZ Tray icon in menu bar
   - Click "Quit QZ Tray"

2. **Delete certificate cache:**
   ```bash
   # Open Terminal and run:
   rm -rf ~/Library/Application\ Support/qz/auth/*
   ```

3. **Restart QZ Tray**

4. **Try connecting again:**
   - When prompt appears, check "Remember this decision"
   - Click "Allow"

5. **If it still doesn't work**, the issue is that HTTP sites are treated as "Untrusted" and QZ Tray won't save certificates for them. You **must** use HTTPS.

### Option 3: Add Site to QZ Tray's Trusted List (Advanced)

1. **Quit QZ Tray**

2. **Edit QZ Tray's allowed sites file:**
   ```bash
   # Open Terminal
   nano ~/Library/Application\ Support/qz/allowed.dat
   ```

3. **Add your site URL** (one per line):
   ```
   http://localhost:3000
   http://127.0.0.1:3000
   ```

4. **Save and restart QZ Tray**

## 🔍 Why This Happens on macOS

- macOS treats HTTP connections as "Untrusted website"
- QZ Tray respects this and may not save certificates for untrusted sites
- HTTPS connections are automatically trusted
- localhost with HTTPS works perfectly

## 💡 Best Practice

**Always use HTTPS for QZ Tray connections:**
- Development: `https://localhost:3000`
- Production: `https://yourdomain.com`

This ensures:
- ✅ Certificates are saved properly
- ✅ No repeated prompts
- ✅ Better security
- ✅ Works reliably

## 🛠️ Quick Fix Command

Run this in Terminal to clear cache and restart:

```bash
# Quit QZ Tray
killall "QZ Tray" 2>/dev/null

# Clear certificate cache
rm -rf ~/Library/Application\ Support/qz/auth/*

# Restart QZ Tray (if installed in Applications)
open -a "QZ Tray"
```

Then access your app via `https://localhost` instead of `http://localhost`.
