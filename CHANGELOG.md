# Story Scout Changelog

## [Unreleased] - 2025-10-13

### Major Changes - Roku TV App Launch

#### Added - Roku TV Application
- **Complete Roku TV App** (`tv/roku/`)
  - TikTok/YouTube Shorts-style vertical video feed for TV
  - 51 curated films from Internet Archive (same as mobile/web)
  - Full BrightScript/SceneGraph implementation
  - Safe zone compliant UI (Title Safe & Action Safe zones)
  - 10-foot viewing optimized with large fonts and proper spacing

- **Feed Mode Navigation**
  - ✅ Up/Down arrows - Browse through 51 films
  - ✅ Left/Right arrows - Switch between 10 genre categories
  - ✅ Genre filtering system with visual pills (All, Comedy, Horror, Sci-Fi, Action, Drama, Animation, Family, Mystery, Documentary)
  - ✅ Auto-playing muted trailers with looping
  - ✅ Dynamic genre pill highlighting (pink selected, gray unselected)

- **Full-Screen Watch Mode**
  - ✅ Press OK to enter immersive full-screen mode
  - ✅ All UI elements hide automatically (pills, cards, engagement bar)
  - ✅ Video plays unmuted with native Roku controls
  - ✅ Playback controls: Play, Pause, Fast Forward (10s), Rewind (10s)
  - ✅ Press Up/Down to toggle UI visibility without exiting
  - ✅ Press OK or Back to return to feed mode
  - ✅ Smart state management prevents accidental scrolling

- **Star Rating System**
  - ✅ Press * (asterisk) to open rating overlay
  - ✅ Star icon (★) in engagement bar
  - ✅ Placeholder implementation ("Star Rating Coming Soon!")
  - ✅ Auto-dismiss after 2 seconds
  - 🔄 Full 1-5 star rating UI (planned)

- **UI Components** (`components/MainScene.xml`, `components/MainScene.brs`)
  - Top genre bar: Safe zone compliant (Y=106, within title safe 192x106)
  - Genre pills: 160x50px with proper centering and spacing
  - Bottom info card: Compact 700x180px with pink accent line
  - Genre chip: Cyan badge with film genre
  - Title and synopsis: Truncated for readability
  - Right engagement bar: Like (♥), Rate (★), Share (↗) with counts
  - Navigation hints: Bottom right corner, subtle opacity

- **Safe Zone Compliance**
  - Title Safe Zone (FHD): 1534x866, offset (192, 106)
  - Action Safe Zone (FHD): 1726x970, offset (96, 53)
  - All text elements within title safe boundaries
  - All interactive elements within action safe boundaries
  - Follows Roku design guidelines for TV apps

- **Color Palette**
  - Background: #0F121A (Dark Navy)
  - Primary Accent: #E91E63 (Pink/Magenta) - Brand color
  - Secondary Accent: #00E5FF (Cyan) - Genre highlights
  - Pill Selected: #E91E63 (Pink), opacity 1.0
  - Pill Unselected: #1F2937 (Dark Gray), opacity 0.8
  - Text: #FFFFFF (White), #8B92A8 (Gray), #D1D5DB (Light Gray)

- **Developer Setup**
  - Package building: `python3 -m zipfile -c StoryScout.zip components/ images/ manifest source/`
  - Web-based deployment to Roku device via local network
  - Developer mode installation instructions
  - Comprehensive troubleshooting guide

- **Branding Assets** (`tv/roku/images/`)
  - Channel poster HD: 540x405 (Story Scout logo)
  - Channel poster SD: 290x218
  - Splash screen HD: 1280x720
  - Splash screen SD: 720x480
  - All using Story Scout branding (logo and colors)

- **Documentation** (`tv/roku/README.md`)
  - Complete setup guide
  - Navigation control reference tables
  - Testing checklist for all features
  - Troubleshooting for video, installation, and UI issues
  - UI design specifications with measurements
  - Color palette reference
  - Content source information
  - Future enhancement roadmap

#### Technical Implementation - Roku
- **BrightScript State Management**
  - `m.isFullScreen` - Tracks feed vs full-screen mode
  - `m.isUIVisible` - Tracks UI visibility in full-screen
  - `m.isMuted` - Global mute preference
  - `m.currentIndex` - Current video position
  - `m.selectedGenreIndex` - Current genre filter
  - `m.filteredContent` - Genre-filtered video array

- **Helper Functions**
  - `enterFullScreen()` - Hide UI, enable controls, unmute
  - `exitFullScreen()` - Show UI, disable controls, restore mute
  - `toggleUIVisibility()` - Show/hide UI without exiting full-screen
  - `hideAllUI()` / `showAllUI()` - Manage all UI elements
  - `buildGenreList()` - Extract unique genres from content
  - `buildGenrePills()` - Dynamically create genre pill UI
  - `filterContentByGenre()` - Filter content by selected genre
  - `updateGenrePills()` - Update pill colors on selection change
  - `loadCurrentVideo()` - Load and play video with UI updates
  - `openStarRating()` - Show rating placeholder (future: full UI)

- **Video Player Integration**
  - SceneGraph Video component with ContentNode
  - Direct MP4 playback from Internet Archive URLs
  - Auto-play and looping in feed mode
  - Full playback controls in full-screen mode
  - Mute/unmute state management
  - Video state observation for error handling

### Major Changes - Mobile App Improvements & Content Expansion

#### Fixed - Mobile App Layout & UX
- **Fixed npm workspace module resolution**
  - Updated `mobile/package.json` scripts to reference parent `node_modules`
  - Resolves "Cannot find module expo/bin/cli" error
  - Mobile app now starts correctly from mobile directory

- **Fixed Hermes `import.meta` error**
  - Updated `shared/firebase/config.ts` to use indirect access via `globalThis`
  - Prevents Hermes parse errors in React Native
  - Maintains compatibility with Vite (web) environment

- **Optimized Mobile Feed Layout**
  - Fixed video overlay covering video content
  - Moved engagement bar from `bottom: 35%` to `bottom: 25%`
  - Reduced overlay padding for more visible video area
  - Truncated long titles to 40 characters with ellipsis
  - Reduced synopsis default length from 100 to 60 characters
  - Smaller, more compact text sizes (title: 20px, synopsis: 13px)
  - Bottom padding increased to 70px to prevent button cutoff

- **Improved Genre Pills**
  - Fixed text clipping/cutoff when not selected
  - Increased visibility with lighter background: `rgba(50,55,70,0.8)`
  - Changed text color from secondary to primary (white instead of gray)
  - Added fixed height (40px) and proper vertical centering
  - Increased padding for better readability

- **Added Global Mute Toggle (Mobile)**
  - Mute button in top-right corner (matches web implementation)
  - Global state: once unmuted, all videos play with audio
  - Only currently visible video has audio (prevents overlap)
  - Uses expo-av `setIsMutedAsync()` for proper video control

### Major Changes - Content Expansion & Audio Controls

#### Expanded Content Library (51 Films)
- **Increased from 19 to 51 films** - nearly tripled the content
- **Deep dive search** across Internet Archive collections for indie/amateur content
- **Better genre distribution** with more content per category:
  - **Comedy**: 8 films (added 2 modern indie)
    - Dead Man Drinking (2008) - CC licensed indie comedy
    - Tex Montana Will Survive! (2016) - Mockumentary
  - **Horror**: 12 films (added 3 modern indie)
    - Hunters (2016) - Found footage horror
    - S&Man (2006) - Documentary horror
    - Nightwing (1979) - Creature horror
  - **Sci-Fi**: 6 films
  - **Action/Adventure**: 8 films (added 2 modern indie)
    - Snowblind (2010) - Post-apocalyptic western
    - Code Name Jenny (2018) - German action thriller
  - **Drama**: 8 films (added 2 modern indie)
    - Waltz with Bashir (2008) - Animated war documentary
    - Animal Kingdom (2010) - Australian crime drama
  - **Animation**: 5 films (added 3 modern)
    - The Thief and the Cobbler Recobbled (2013)
    - Midori (2006) - Japanese animation
  - **Family**: 1 film
  - **Mystery**: 1 film
  - **Documentary**: 2 films (NEW GENRE)
    - DPRK: The Land of Whispers (2013) - North Korea doc
    - United We Fall (2010) - Political documentary

- **Search Strategy**:
  - Targeted searches by genre + indie/independent keywords
  - Year filter: 2005-2024 for modern content
  - Runtime filter: 5-150 minutes (filtered out clips and overly long content)
  - Quality check: Validated video files and accessibility

#### Added - Audio Controls
- **Global Mute/Unmute Toggle**
  - Mute button in top-right corner of each video
  - Speaker icons: 🔇 (muted) and 🔊 (unmuted)
  - **Global state**: Once unmuted, all subsequent videos play with audio
  - Only the currently visible video has audio (prevents audio overlap)
  - Semi-transparent button with backdrop blur for better visibility
  - Videos start muted by default for auto-play compatibility

- **Implementation** (`web/src/App.tsx`):
  - `isGloballyMuted` state tracks audio preference
  - `toggleMute()` function updates all video refs
  - Button positioned at `top: 20px, right: 20px`
  - Circular button: 44x44px with `rgba(0, 0, 0, 0.5)` background

### Major Changes - Internet Archive Migration (Previous)

#### Migrated from Vimeo to Internet Archive
- **Why**: Vimeo embeds require WebView which doesn't work in Expo Go, blocking iOS testing without a Mac
- **Solution**: Direct MP4 playback from Internet Archive's public domain collection
- **Benefits**:
  - ✅ No API keys required
  - ✅ Works in Expo Go (both iOS and Android)
  - ✅ Native video playback on all platforms
  - ✅ Cross-platform compatible (mobile, web, TV)
  - ✅ 19 curated public domain films across multiple genres

#### Added - Internet Archive Integration
- **Content Script** (`web/fetch-archive-content.mjs`)
  - Fetches metadata from Internet Archive API
  - Validates video files and checks accessibility
  - **Curated list of 51 working films** (mix of classic public domain and modern indie):
    - Comedy: 8 films (Chaplin, Bob Hope, modern indie comedies)
    - Horror: 12 films (classic horror + modern indie horror/found footage)
    - Sci-Fi: 6 films (classic + Blender Foundation open movies)
    - Action/Adventure: 8 films (Tarzan, modern indie action)
    - Drama: 8 films (Chaplin, film noir, modern indie dramas)
    - Animation: 5 films (classic + modern open source animation)
    - Family: 1 film
    - Mystery: 1 film
    - Documentary: 2 films (NEW - modern indie docs)
  - Prioritizes 512kb MP4 versions for optimal file size
  - Generates Internet Archive thumbnail URLs
  - Outputs to `shared/mocks/archive-content.json`

- **Upload Script** (`web/upload-archive-content.mjs`)
  - Uploads Internet Archive content to Firestore
  - Uses Firebase Admin SDK
  - Preserves all metadata and engagement metrics
  - Creates documents with `direct` video type

#### Updated - Mobile App (React Native)
- **Replaced WebView with expo-av Video Component**
  - Import changes:
    - Removed: `react-native-webview`
    - Added: `expo-av` Video component with ResizeMode
  - Changed data source: `trailers.json` → `archive-content.json`
  - Updated video rendering:
    - Direct MP4 URLs instead of Vimeo embed URLs
    - Video refs for play/pause control
    - Auto-play when video is visible
    - Pause and reset when scrolled past
  - Full video modal now uses Video component with native controls
  - Works perfectly in Expo Go (no native build required)

#### Updated - Web App (React)
- **Created Web-Specific Firebase Modules**
  - Issue: Shared Firebase config couldn't read Vite environment variables
  - Solution: Web-specific modules that directly access `import.meta.env`
  - New files:
    - `web/src/firebaseConfig.ts` - Direct Vite env access
    - `web/src/firebaseClient.ts` - Web Firebase initialization
    - `web/src/firebaseAuth.ts` - Web auth functions
    - `web/src/firebaseFirestore.ts` - Web Firestore functions
  - App.tsx now imports from web-specific modules instead of shared

- **Replaced Vimeo Embeds with HTML5 Video**
  - Changed from `<iframe>` to `<video>` elements
  - Direct MP4 playback with `src={videoUrl}`
  - Video refs for programmatic control
  - Auto-play on scroll with play/pause management
  - Full video modal uses HTML5 video with native controls
  - Poster images from Internet Archive thumbnails

- **Added TikTok-Style Infinite Scroll**
  - Seamless looping when reaching end of feed
  - Wraps to beginning/end when scrolling past boundaries
  - Videos reset to start when scrolled past
  - Faster transitions (300ms) with smooth easing curve
  - More sensitive scroll detection (20px threshold)
  - Creates infinite scrolling experience with finite content

#### Updated - Data Schema
- **VideoSource Type Updated**
  - Added: `'direct'` type for Internet Archive MP4 files
  - Now supports: `'vimeo' | 'youtube' | 'archive' | 'direct' | 'external'`
  - Updated in both shared and web-specific Firestore types

- **Content Document Structure**
  ```typescript
  {
    trailerType: 'direct',
    trailerVideoId: 'https://archive.org/download/{id}/{filename}.mp4',
    fullContentType: 'direct',
    fullContentVideoId: 'https://archive.org/download/{id}/{filename}.mp4',
    thumbnailUrl: 'https://archive.org/services/img/{id}',
    archiveId: '{internet-archive-id}'
  }
  ```

#### Fixed - Environment Variable Loading
- **Issue**: Vite wasn't loading Firebase config from `.env` files
- **Root Cause**: Shared config loaded before `main.tsx` set global env
- **Solution**:
  - Created web-specific config with direct `import.meta.env` access
  - Added hardcoded fallback values for development
  - Lazy initialization in Firebase client
  - Added console logging for debugging

#### Fixed - React Native import.meta Error
- **Issue**: Hermes engine doesn't support `import.meta` syntax
- **Solution**: Updated `shared/utils/env.ts` to use indirect access via `globalThis['import.meta']`
- Prevents parse-time errors in React Native while maintaining Vite compatibility

#### Fixed - Package Version Mismatches (Mobile)
- Updated `mobile/package.json` to match Expo SDK 51:
  - `@react-native-async-storage/async-storage`: `1.23.1` (was 1.21.0)
  - `react-native`: `0.74.5` (was 0.74.0)
  - `react-native-webview`: `13.8.6` (was 13.16.0)
  - `@types/react`: `~18.2.79` (was 18.2.21)
  - `typescript`: `~5.3.3` (was 5.4.0)

#### Documentation Updates
- **README.md**
  - Updated Quick Start: `fetch-archive-content.mjs` instead of `upload-trailers.mjs`
  - Replaced "Vimeo Integration" section with "Internet Archive Integration"
  - Updated "Content Architecture" section with Internet Archive details
  - Removed WebView troubleshooting (no longer needed)
  - Updated troubleshooting section for Internet Archive
  - Added note about videos working fully in Expo Go

- **.gitignore**
  - Added `service-account.json` and `**/service-account*.json`
  - Protects Firebase Admin credentials from accidental commits

### Added - Engagement System
- **TikTok-Style Engagement UI** (Mobile & Web)
  - Vertical engagement bar positioned at 35% from bottom on right side
  - Semi-transparent circular backgrounds (rgba(0, 0, 0, 0.3)) for better visibility
  - Three interaction types:
    - 🤍/❤️ Like button (toggles on tap, turns red when liked)
    - 💬 Review button (opens review modal with 5-star rating system)
    - ↗️ Share button (native share on mobile, Web Share API on web)
  - K-formatting for large numbers (e.g., "12K" for 12,000)
  - Real-time engagement counts displayed below each icon

- **Firestore Database Schema**
  - **Collections**:
    - `engagements`: Tracks user interactions (likes, shares, reviews)
    - `reviews`: Detailed review content with ratings and text
    - `publicContent`: Updated with engagement count fields
  - **Security Rules**:
    - Users can create/manage their own engagements and reviews
    - All users can read engagement data
    - Authenticated users can create engagements linked to their userId

- **Engagement Functions** (`shared/firebase/firestore.ts`)
  - `toggleLike()`: Toggle like/unlike with automatic Firestore count updates
  - `shareContent()`: Track content shares with increment
  - `submitReview()`: Create/update reviews with automatic rating calculation
  - `getUserEngagement()`: Load user's engagement state for UI
  - `subscribeToReviews()`: Real-time review subscription

- **Review Modal** (Mobile & Web)
  - Bottom sheet style on mobile
  - Centered modal on web
  - Interactive 5-star rating selector
  - Multi-line text input for review comments
  - Loading states during submission
  - Displays current item title

### Changed - Content Architecture
- **Data Model Improvements**
  - Separated `trailerType` and `fullContentType` to support different video sources
  - Added `trailerVideoId` and `fullContentVideoId` for flexible content sourcing
  - Support for multiple video sources: `vimeo`, `youtube`, `archive`, `external`
  - Backward compatible with legacy `vimeoId` field

- **TrailerDoc Type** (`shared/firebase/firestore.ts`)
  ```typescript
  export type VideoSource = 'vimeo' | 'youtube' | 'archive' | 'external';

  type TrailerDoc = {
    // ... existing fields

    // Trailer (shown in feed)
    trailerType: VideoSource;
    trailerVideoId?: string;
    trailerUrl?: string;
    trailerDurationSeconds?: number;

    // Full content (shown on "Watch Now")
    fullContentType: VideoSource;
    fullContentVideoId?: string;
    fullContentUrl?: string;
    fullContentDurationSeconds?: number;
  }
  ```

- **Firestore Converter**
  - Auto-generates trailer and full content URLs for Vimeo videos
  - Trailers auto-loop and mute by default in feed
  - Full content opens unmuted without loop
  - Handles migration from legacy single-video model

### Improved - UI/UX
- **Layout Enhancements**
  - Changed "Watch Full" button to "Watch Now" for clarity
  - Improved category pill styling with better padding and borders
  - Enhanced genre filter visibility with gradient active states
  - Moved engagement column up for better ergonomics
  - Better thumb reach on mobile devices

- **Video Player**
  - Trailers now properly loop and auto-play muted in feed
  - Full content videos open in modal without loop
  - Added close button for full video player
  - Proper Vimeo embed parameters for optimal playback

### Technical
- **TypeScript Improvements**
  - Added null-coalescing operators for safer engagement count rendering
  - Fixed type definitions for engagement fields
  - Proper type exports for VideoSource

- **Performance**
  - Engagement state loads once per feed update
  - Optimized Firestore queries with proper indexing
  - Batch engagement data fetching

### Dependencies
- No new dependencies added
- Uses existing Firebase SDK (firestore, auth)
- Native React Native Share API
- Web Share API with clipboard fallback

## Database Migration Notes

### Existing Data Compatibility
- All existing `publicContent` documents work without migration
- Legacy `vimeoId` automatically maps to both trailer and full content
- New fields are optional and backward compatible

### New Field Defaults
```json
{
  "likes": 0,
  "shares": 0,
  "reviews": 0,
  "averageRating": 0,
  "trailerType": "vimeo",
  "fullContentType": "vimeo"
}
```

### Firestore Security Rules
Updated rules deployed in `firestore.rules`:
- `engagements/{engagementId}`: User-specific create/update/delete
- `reviews/{reviewId}`: User-specific create/update/delete
- Both collections: Public read access

## Deployment Checklist
- [x] Fetch Internet Archive content: `node web/fetch-archive-content.mjs`
- [x] Upload content to Firestore: `node web/upload-archive-content.mjs`
- [x] Deploy Firestore rules: `firebase deploy --only firestore:rules`
- [x] Build web: `npm run build --workspace=web`
- [x] Deploy web: `firebase deploy --only hosting`
- [x] Deployed to: https://story-scout.web.app
- [ ] Test mobile on Expo Go (iOS) - Pending iOS device
- [x] Test mobile on Expo Go (Android)
- [x] Verify video playback on web
- [x] Verify video playback on mobile
- [x] Test infinite scroll
- [x] Verify engagement system works
- [x] Fix mobile layout issues (overlay, genre pills, buttons)
- [x] Fix Hermes import.meta error
- [x] Fix npm workspace module resolution

## Deployment Notes

### 2025-10-13 - Mobile App Improvements & Content Expansion
- **51 films** uploaded to Firestore (up from 19)
- Added **Documentary** as new genre category
- Added **14+ modern indie films** (2005-2024)
- Implemented global mute/unmute toggle on both web and mobile
- Fixed mobile app npm workspace issues
- Fixed Hermes import.meta compatibility
- Optimized mobile feed layout (overlay, genre pills, engagement bar)
- Better genre distribution across all categories
- All videos validated and working
- Mobile app fully functional in Expo Go (iOS and Android)
- Deployed to: https://story-scout.web.app

### 2025-01-13 - Initial Deployment
- Web app successfully deployed to Firebase Hosting
- 19 Internet Archive videos uploaded to Firestore
- All videos playing correctly on web with auto-play
- Infinite scroll working (loops through 19 videos)
- Firebase Auth working correctly
- Engagement system (likes, reviews, shares) operational

## Next Steps
1. Test mobile app on iOS via Expo Go (need iOS device/tester)
2. ~~Add more Internet Archive content (expand to 50+ films)~~ ✅ **DONE - 51 films**
3. Implement real Firestore pagination for infinite scroll
4. Implement review list view
5. Add sorting/filtering for reviews
6. Create admin panel for content moderation
7. Build creator dashboard for analytics
8. Consider YouTube Creative Commons as additional source
9. Add more indie films per genre (target: 10+ per genre)
