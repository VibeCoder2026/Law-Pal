# Clear Database and Force Fresh Migration

The app is failing because the existing database has the old schema and the migration is conflicting with existing triggers.

## Solution: Clear App Data

You need to clear the app's data to force a fresh database initialization with the new migration.

### Option 1: Clear Data in Expo Go (Recommended)

1. **On Android**:
   - Long press the Expo Go app icon
   - Tap "App info"
   - Tap "Storage"
   - Tap "Clear data" or "Clear storage"
   - Restart Expo Go
   - Scan QR code again

2. **On iOS**:
   - Delete the Expo Go app
   - Reinstall from App Store
   - Scan QR code again

### Option 2: Use Expo CLI to Clear Cache

In your terminal:
```bash
npx expo start --clear
```

This clears the bundler cache but NOT the database. You'll still need to clear app data.

### Option 3: Delete Database File (If Using Development Build)

If you're using a development build (not Expo Go):

```bash
# Android
adb shell run-as com.yourapp pm clear com.yourapp

# iOS Simulator
xcrun simctl erase all
```

### Option 4: Add a Database Reset on App Startup (Temporary Fix)

I can add a temporary "nuclear option" that drops and recreates all tables on next app launch. This should only be used for development.

Would you like me to add this temporary fix?

## What Will Happen After Clearing

1. App opens with empty database
2. Migration 2 runs (creates all tables with new schema)
3. Constitution imports (931 sections with `is_header_only` flags)
4. Header filtering activates (~213 headers filtered out)
5. App should work normally

## Alternative: Rollback to Old Version

If you want to rollback without clearing data:

1. Revert constitution.json:
   ```bash
   cp src/assets/constitution-backup.json src/assets/constitution.json
   ```

2. Revert CONSTITUTION_VERSION:
   ```typescript
   // src/constants/index.ts
   export const CONSTITUTION_VERSION = 1;
   ```

3. Restart app - old data will work again



