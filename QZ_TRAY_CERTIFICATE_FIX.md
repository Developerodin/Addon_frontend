# QZ Tray Certificate Prompt - Quick Fix Guide

## 🚨 Problem: Security Prompt Keeps Appearing

If you're seeing the QZ Tray security prompt repeatedly, follow these steps **exactly**:

## ✅ Solution: One-Time Fix

### Step 1: When the Prompt Appears

1. **DO NOT** just click "Allow" and close
2. **LOOK FOR** the checkbox that says **"Remember this decision"**
3. **CHECK** that checkbox ✅ (This is CRITICAL!)
4. **THEN** click "Allow"

### Step 2: If "Remember this decision" is Disabled/Grayed Out

This means QZ Tray's certificate cache is corrupted. Fix it:

#### Windows:
```bash
# 1. Close QZ Tray completely (right-click tray icon → Exit)

# 2. Delete certificate cache
# Press Windows + R, type: %APPDATA%\qz\auth
# Delete all files in that folder

# 3. Restart QZ Tray
# 4. Try connecting again
```

#### macOS:
```bash
# 1. Quit QZ Tray completely (right-click menu bar icon → Quit)

# 2. Delete certificate cache
rm -rf ~/Library/Application\ Support/qz/auth/*

# 3. Restart QZ Tray
# 4. Try connecting again
```

#### Linux:
```bash
# 1. Close QZ Tray completely

# 2. Delete certificate cache
rm -rf ~/.qz/auth/*

# 3. Restart QZ Tray
# 4. Try connecting again
```

### Step 3: Verify It's Fixed

After following Step 1 or Step 2:
1. Try printing again
2. If prompt appears, **check "Remember this decision"** again
3. After that, the prompt should **NOT** appear again

## 🔍 Why This Happens

- QZ Tray requires manual approval for security
- The "Remember this decision" checkbox stores the approval permanently
- If you don't check it, QZ Tray can't remember your choice
- Corrupted certificate cache can disable the checkbox

## ⚠️ Important Notes

- **You CANNOT bypass this programmatically** - it's a security feature
- **You MUST check "Remember this decision"** - there's no workaround
- **The checkbox MUST be enabled** - if it's grayed out, clear the cache (Step 2)

## 🆘 Still Not Working?

If the prompt still appears after following all steps:

1. **Check QZ Tray version**: Should be 2.2.5 or later
2. **Check if using HTTPS**: Use `https://localhost` instead of `http://localhost` if possible
3. **Restart QZ Tray**: Sometimes a restart helps
4. **Check QZ Tray logs**: Look for errors in QZ Tray's console/logs
5. **Reinstall QZ Tray**: As a last resort, uninstall and reinstall QZ Tray

## 📝 Quick Checklist

- [ ] Prompt appeared
- [ ] Found "Remember this decision" checkbox
- [ ] Checked the checkbox ✅
- [ ] Clicked "Allow"
- [ ] Tried printing again
- [ ] Prompt did NOT appear again ✅

If any step fails, follow Step 2 above to clear the certificate cache.
