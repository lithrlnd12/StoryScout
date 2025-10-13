# Story Scout Changelog

## [Unreleased] - 2025-01-XX

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
- [ ] Deploy Firestore rules: `firebase deploy --only firestore:rules`
- [ ] Build web: `cd web && npm run build`
- [ ] Deploy web: `firebase deploy --only hosting`
- [ ] Test engagement on staging
- [ ] Verify review submission works
- [ ] Check analytics tracking

## Next Steps
1. Add Vimeo API integration for content discovery
2. Implement review list view
3. Add sorting/filtering for reviews
4. Create admin panel for content moderation
5. Build creator dashboard for analytics
