# Production Build Steps - Final APK

## Prerequisites

You need an Expo account (free): https://expo.dev/signup

## Step 1: Login to EAS

```bash
npx eas login
```

Enter your Expo username and password.

## Step 2: Build Production APK

```bash
npx eas build --platform android --profile production
```

Notes:
- EAS builds use `app.config.js` (the local `android/` folder is excluded via `.easignore`).
- `newArchEnabled` is set to `false` for release stability. Only enable it after verifying all native modules build cleanly.
- Avoid setting `NODE_ENV=production` in `eas.json`; it can skip dev deps and break EAS installs.
- Ensure `EXPO_PUBLIC_AI_PROXY_URL` is set in the EAS **production** environment before building.

This will:
1. Upload your code to Expo's build servers
2. Compile the APK with react-native-pdf included
3. Build takes ~15-20 minutes
4. Provide a download link when complete

## Step 3: Download APK

When build completes, you'll get a link like:
```
✔ Build successful!
https://expo.dev/artifacts/eas/[BUILD_ID].apk
```

Click the link to download the APK.

## Step 4: Install on Device

### Option A: Direct Install
1. Transfer APK to your Android device (via USB or cloud)
2. Open the APK file on your device
3. Allow "Install from unknown sources" if prompted
4. Install and open the app

### Option B: QR Code Install
1. Go to https://expo.dev/accounts/[your-username]/projects/guyana-laws/builds
2. Scan QR code with device
3. Download and install

## Step 5: Test PDF Viewing

1. Open the app
2. Navigate: Acts & Statutes → Select tier → Select Act
3. On first open, the PDF should download and then display with:
   - Page navigation (swipe)
   - Pinch to zoom
   - Page counter
   - Full native rendering

## Troubleshooting

### Build fails with "credentials error"
```bash
# Clear credentials and try again
eas credentials
# Select "Remove all credentials"
# Then rebuild
```

### APK won't install
- Enable "Install unknown apps" in Android settings
- Make sure you have enough storage space
- Try redownloading the APK

### PDF not loading
- Check logs: `adb logcat | grep ActPdfViewer`
- Confirm the Act exists in `src/assets/acts-pdf-urls.json`
- Ensure the device has network access on first download
- Verify `EXPO_PUBLIC_AI_PROXY_URL` is set for AI chat

## File Size

Expected APK size: **~60-120 MB** (PDFs are not bundled)
- App code + native libs only
- PDFs download on demand and are cached per device

## Alternative: Development Build

If you want hot reload during testing:

```bash
npx eas build --platform android --profile development
```

Then run Metro:
```bash
npx expo start --dev-client
```

## Next Steps After PDF Testing

Once you verify PDFs work:

1. ✅ Test all major Acts load correctly
2. ✅ Test navigation flow
3. ✅ Test on different devices/Android versions
4. 📱 Prepare for Play Store submission

## Play Store Submission (Future)

When ready to publish:

1. Change package name in app.config.js to your domain:
   ```json
   "package": "gy.gov.laws" // Example
   ```

2. Build production APK with updated package:
   ```bash
   eas build --platform android --profile production
   ```

3. Create Play Store listing
4. Upload APK
4. Submit for review

## Cost

- **EAS Build**: Free tier includes builds
- **Play Store**: One-time $25 fee for developer account
- **Hosting**: Free (APK hosted by Expo)



