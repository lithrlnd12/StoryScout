# WatchParty Implementation Documentation

## Recent Changes (October 16, 2025)

### Web: TikTok-Style Chat Overlay & Party State Persistence

**Problem:** Chat overlay was not appearing when watch party transitioned to fullscreen video mode. Party state was being lost during view transitions.

**Solution:** Implemented party ID persistence across view transitions.

#### Changes Made:
1. **App.tsx (web/src/App.tsx):**
   - Added `activePartyId` state to persist party ID (line 70)
   - Updated `onPartyStateChange` callback to include party ID parameter
   - Pass `partyId` prop to WatchParty component in both feed and fullscreen views

2. **WatchParty.tsx (web/src/components/WatchParty.tsx):**
   - Added `partyId` optional prop to allow parent to maintain party across transitions
   - Updated `onPartyStateChange` callback signature: `(inParty: boolean, partyId?: string) => void`
   - Added new subscription effect that re-subscribes using external party ID (lines 74-97)
   - Removed debug red box indicator

#### Result:
- Chat now persists when transitioning from lobby to fullscreen video
- TikTok-style transparent chat overlay appears on right side during fullscreen playback
- Party subscription maintains across all view changes

---

## Mobile Subscription Issue - Root Cause Analysis

## Symptoms
1. `console.log('[WatchParty] Component rendered')` on line 46 NEVER appears
2. User sees "Watch party state changed: true" from App.tsx line 625 (callback fires)
3. Lobby modal appears when guest joins
4. But `subscribeToWatchParty` logs (lines 79, 83) never appear
5. When web updates party to 'playing', mobile's subscription callback never fires

## Root Cause
**Metro bundler is serving a cached/stale version of the WatchParty component.**

The evidence:
- Callbacks work (onPartyStateChange fires) → component IS being used
- Modal appears → component IS rendering
- But console.logs don't appear → code being executed is NOT the current file
- Subscription doesn't work → old code without subscription logic is running

## The Fix

### Step 1: Clear Metro Bundler Cache
```bash
cd /mnt/c/storyscout/mobile
# Stop any running Metro bundler (Ctrl+C)

# Clear Metro cache
npx react-native start --reset-cache

# Or use Expo CLI
npx expo start -c
```

### Step 2: Clear React Native/Expo Caches
```bash
# Remove node_modules and reinstall
rm -rf node_modules
yarn install

# Clear watchman (if installed)
watchman watch-del-all

# Clear Expo cache
rm -rf .expo
```

### Step 3: Rebuild the App
```bash
# For Expo managed workflow
npx expo start -c

# Then press 'a' for Android or 'i' for iOS
# This will rebuild the app with the fresh code
```

## Prevention
To prevent this in the future, always restart Metro bundler with cache clearing when making significant changes to component logic:

```bash
npx expo start -c
```

## Verification
After restarting with cleared cache, you should see these logs appear in order:
1. `[WatchParty] Component rendered` - when component first renders
2. `[WatchParty] No party to subscribe to` - initially when party is null
3. After joining: `[WatchParty] Subscribing to party: [party-id] Current status: waiting`
4. When web updates party: `[WatchParty] Party updated! Status: playing`

If these logs still don't appear after clearing cache, there may be an additional issue with console.log filtering in the React Native debugger/console.
