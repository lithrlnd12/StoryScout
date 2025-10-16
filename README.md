
# Story Scout

> A TikTok-style video discovery platform for short films and trailers across mobile, web, and TV platforms.

[![Version](https://img.shields.io/badge/version-0.1.0-blue.svg)](./CHANGELOG.md)
[![Firebase](https://img.shields.io/badge/backend-Firebase-orange.svg)](https://firebase.google.com)
[![Platforms](https://img.shields.io/badge/platforms-iOS%20|%20Android%20|%20Web%20|%20Roku-brightgreen.svg)](#)

## 📚 Table of Contents
- [Quick Start](#quick-start)
- [Project Structure](#project-structure)
- [Platform Commands](#platform-commands)
- [Environment Setup](#environment-setup)
- [Architecture](#architecture)
- [Database Schema](#database-schema)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)
- [Documentation](#documentation)

## 🚀 Quick Start

### 1. Clone and Install
```bash
git clone <repo-url>
cd storyscout
npm install  # Installs dependencies for all workspaces (mobile, web, shared)
```

### 2. Set Up Environment Variables
```bash
# Copy example files to create your .env files
cp mobile/.env.example mobile/.env
cp web/.env.example web/.env

# Edit the .env files with your Firebase credentials
# (See "Environment Variables" section below)
```

### 3. Fetch Content from Internet Archive
```bash
# Fetch 51 curated public domain films
node web/fetch-archive-content.mjs

# Upload content to Firestore (optional, requires service-account.json)
node web/upload-archive-content.mjs
```

### 4. Run the Apps

**Mobile (Expo Go - Works on both iOS and Android):**
```bash
cd mobile
npm start
# Opens Expo dev server with tunnel mode (for WSL compatibility)
# Scan QR code with Expo Go app on your phone
```

**Web (Vite dev server):**
```bash
cd web
npm run dev
# Open http://localhost:5173 in your browser
```

> **Note:** Mobile app must be run from the root directory using `npm start --workspace=mobile` due to npm workspace structure, or use `npm start` from within the mobile directory after the workspace scripts have been updated.

## 📁 Project Structure
```
storyscout/
├── docs/                   # Product requirements and design references
├── mobile/                 # React Native (Expo) - iOS & Android
├── web/                    # React + Vite - Responsive web app
├── tv/
│   ├── roku/              # ✅ Roku TV app (BrightScript/SceneGraph)
│   └── firetv/            # 🔄 Fire TV app (Android TV) - Coming soon
├── shared/                 # Design tokens, mocks, Firebase utilities
└── node_modules/           # Shared dependencies (npm workspaces)
```

## 🎯 Platform Stack

### Supported Platforms
- **iOS** - React Native via Expo Go (no build required)
- **Android** - React Native via Expo Go (no build required)
- **Web** - Responsive React + Vite SPA
- **Roku TV** - BrightScript/SceneGraph native app
- **Fire TV** - Coming soon (Android TV)

### Technology Stack
- **Backend**: Firebase (Auth, Firestore, Storage, Functions)
- **Mobile**: Expo-managed React Native with Firebase SDK
- **Web**: Vite + React SPA hosted on Firebase Hosting
- **TV**: Roku SceneGraph (BrightScript), Fire TV (Android)
- **Content**: Internet Archive (51 public domain films)

## 🎯 Platform Commands

### Mobile (iOS/Android)
```bash
cd mobile
npm start              # Start Expo dev server with tunnel mode & cache clearing

# For Expo Go (Recommended - No build required):
# 1. Install "Expo Go" app from App Store (iOS) or Play Store (Android)
# 2. Run 'npm start' from mobile directory
# 3. Scan QR code with Expo Go app
# 4. App loads instantly - no Xcode or Android Studio needed!

# Note: npm start uses './node_modules/.bin/expo start --clear --tunnel'
# - --clear: Prevents Metro bundler cache issues
# - --tunnel: Enables WSL networking support for Windows users

# For native builds (Advanced - Only if you need custom native modules):
npm run android        # Build and run on Android device/emulator
npm run ios            # Build and run on iOS simulator (macOS + Xcode required)
```

### Web
```bash
cd web
npm run dev            # Start Vite dev server (http://localhost:5173)
npm run build          # Production build
npm run preview        # Preview production build
```

### Roku TV
```bash
cd tv/roku

# Build package
python3 -m zipfile -c StoryScout.zip components/ images/ manifest source/

# Deploy to Roku device
# 1. Enable Developer Mode on Roku (Home 3x, Up 2x, Right, Left, Right, Left, Right)
# 2. Find Roku IP: Settings → Network → About
# 3. Open browser: http://<your-roku-ip>
# 4. Login: username 'rokudev' + your developer password
# 5. Upload StoryScout.zip under "Development Application Installer"

# See tv/roku/README.md for detailed step-by-step instructions
```

### Data Management
```bash
# Fetch 51 curated films from Internet Archive
node web/fetch-archive-content.mjs

# Upload content to Firestore (requires Firebase service account)
node web/upload-archive-content.mjs
```

### Firebase/Deployment
```bash
firebase deploy --only firestore:rules  # Deploy security rules
firebase deploy --only hosting          # Deploy web app
firebase deploy                          # Deploy everything
```

## 🔧 Environment Setup

### Prerequisites
- **Node.js** >= 20.19.x (Required for React Native)
- **npm** (comes with Node.js)
- **Firebase CLI** >= 14.x (for deployment)
- **Expo Go app** on your phone (for mobile testing - free from App/Play Store)
- **Android Studio** (optional, only for native Android builds)
- **Xcode** (optional, only for native iOS builds, macOS only)

### Environment Variables

Create `.env` files from the examples:

**mobile/.env:**
```bash
EXPO_PUBLIC_FIREBASE_API_KEY=your_api_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=story-scout.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=story-scout
# ... (see mobile/.env.example)
```

**web/.env:**
```bash
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=story-scout.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=story-scout
# ... (see web/.env.example)
```

## 🏗️ Architecture

## Firebase & Google Cloud
- Default project: 'story-scout'
- Enabled core services: Firestore, Authentication, Cloud Functions, Firebase Hosting, Storage, Firestore Rules.
- Created platform apps via Firebase CLI:
  - Web: 1:148426129717:web:462a557ff1908c44ea0c7c
  - Android: 1:148426129717:android:a61598f76bbb9657ea0c7c (package com.storyscout.app)
  - iOS: 1:148426129717:ios:12e9375f53b43377ea0c7c (bundle com.storyscout.app)
- Firestore database initialized in region 'us-central1'.
- Firebase Storage bucket gs://story-scout.firebasestorage.app is active (public read under /public, authenticated uploads under /uploads/{userId}).
- Expo iOS build references mobile/ios/GoogleService-Info.plist; keep secrets out of version control for production.

### Local CLI Notes
- Firebase CLI v14 requires Node >=20. Use the vendored runtime in .local/node20/node-v20.16.0-linux-x64/bin when running firebase commands.

## Features

### Watch Party (NEW!)
- **Cross-Platform Sync**: Watch movies together in real-time across mobile, web, and Roku
- **6-Character Join Codes**: Easy party creation and joining with uppercase codes (e.g., ABC123)
- **Real-Time Playback Sync**: Play, pause, and seek synchronized across all participants
- **Participant List**: See who's watching with platform indicators (📱 mobile, 💻 web, 📺 Roku)
- **Host Controls**: Party creator controls playback; guests sync automatically
- **Multi-Platform Support**:
  - Mobile & Web: Real-time Firebase sync
  - Roku: REST API polling for sync state
- **Auto-Join Full Movie**: Guests automatically start the full movie when joining a party
- **Live Chat Overlay**: TikTok-style transparent chat that floats above the video without blocking controls
  - **Web**: Transparent chat column on right side of fullscreen video
  - **Mobile**: Chat overlay in bottom 20-25% of screen during fullscreen playback
  - **Color-Coded Messages**: Cyan for your messages, magenta for others
  - **Real-Time Sync**: Messages poll every 2 seconds, synced across all platforms
  - **Cross-Platform**: Chat works between mobile, web, and Roku users

### Engagement System
- **TikTok-Style Interactions**: Vertical engagement bar with likes, reviews, and shares
- **Review System**: 5-star ratings with text reviews
- **Real-time Updates**: Engagement counts update live across all users
- **Social Sharing**: Native share on mobile, Web Share API on desktop
- **Audio Controls**: Global mute/unmute toggle - unmute once, all videos play with audio

### Content Architecture
- **Internet Archive Integration**: Direct MP4 video files from Internet Archive's public domain collection
- **No API Keys Required**: Free, open access to thousands of classic films and shorts
- **Native Video Playback**: Uses expo-av Video component (works in Expo Go without native builds)
- **Auto-play Trailers**: Muted, looping videos in vertical feed; full videos with controls on demand
- **Cross-Platform Compatible**: Direct video URLs work on mobile (iOS/Android), web, and TV platforms

### Cross-Platform Features
- **Mobile**: React Native (Expo) with iOS and Android support
- **Web**: Responsive React + Vite app
- **Roku TV**: Native BrightScript app with TV-optimized UI
- **Shared Backend**: Common Firebase (Auth, Firestore) across all platforms
- **Shared Content**: Same 51 Internet Archive films on all platforms
- **Design Consistency**: Unified Story Scout branding (pink/cyan palette)

## Development Notes
- Copy environment example files (.env.example, mobile/.env.example, web/.env.example) to real .env files before running apps.
- Web client fetches Firestore data through helpers in shared/firebase; start with yarn workspace story-scout-web dev.
- Expo Metro bundler is configured (mobile/metro.config.js) to watch the shared workspace; run yarn workspace story-scout-mobile start.
- Use Firebase emulators for Firestore and Storage via firebase emulators:start --only firestore,storage (ports configured in firebase.json).

### Internet Archive Integration
- **No API keys required**: Free, open access to thousands of classic films
- **Direct MP4 playback**: Videos work natively on all platforms (mobile, web, TV)
- **Curated collection**: 51 validated films across 9 genres (Comedy, Horror, Sci-Fi, Action, Drama, Animation, Family, Mystery, Documentary)
- **Mix of content**: Classic public domain films (pre-1970) and modern indie/open source films (2005-2024)
- **Fetch script**: Run `node web/fetch-archive-content.mjs` to refresh content from Internet Archive
- **Collections used**: feature_films, opensource_movies, shortfilms
- **Output**: Content saved to `shared/mocks/archive-content.json`

### Running Locally
- Use Node >= 20.19.x to satisfy the React Native engine requirement.
- Install dependencies: run npx -y yarn@1.22.22 install from an elevated prompt if Windows blocks symlinks.
- Web client: yarn workspace story-scout-web dev (Vite dev server).
- Mobile client: yarn workspace story-scout-mobile start (Expo CLI; press a for Android).
- Optional seeding: set FIREBASE_ADMIN_CREDENTIALS to your service-account JSON path then execute node scripts/seed-public-content.js to refresh mock Vimeo data.

### Deployment
```bash
# Build web app
cd web && npm run build && cd ..

# Deploy Firestore rules only
firebase deploy --only firestore:rules

# Deploy web hosting
firebase deploy --only hosting

# Deploy everything
firebase deploy
```

## Database Schema

### Collections

#### publicContent
Content catalog with trailer and full video references:
- `trailerType`, `trailerVideoId`: Trailer source for feed
- `fullContentType`, `fullContentVideoId`: Full content source
- `likes`, `shares`, `reviews`, `averageRating`: Engagement metrics

#### engagements
User interactions (likes, shares):
- `userId`, `contentId`, `type`, `createdAt`
- Automatic count updates to `publicContent`

#### reviews
User reviews with ratings:
- `userId`, `contentId`, `rating` (1-5), `reviewText`
- Auto-calculates `averageRating` on `publicContent`

#### watchParties
Real-time watch party sessions:
- `code`: 6-character uppercase join code (document ID)
- `hostUserId`: Party creator
- `contentId`, `contentTitle`, `videoUrl`: Content being watched
- `status`: 'waiting' | 'playing' | 'paused' | 'ended'
- `currentTime`: Playback position in seconds
- `participants`: Array of {userId, displayName, platform, joinedAt}
- `maxParticipants`: Capacity limit (default: 10)
- `createdAt`, `lastSync`: Timestamps

See `CHANGELOG.md` for detailed schema documentation.

## 🚨 Troubleshooting

### Mobile Build Issues

**"Cannot find module expo/bin/cli" Error**
- This is due to npm workspaces hoisting dependencies to the root
- **Solution 1**: Run from root: `npm start --workspace=mobile`
- **Solution 2**: The mobile package.json has been updated with proper paths
- **Solution 3**: Run `npm install` from the root directory to ensure all dependencies are installed

**"import.meta is currently unsupported" (Hermes)**
- This has been fixed in `shared/firebase/config.ts`
- The code now uses indirect access to avoid Hermes parse errors
- If you still see this, ensure you've pulled the latest changes

**"Invalid resource field value in the request" (Firestore)**
- Ensure you're authenticated (create account in app first)
- Check Firestore security rules allow writes
- Run `firebase deploy --only firestore:rules`

**Expo Go vs Native Builds**
- Use **Expo Go** for quick testing on both Android and iOS (no build required)
- **Videos work fully in Expo Go**: Internet Archive direct MP4 files play with expo-av
- Use **native builds** (`npm run android`) only if you need custom native modules
- Expo Go now supports all core features including video playback

### Web Issues

**"Cannot find module @rollup/rollup-win32-x64-msvc"**
- Delete `node_modules` and `yarn.lock`
- Run `yarn install` from project root

**Firebase connection errors**
- Verify `.env` file exists in `web/` directory
- Check that `VITE_FIREBASE_*` variables are set correctly

### Common Issues

**Videos not loading or showing errors**
- Ensure you've fetched Internet Archive content: `node web/fetch-archive-content.mjs`
- Check that `shared/mocks/archive-content.json` exists and contains data
- All content is validated public domain - no private video issues

**App shows mock data instead of Firestore data**
- Create an account and sign in
- App uses mock data when not authenticated
- Verify Firestore has data: `firebase firestore:get publicContent`

## 📖 Documentation

- **[CHANGELOG.md](./CHANGELOG.md)** - Version history and recent changes
- **[Roku TV README](./tv/roku/README.md)** - Complete Roku app setup and usage guide
- **[Product Requirements](./docs/)** - PRD and design documents
- **[GitHub Issues](../../issues)** - Bug reports and feature requests
- **[Firebase Console](https://console.firebase.google.com/project/story-scout)** - Database and auth management

### Platform-Specific Guides
- **Mobile/Web**: See sections above for Expo Go and Vite setup
- **Roku TV**: See [tv/roku/README.md](./tv/roku/README.md) for:
  - Developer mode setup
  - Package building and deployment
  - Navigation controls reference
  - UI design specifications
  - Troubleshooting guide

## 🤝 Contributing

1. Create a feature branch from `main`
2. Make your changes
3. Test on both mobile and web
4. Create a pull request
5. Update CHANGELOG.md with your changes

## 📝 License

[Add your license here]

---

**Note:** This is a monorepo. Always run `yarn install` from the root to ensure all workspaces are properly linked.
