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

### Mobile: TikTok-Style Chat Overlay & Party State Persistence (October 16, 2025 - Final Implementation)

**Problem:** Mobile app needed TikTok-style chat overlay during watch parties, similar to web implementation. Chat needed to be positioned in fullscreen video view only, with proper color coding to differentiate users.

**Solution:** Implemented party ID persistence and TikTok-style chat overlay directly in fullscreen modal (App.tsx), with real-time message polling and color-coded usernames.

#### Changes Made:

1. **mobile/App.tsx:**
   - Added chat state variables (lines 104-108):
     - `activePartyId`: Tracks current party ID
     - `chatMessages`: Array of chat messages
     - `chatInput`: Current message input text
     - `sendingChat`: Loading state for send operation
     - `chatIntervalRef`: Interval reference for polling

   - Added chat message polling effect (lines 302-335):
     - Fetches messages every 2 seconds from Cloud Functions
     - Uses `getChatMessages` endpoint with `partyCode` parameter
     - Automatically cleans up interval when party ends

   - Added `handleSendChat` function (lines 337-362):
     - Sends messages to Cloud Functions via `sendChatMessage` endpoint
     - Includes `partyCode`, `userId`, `displayName`, `platform: 'mobile'`, and `message`
     - Handles loading states and error recovery

   - Updated `onPartyStateChange` callback (lines 440-443):
     - Sets `activePartyId` when party state changes
     - Callback signature: `(inParty: boolean, partyId?: string) => void`

   - Added TikTok-style chat overlay in fullscreen modal (lines 641-723):
     - Positioned at `bottom: 80px, height: 200px` (lower 20-25% of screen)
     - Semi-transparent message bubbles with color-coded usernames
     - Scrollable message list showing last 10 messages
     - Input dock with send button at bottom
     - Only renders when `activePartyId` is set (inside `if (watchingFull)` block)

2. **mobile/src/components/WatchParty.tsx:**
   - Updated `onPartyStateChange` callback signature to include `partyId` parameter
   - Modified `handleCreateParty` to pass party ID: `onPartyStateChange?.(true, newParty.id)`
   - Modified `handleJoinParty` to pass party ID: `onPartyStateChange?.(true, joinedParty.id)`

3. **mobile/package.json:**
   - Updated start script to use `./node_modules/.bin/expo start --clear --tunnel`
   - Added `--tunnel` flag for WSL networking support
   - Added `--clear` flag to prevent Metro cache issues

#### Chat Overlay Implementation:
- **Position**: Absolute positioned at `right: 20, bottom: 80, height: 200, width: 280`
- **Messages ScrollView**: Scrollable list showing last 10 messages
- **Message Bubbles**: Semi-transparent (`rgba(0, 0, 0, 0.6)`) with 16px border radius
- **Username Colors**:
  - Own messages: Cyan (`tokens.accentCyan`)
  - Other users: Magenta (`tokens.accentMagenta`)
- **Message Text**: White with 14px font size
- **Input Dock**: Rounded pill-style (`rgba(0, 0, 0, 0.7)`) with 24px border radius
- **Send Button**: Cyan circular button with arrow icon
- **Real-time Updates**: Polling every 2 seconds via Cloud Functions

#### Cloud Functions Integration:
- **getChatMessages**: `GET /getChatMessages?partyCode={id}&limit=50`
- **sendChatMessage**: `POST /sendChatMessage`
  - Body: `{ partyCode, userId, displayName, platform: 'mobile', message }`

#### Result:
- ✅ TikTok-style chat overlay appears in bottom 20-25% of screen during watch party
- ✅ Chat only visible in fullscreen video view (not on login or feed)
- ✅ Party state persists across view transitions
- ✅ Color-coded usernames (cyan for you, magenta for others)
- ✅ Real-time message sync across web, mobile, and Roku platforms
- ✅ Native video controls remain accessible
- ✅ Messages poll every 2 seconds for live updates
- ✅ Proper Metro cache clearing via npm start script

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
