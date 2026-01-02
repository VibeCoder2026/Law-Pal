# PDF Loading Fix

## Issue Found

First build failed to load PDFs with error:
```
Failed to load PDF. Make sure PDFs are accessible.
Ch_003_02_Chapter_003_02_High_Court_Act.pdf
```

## Root Cause

The PDF source URI was using a relative file path that doesn't work with bundled assets in production builds:

```typescript
// ❌ WRONG - Doesn't work in production
const pdfSource = {
  uri: `file://${FileSystem.documentDirectory}../../../law_sources/${pdfFilename}`,
  cache: true,
};
```

In development, this might work because files are in the project directory. But in a production APK, all assets are bundled and need to be accessed via the bundle directory.

## Fix Applied

Updated ActPdfViewerScreen.tsx to properly locate bundled PDFs:

```typescript
// ✅ CORRECT - Works in production builds
const loadPdfAsset = async () => {
  // Try bundled asset path (Android production build)
  const bundlePath = `${FileSystem.bundleDirectory}law_sources/${pdfFilename}`;

  const fileInfo = await FileSystem.getInfoAsync(bundlePath);
  if (fileInfo.exists) {
    setPdfUri(bundlePath);
  } else {
    // Fallback to asset:// protocol for Android
    setPdfUri(`bundle-assets://law_sources/${pdfFilename}`);
  }
};
```

## How Bundled Assets Work

When you build an APK with `assetBundlePatterns` in app.json:

```json
"assetBundlePatterns": [
  "assets/**",
  "law_sources/**"  // ← PDFs get bundled here
]
```

The files are packaged into the APK at build time and accessible via:
- `FileSystem.bundleDirectory` (points to bundled assets)
- `bundle-assets://` protocol (Android-specific)

## Testing

Rebuild with:
```bash
npx eas build --platform android --profile production
```

Then test same flow:
1. Open app
2. Acts & Statutes → Select tier → Select Act
3. PDF should now load successfully

## Debug Logging Added

Added console logs to track PDF loading:
- `[ActPdfViewer] Loading PDF: {filename}`
- `[ActPdfViewer] Trying bundle path: {path}`
- `[ActPdfViewer] PDF found in bundle` or fallback message
- `[ActPdfViewer] PDF source: {uri}`

Check emulator logs to see which path works.



