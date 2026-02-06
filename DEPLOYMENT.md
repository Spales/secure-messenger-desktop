# Deployment & Build Guide

Complete guide for building and deploying Secure Messenger Desktop.

## Development Environment

### Requirements
- Node.js 16+ (LTS recommended)
- npm 8+ or yarn
- Git
- Platform-specific requirements:
  - macOS: Xcode Command Line Tools
  - Windows: Visual C++ Build Tools or Visual Studio
  - Linux: build-essential

### Setup
```bash
# Clone repository
git clone https://github.com/yourusername/secure-messenger-desktop.git
cd secure-messenger-desktop

# Install dependencies
npm install

# Verify setup
npm run dev  # Should open Electron window
```

## Development Workflow

### Running Development Server
```bash
npm run dev
```

This command:
1. Starts React dev server on `http://localhost:3000`
2. Starts Electron window pointing to dev server
3. Starts WebSocket server on `ws://localhost:8765`
4. Creates SQLite database at `./app.db`
5. Opens DevTools for debugging

### Hot Reload
- **React changes**: Automatically reload (React dev server)
- **Main process changes**: Requires manual app restart
- **Database changes**: Restart app

### Debugging

#### React Components
1. Open DevTools: F12 in Electron window
2. Use React DevTools extension
3. Check Console tab for errors

#### Main Process
1. Errors appear in terminal
2. Use `console.log()` for debugging
3. Check Electron logs folder

#### Redux State
1. Open DevTools console
2. Run: `store.getState()`
3. Inspect connection, chats, messages slices

## Building for Production

### Single Platform Build
```bash
npm run build
```

Builds for your current platform:
- Creates optimized React bundle
- Bundles Electron main process
- Generates platform-specific installer

### All Platforms Build
```bash
npm run build:all
```

Creates distributable packages for:
- **macOS**: `Secure Messenger Desktop.dmg`
- **Windows**: `Secure Messenger Desktop.exe`
- **Linux**: `Secure Messenger Desktop.AppImage`

### Build Output
```
dist/               # Electron build output
out/                # electron-builder output
├── Secure Messenger Desktop.dmg         # macOS
├── Secure Messenger Desktop-x64.exe     # Windows 64-bit
├── Secure Messenger Desktop-x32.exe     # Windows 32-bit
└── Secure Messenger Desktop.AppImage    # Linux
```

## Production Configuration

### environment.ts (Create if needed)
```typescript
export const config = {
  ENVIRONMENT: process.env.NODE_ENV,
  DEBUG: process.env.NODE_ENV === 'development',
  WEBSOCKET_URL: 'wss://secure-messenger.example.com',  // Use TLS in production
};
```

### Security in Production

#### DevTools
Disable in production:
```typescript
// src/main.ts
if (!isDev) {
  mainWindow.webContents.openDevTools = () => {};  // Noop
}
```

#### Source Maps
Remove or upload to secure server:
```bash
# Don't commit .map files to production builds
echo "*.map" >> .gitignore
```

#### Crash Reporting
Implement secure crash reporting:
```typescript
// src/services/security.ts
export function reportCrash(error: Error) {
  const sanitized = sanitizeCrashReport(error);
  fetch('https://secure-logger.example.com/crash', {
    method: 'POST',
    body: JSON.stringify(sanitized),
  });
}
```

## Deployment Strategies

### Manual Distribution

#### macOS
```bash
# Create DMG installer
npm run build

# Sign for distribution (requires Apple Developer certificate)
codesign --deep --force --verify --verbose \
  --sign "Developer ID Application" \
  "dist/Secure Messenger Desktop.dmg"

# Distribute via website or App Store
# (Requires App Store or enterprise certificate)
```

#### Windows
```bash
# Create EXE installer
npm run build

# Optional: Sign EXE (requires code signing certificate)
signtool sign /f certificate.pfx \
  /p password \
  "dist/Secure Messenger Desktop.exe"

# Distribute via website
# Users can download and run installer
```

#### Linux
```bash
# Create AppImage
npm run build

# Distribute .AppImage file
# Users: chmod +x, then ./Secure\ Messenger\ Desktop.AppImage
```

### Automated Deployment (CI/CD)

#### GitHub Actions Example
```yaml
name: Build and Release

on:
  push:
    tags:
      - 'v*'

jobs:
  build:
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os: [macos-latest, windows-latest, ubuntu-latest]
    
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - run: npm install
      - run: npm run build
      
      - name: Create Release
        uses: softprops/action-gh-release@v1
        with:
          files: out/*
```

#### Electron-Builder Automatic Updates
```typescript
// Enable auto-updates in production
const { autoUpdater } = require('electron-updater');

if (!isDev) {
  autoUpdater.checkForUpdatesAndNotify();
}
```

## Performance Optimization for Distribution

### Bundle Size
```bash
# Analyze bundle size
npm install --save-dev webpack-bundle-analyzer

# React build optimization already included
# Electron main process: ~2MB
# React bundle: ~200KB (gzipped)
# Total distributable: ~150MB (with node_modules)
```

### Code Splitting
Already optimized in create-react-app:
- Automatic code splitting
- Lazy loading of components
- Tree-shaking of unused code

### Asset Optimization
```
Database: ~10MB (for 20,000 messages)
Images: None (pure text app)
Fonts: System fonts (no custom)
Total app size: ~150MB (single platform)
```

## Installation Instructions for Users

### macOS
```
1. Download Secure Messenger Desktop.dmg
2. Open DMG file
3. Drag app to Applications folder
4. Open Applications folder
5. Double-click "Secure Messenger Desktop"
6. Grant permissions if prompted
```

### Windows
```
1. Download Secure Messenger Desktop.exe
2. Run the installer
3. Follow installation wizard
4. Choose installation directory
5. Click "Install"
6. Launch app from Start menu or desktop
```

### Linux
```
1. Download Secure Messenger Desktop.AppImage
2. Open terminal in download directory
3. chmod +x Secure\ Messenger\ Desktop.AppImage
4. ./Secure\ Messenger\ Desktop.AppImage
5. Or add to application menu
```

## Post-Installation

### Database Location
- **macOS**: `~/Library/Application Support/Secure Messenger Desktop/app.db`
- **Windows**: `%APPDATA%\Secure Messenger Desktop\app.db`
- **Linux**: `~/.config/Secure Messenger Desktop/app.db`

### Logs Location
- **macOS**: `~/Library/Logs/Secure Messenger Desktop/`
- **Windows**: `%APPDATA%\Secure Messenger Desktop\logs\`
- **Linux**: `~/.local/share/Secure Messenger Desktop/logs/`

### Uninstall
- **macOS**: Drag app from Applications to Trash
- **Windows**: Control Panel → Programs → Uninstall
- **Linux**: `rm -rf ~/.local/share/Secure\ Messenger\ Desktop/`

## Troubleshooting Deployment

### App Won't Start
```
Check logs:
- macOS: ~/Library/Logs/Secure Messenger Desktop/main.log
- Windows: %APPDATA%\Secure Messenger Desktop\main.log
- Linux: ~/.local/share/Secure Messenger Desktop/main.log
```

### Database Corruption
```
Delete corrupted database:
1. Locate app data folder (see Database Location)
2. Delete app.db, app.db-wal, app.db-shm
3. Restart app
4. New empty database created on launch
```

### Port Already in Use
```
Default: 8765 for WebSocket

If port in use:
- macOS: lsof -ti:8765 | xargs kill -9
- Windows: netstat -ano | findstr :8765
- Linux: lsof -i :8765
```

### Reinstall Cleanly
```bash
# Backup data if needed
# Delete app
# Delete app data folder
# Reinstall from fresh download
# On launch: auto-seed fresh database
```

## Updating Users

### Manual Update Process
1. Download new version from website
2. Close old app
3. Run new installer (overwrites old version)
4. Restart app
5. Existing database persists

### Automatic Update Process (Future)
```typescript
// With electron-updater
autoUpdater.on('update-downloaded', () => {
  dialog.showMessageBox({
    type: 'info',
    message: 'Update Available',
    buttons: ['Install Now', 'Later']
  });
});
```

## Version Numbering

Follows semver:
```
MAJOR.MINOR.PATCH
1.0.0 = First release
1.1.0 = New feature
1.0.1 = Bug fix
2.0.0 = Breaking change
```

Update in `package.json`:
```json
{
  "version": "1.0.0",
  "name": "secure-messenger-desktop"
}
```

## Release Checklist

Before releasing:
- [ ] Update version in package.json
- [ ] Update CHANGELOG.md with changes
- [ ] Run full test suite
- [ ] Test on all platforms (macOS, Windows, Linux)
- [ ] Verify installer creates shortcuts
- [ ] Test fresh install (no prior app)
- [ ] Test upgrade from previous version
- [ ] Create signed binaries (if required)
- [ ] Create release notes
- [ ] Upload to website/App Store
- [ ] Announce to users

## Security for Deployment

### Code Signing
```bash
# macOS code signing (requires developer certificate)
codesign --deep --force \
  --sign "Developer ID Application: Your Name" \
  dist/mac/Secure\ Messenger\ Desktop.app

# Windows code signing (requires code signing certificate)
signtool sign /f certificate.pfx /p password \
  dist/Secure\ Messenger\ Desktop.exe
```

### HTTPS for Updates
```typescript
// electron-updater uses HTTPS by default
// Ensure update server uses valid SSL certificate
// Pin certificate for additional security
```

### Privacy & Compliance
- No telemetry by default
- Opt-in crash reporting (if implemented)
- GDPR compliant (no data collection)
- Privacy policy in docs

## Advanced Topics

### Custom Installer
Modify `electron-builder.yml`:
```yaml
win:
  certificateFile: "path/to/cert.pfx"
  certificatePassword: "password"
  signingHashAlgorithms: ["sha256"]

mac:
  certificateFile: "path/to/cert.p12"
  certificatePassword: "password"
```

### App Store Distribution

#### macOS App Store
1. Get Apple Developer account
2. Create app record in App Store Connect
3. Sign app with distribution certificate
4. Submit for review
5. App appears in Mac App Store

#### Microsoft Store (Windows)
1. Get Microsoft Developer account
2. Create app in Partner Center
3. Package app as MSIX
4. Submit for review
5. App appears in Microsoft Store

#### Snap Store (Linux)
```bash
# Create snap package
npm install --save-dev @electron/snap
npm run build

# Push to Snap Store
snapcraft push Secure\ Messenger\ Desktop.snap \
  --release edge
```

## Maintenance

### Regular Updates
- Update dependencies monthly: `npm update`
- Check for security advisories: `npm audit`
- Test thoroughly before releasing

### Monitoring
- Track download numbers
- Monitor crash reports
- Collect user feedback
- Plan next features

### Support
- Email support for bugs/issues
- Forum for feature requests
- GitHub issues for technical discussions

## Summary

**Building**: `npm run build` or `npm run build:all`
**Distribution**: Sign and upload to website
**Installation**: Platform-specific installer/app
**Updates**: Manual download or automatic updater
**Support**: Email, forum, GitHub issues

For questions: See README.md, QUICKSTART.md, or contact support.
