# Watch Party Implementation Guide

## 🎯 Goal
Enable users to watch films together remotely across all platforms (Mobile, Web, Roku) using Firebase for real-time sync.

---

## ✅ Completed (Step 1 - Backend Foundation)

### **Firebase Schema Added** (`shared/firebase/firestore.ts`)

#### **Types Created:**
```typescript
WatchPartyStatus = 'waiting' | 'playing' | 'paused' | 'ended'
PartyPlatform = 'mobile' | 'web' | 'roku'

WatchParty {
  id: string,              // Same as code (6-char)
  code: string,            // Join code (e.g., "ABC123")
  hostUserId: string,
  contentId: string,
  contentTitle: string,
  videoUrl: string,        // Direct MP4 from Internet Archive

  // Sync state
  status: WatchPartyStatus,
  currentTime: number,     // Seconds
  lastSync: Timestamp,

  // Participants
  participants: WatchPartyParticipant[],
  maxParticipants: number, // Default: 10

  createdAt: Timestamp,
  endedAt?: Timestamp
}

WatchPartyParticipant {
  userId: string,
  displayName: string,
  platform: PartyPlatform,
  joinedAt: Timestamp
}

WatchPartyChatMessage {
  id: string,
  partyId: string,
  userId: string,
  displayName: string,
  message: string,
  timestamp: Timestamp
}
```

#### **Functions Created:**
- ✅ `generateJoinCode()` - Creates 6-char Base62 code (no confusing chars)
- ✅ `createWatchParty()` - Host creates party, returns party object
- ✅ `joinWatchParty()` - User joins via code, checks capacity
- ✅ `updateWatchPartyState()` - Host updates play/pause/time
- ✅ `leaveWatchParty()` - User leaves, auto-ends if host leaves
- ✅ `subscribeToWatchParty()` - Real-time listener (Mobile/Web)
- ✅ `getWatchParty()` - One-time fetch (for Roku REST API)

### **Firestore Security Rules** (`firestore.rules`)
- ✅ **watchParties collection**:
  - Read: Public (anyone can read to join)
  - Create: Authenticated users only
  - Update: Host or current participants only
  - Delete: Host only

- ✅ **watchParties/{id}/chat subcollection**:
  - Read: Public
  - Create: Authenticated users only
  - Update/Delete: False (messages immutable)

- ✅ **Deployed**: `firebase deploy --only firestore:rules` ✅

---

## 🎬 How Watch Party Works

### **Architecture:**
```
Internet Archive MP4 URLs
         ↓
Firebase Firestore (sync state)
         ↓
Mobile/Web: Real-time listeners (instant sync)
Roku: REST API polling (5-second delay, acceptable)
```

### **User Flow:**

#### **Create Party (Host):**
1. User presses "Watch Party" button while watching video
2. `createWatchParty(userId, displayName, platform, currentContent)`
3. Firebase generates 6-char code (e.g., "XYZ789")
4. Display code on screen + share link/QR
5. Host controls playback → updates Firebase
6. All participants sync automatically

#### **Join Party (Guest):**
1. User enters 6-char code or clicks share link
2. `joinWatchParty(code, userId, displayName, platform)`
3. Load same video URL from party.videoUrl
4. Subscribe to party updates
5. Video player syncs to party.currentTime and party.status

#### **Sync Logic:**
```typescript
// Mobile/Web (real-time)
subscribeToWatchParty(partyId, (party) => {
  if (party.status === 'playing') {
    videoPlayer.play();
    if (Math.abs(videoPlayer.currentTime - party.currentTime) > 3) {
      videoPlayer.seekTo(party.currentTime);
    }
  } else if (party.status === 'paused') {
    videoPlayer.pause();
  }
});

// Roku (polling every 5 sec)
setInterval(() => {
  const party = await getWatchParty(code);
  syncVideoPlayer(party);
}, 5000);
```

---

## ✅ Completed Implementation

### **Step 2: Mobile Implementation** ✅
**File**: `mobile/src/components/WatchParty.tsx`

**UI Components Completed:**
- ✅ Watch Party button (in video overlay)
- ✅ Create party modal:
  - ✅ Show generated code (large, copyable)
  - ✅ Share button (native Share API)
  - ✅ Participant list with platform icons
  - ✅ Leave/End party button
- ✅ Join party modal:
  - ✅ Code input (6-char keyboard)
  - ✅ Join button
  - ✅ Error handling (party full, not found)
- ✅ Lobby system: Guests wait for host to press "Start Watch Party"
- ✅ Real-time sync with Firebase Firestore
- ✅ Full movie navigation when party starts

### **Step 3: Web Implementation** ✅
**File**: `web/src/components/WatchParty.tsx`

**UI Components Completed:**
- ✅ Watch Party button (in video controls)
- ✅ Create party modal (centered overlay)
- ✅ Join party modal with code input
- ✅ Participant list with platform icons
- ✅ Share code button (navigator.clipboard)
- ✅ Lobby system with "Start Watch Party" button
- ✅ Real-time sync with Firebase Firestore
- ✅ Full movie navigation when party starts

**Key Features:**
- Uses React hooks for state management
- Firebase Firestore real-time subscriptions
- 3-second drift tolerance for video sync
- Host controls: play/pause/seek synced to all participants
- Guest experience: Waits in lobby until host starts

---

### **Step 4: Roku Implementation (4-5 hours)**
**Files**:
- `tv/roku/components/WatchParty.brs`
- `tv/roku/source/firebase-client.brs`

**Roku HTTP Client** (Firebase REST API):
```brightscript
' tv/roku/source/firebase-client.brs

function httpPost(url as String, body as Object) as Object
    request = CreateObject("roUrlTransfer")
    request.SetUrl(url)
    request.SetCertificatesFile("common:/certs/ca-bundle.crt")
    request.AddHeader("Content-Type", "application/json")
    request.SetRequest("POST")

    response = request.PostFromString(FormatJson(body))
    return ParseJson(response)
end function

function httpGet(url as String) as Object
    request = CreateObject("roUrlTransfer")
    request.SetUrl(url)
    request.SetCertificatesFile("common:/certs/ca-bundle.crt")

    response = request.GetToString()
    return ParseJson(response)
end function

function createPartyRoku(userId as String, contentId as String, videoUrl as String) as Object
    url = "https://firestore.googleapis.com/v1/projects/story-scout/databases/(default)/documents/watchParties"

    code = generateJoinCodeRoku()

    body = {
        fields: {
            code: { stringValue: code },
            hostUserId: { stringValue: userId },
            contentId: { stringValue: contentId },
            videoUrl: { stringValue: videoUrl },
            status: { stringValue: "waiting" },
            currentTime: { integerValue: 0 }
        }
    }

    response = httpPost(url, body)
    return { code: code }
end function

function pollPartyState(code as String) as Object
    url = "https://firestore.googleapis.com/v1/projects/story-scout/databases/(default)/documents/watchParties/" + code

    response = httpGet(url)

    return {
        status: response.fields.status.stringValue,
        currentTime: response.fields.currentTime.integerValue
    }
end function
```

**Roku Sync Loop**:
```brightscript
' tv/roku/components/WatchParty.brs

sub startPartySyncLoop()
    m.syncTimer = createObject("roSGNode", "Timer")
    m.syncTimer.duration = 5 ' Poll every 5 seconds
    m.syncTimer.repeat = true
    m.syncTimer.observeField("fire", "syncPartyState")
    m.syncTimer.control = "start"
end sub

sub syncPartyState()
    partyState = pollPartyState(m.partyCode)

    if partyState.status = "playing" then
        if m.videoPlayer.state <> "playing" then
            m.videoPlayer.control = "play"
        end if

        ' Only sync if drift > 3 seconds
        drift = abs(m.videoPlayer.position - partyState.currentTime)
        if drift > 3 then
            m.videoPlayer.seek = partyState.currentTime
        end if
    else if partyState.status = "paused" then
        if m.videoPlayer.state = "playing" then
            m.videoPlayer.control = "pause"
        end if
    end if
end sub
```

**Roku UI**:
- [ ] Press * (asterisk) to open watch party menu
- [ ] Show code on screen (large text)
- [ ] Show participant count
- [ ] Simple join code input screen

---

## 💰 Cost Estimate

**Per Watch Party (5 people, 90 min film):**
- Writes: ~1,085 (party creation + playback updates every 5 sec)
- Reads: ~5,400 (5 people × 1,080 reads)

**Free Tier Capacity:**
- 20,000 writes/day = ~18 parties/day
- 50,000 reads/day = ~9 concurrent parties/day

**POC Testing (1 month):**
- ~80 test parties
- Cost: **$0** (well within free tier)

**At Scale (100 parties/day):**
- Cost: ~$15/month

---

## 🧪 Testing Plan

### **Phase 1: Smoke Test**
1. Create party on mobile
2. Join from web (different user)
3. Host plays → Guest syncs
4. Host pauses → Guest syncs
5. Guest leaves → Party continues
6. Host leaves → Party ends

### **Phase 2: Cross-Platform**
1. Create on Roku
2. Join from mobile + web
3. Test all combinations

### **Phase 3: Edge Cases**
- [ ] Party full (11th person can't join)
- [ ] Invalid code
- [ ] Network disconnect/reconnect
- [ ] Host leaves mid-film
- [ ] Last person leaves

---

## 📝 Notes

- **Internet Archive URLs**: Already working on all platforms
- **No video streaming**: Just smart playback sync
- **Roku polling**: 5-second delay is acceptable for watch parties
- **Chat**: Phase 2 (optional, mobile/web only)
- **Auto-cleanup**: Cloud Function to delete parties >24 hours old (Phase 3)

---

## 🚀 Timeline

- ✅ Backend (Firebase): **Complete**
- ✅ Mobile: **Complete**
- ✅ Web: **Complete**
- ✅ Cross-platform testing: **Complete**
- [ ] Roku: 4-5 hours (Phase 2)
- [ ] Chat feature: Optional (Phase 2)
- [ ] Polish: 1 hour

**MVP Status: Fully Functional for Mobile & Web** ✅

---

## 🐛 Issues Resolved

### **Issue #1: Mobile Guest Not Navigating to Full Movie** ✅ RESOLVED
**Status**: Resolved
**Platforms Affected**: Mobile (iOS/Android) when joining web-hosted party
**Resolved**: 2025-10-14

**Root Cause**:
Metro Bundler cache was serving stale JavaScript code on mobile, preventing the latest subscription and navigation logic from running.

**Solution**:
Clear Metro Bundler cache with `npx expo start --clear` and reload the app.

**Technical Fix Applied**:
1. Used React refs to prevent stale closures in subscription callbacks:
   ```typescript
   const showCreateModalRef = useRef(showCreateModal);
   const onWatchFullMovieRef = useRef(onWatchFullMovie);
   ```

2. Removed `onWatchFullMovie` from useEffect dependencies to prevent subscription recreation

3. Fixed `videoUrl` in `createWatchParty` to use `fullContentVideoId` instead of `trailerVideoId`

4. Added comprehensive logging to Firebase subscription for debugging

**Verification**:
All cross-platform combinations now work perfectly:
- ✅ Mobile create → Web join → Mobile starts: Both sync
- ✅ Mobile create → Mobile join → Mobile starts: Both sync
- ✅ Web create → Web join → Web starts: Both sync
- ✅ Web create → Mobile join → Web starts: Both sync ← **This was the bug**

---

## 🎉 Testing Results

### **Phase 1: Cross-Platform Tests** ✅
1. ✅ Create party on mobile → Join from web → Host starts → Guest syncs
2. ✅ Create party on web → Join from mobile → Host starts → Guest syncs
3. ✅ Create party on web → Join from web → Host starts → Guest syncs
4. ✅ Create party on mobile → Join from mobile → Host starts → Guest syncs
5. ✅ Host pauses → All guests pause
6. ✅ Host seeks → All guests seek (with 3-second tolerance)
7. ✅ Guest leaves → Party continues for remaining participants
8. ✅ Host leaves → Party ends for everyone

### **Phase 2: Edge Cases** ✅
- ✅ Invalid code → Proper error message displayed
- ✅ Party full (11th person) → Error message displayed
- ✅ Lobby system → Guests wait correctly until host starts
- ✅ Share code functionality → Native share dialog works
- ✅ Participant list → Real-time updates with platform icons

---

Last Updated: 2025-10-14
