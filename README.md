
# Story Scout

Monorepo scaffolding for the Story Scout discovery platform. The repo is organized to support simultaneous delivery of mobile (Android/iOS), web, and streaming (Roku/Fire TV) apps from a shared design system and content schema.

## Project Structure
- docs/ - Product requirements and design references.
- mobile/ - React Native (Expo) client targeting iOS and Android.
- web/ - React + Vite client for responsive desktop/web.
- tv/roku - Roku SceneGraph client.
- tv/firetv - Android TV client targeting Fire TV devices.
- shared/ - Design tokens, mocked data, and utilities consumed across platforms.

## Platform Stack
- Backend & Services: Firebase (Auth, Firestore, Cloud Storage, Cloud Functions) deployed via Google Cloud.
- Mobile: Expo-managed React Native app with Firebase SDK integration.
- Web: Vite + React single-page app hosted via Firebase Hosting or Cloud Run.
- Streaming: Roku SceneGraph and Fire TV (Android TV) apps consuming shared services and tokens.

## Getting Started (Next Steps)
1. Install Node.js >= 18 and Yarn (Berry) to manage workspaces.
2. Initialize Yarn workspaces with platform packages (to be generated in upcoming steps).
3. Scaffold the Expo mobile app inside mobile/ and wire Firebase config.
4. Scaffold the Vite React web app inside web/ and set up Firebase web SDK.
5. Import shared design tokens and mocked feed data into each client to build the trailer feed shell.

Refer to docs/story-scout-mobile-mvp-prd.md for product scope and roadmap. Keep this document updated as scaffolding progresses.

## Firebase & Google Cloud
- CLI authenticated as lithrlnd@gmail.com; default project is 'story-scout'.
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

## Development Notes
- Copy environment example files (.env.example, mobile/.env.example, web/.env.example) to real .env files before running apps.
- Web client fetches Firestore data through helpers in shared/firebase; start with yarn workspace story-scout-web dev.
- Expo Metro bundler is configured (mobile/metro.config.js) to watch the shared workspace; run yarn workspace story-scout-mobile start.
- Use Firebase emulators for Firestore and Storage via firebase emulators:start --only firestore,storage (ports configured in firebase.json).

- Vimeo integration (free films):
  - Set VIMEO_CLIENT_ID in your env files; current project uses 2a69ae3d2f4d6b7db17b89b8e678d9e8f43422ba.
  - Set VIMEO_ACCESS_TOKEN (get from https://developer.vimeo.com/apps - requires a Vimeo account with "Public" and "Private" scopes).
  - To fetch real Vimeo content: deploy Cloud Function `syncVimeoContent` and call it via HTTP to populate Firestore with Creative Commons videos.

### Running Locally
- Use Node >= 20.19.x to satisfy the React Native engine requirement.
- Install dependencies: run npx -y yarn@1.22.22 install from an elevated prompt if Windows blocks symlinks.
- Web client: yarn workspace story-scout-web dev (Vite dev server).
- Mobile client: yarn workspace story-scout-mobile start (Expo CLI; press a for Android).
- Optional seeding: set FIREBASE_ADMIN_CREDENTIALS to your service-account JSON path then execute node scripts/seed-public-content.js to refresh mock Vimeo data.
