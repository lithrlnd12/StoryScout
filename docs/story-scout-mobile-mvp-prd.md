# Story Scout Cross-Platform MVP PRD

**Document Owner:** Product + Platform Team
**Last Updated:** 2024-XX-XX
**Version:** 0.2 (Draft)

## 1. Executive Summary
Story Scout is a trailer-first discovery platform that helps overwhelmed streamers decide what to watch by watching, not browsing. Phase 1 delivers a unified MVP across Mobile (iOS + Android), Desktop/Web, and Streaming (Roku + Fire TV) clients that share a common layout schema and experience language. The MVP focuses on the curated tech/education catalog (~200 titles) with free, ad-supported access and lays the groundwork for premium monetization, creator tooling, and future platform expansion.

## 2. Goals & Non-Goals
- **Primary Goals**
  - Validate the trailer feed discovery loop across phone, tablet, desktop browser, and streaming TV with consistent UI patterns (Movie Feed, Watch Party Invite, Profile, Upload, Subscription) per provided layout schema.
  - Achieve <2s trailer start times and <3s full content start times on all client platforms with adaptive streaming.
  - Acquire 100K users with >=40% week-1 retention and 10+ trailers per session across platforms.
  - Capture engagement telemetry to power future personalization and monetization optimization.
- **Secondary Goals**
  - Launch foundational monetization via pre-roll ads on free tier and surface premium upsell screens.
  - Provide creators with confidence in Story Scout distribution via polished upload and profile views (mobile + desktop lead, TV read-only).
  - Build reusable component library and API contracts that enable rapid feature parity across platforms.
- **Non-Goals (Future Phases)**
  - Offline downloads, advanced social/community features, creator payout tooling (Phase 3+).
  - Full personalization engine (collect signals only for now).
  - Additional platforms (Apple TV, Samsung Tizen, etc.).

## 3. Target Users & Personas
- **Overwhelmed Streamer** (Primary): 25-45, subscribes to multiple services, wants to "press play" quickly whether on phone, laptop, or TV.
- **Content Creator** (Secondary): Independent filmmaker/educator uploading content via desktop or mobile, monitoring audience growth.
- **Lifelong Learner** (Tertiary): Professionally motivated viewer sampling educational content on desktop during work breaks and TV at night.

## 4. Phased Scope Overview
| Phase | Platforms | Focus | Key Deliverables |
|-------|-----------|-------|------------------|
| 1A | Mobile (iOS/Android) | Core feed + playback | Trailer feed, full player, watchlist, reviews, subscription CTA |
| 1B | Desktop/Web (Responsive) | Feature parity for browsing/upload | Responsive layout, creator upload workflow, watch party invite |
| 1C | Streaming (Roku/Fire TV) | Lean-back consumption | Remote-driven feed, watch full, upsell, watchlist access |

## 5. Success Metrics (MVP Targets)
- **Acquisition & Engagement**: 100K MAU, >=40% week-1 retention, >=25-minute average session duration, >=10 trailers viewed/session.
- **Conversion & Consumption**: Trailer->full-content conversion 15-25%, full-content completion >=60% (mobile/TV), desktop upload conversion >=30% for approved creators.
- **Monetization**: $500K revenue via ads within first 3 months; premium upsell click-through >=8%.
- **Content Supply**: 200 launch titles, >=30% creator acceptance rate, 90% of titles with captions.

## 6. Experience Principles
- **Unified Schema**: Core surfaces (Feed, Watch Party Invite, Profile, Upload, Subscription) share hierarchy, styling, and naming across platforms per provided design reference.
- **Instant Gratification**: Minimal chrome, auto-play trailers, prefetch next asset.
- **Frictionless Transition**: One-tap/click/remote button to "Watch Full" with persistent progress across devices.
- **Contextual Controls**: Thumb-reachable on mobile, keyboard/mouse accessible on desktop, D-pad friendly on TV.
- **Inclusive Design**: WCAG AA, caption defaults, high-contrast actions, screen reader labels.

## 7. Layout Schema Alignment (Design Reference)
Provided mockups illustrate five key screens: **Movie Feed**, **Watch Party Invitation**, **Profile**, **Upload Film**, **Subscription Model**. All platform implementations must:
- Preserve component hierarchy (hero media area, segmented genre tabs, action tray at bottom/top depending on platform conventions).
- Maintain consistent naming for primary CTAs (Watch Full, Invite, Submit Film, Subscribe).
- Reuse color tokens (neon magenta/blue gradients, dark backgrounds) and spacing rhythm (8pt scale).
- Provide platform-specific navigation chrome while preserving iconography (Home, Discover, Upload/Post, Watch Party, Profile).
- Document deviations in platform design appendix with rationale and accessibility considerations.

## 8. User Journeys & Flows
1. **First-Time Onboarding (Mobile/Desktop)**
   - Install/Visit -> Value prop carousel -> Account creation (email + password, Apple/Google SSO mobile, Google/Apple/Facebook desktop) -> Content preferences (optional) -> Feed autoplay.
2. **Lean-back Launch (Roku/Fire TV)**
   - App open -> Account selection (profile) -> Trailer auto-play on hero card -> Remote up/down to browse.
3. **Trailer Discovery Loop**
   - Auto-play first trailer -> Genre pill filter -> Swipe/scroll (mobile/desktop) or remote (TV) -> Quick actions (Watch Full, Save, Share/Invite, Like future) contextually displayed.
4. **Watch Party Invite (Mobile/Desktop)**
   - Trigger from trailer or profile -> Friend list modal (per mock) with search and suggestions -> Send invites (SMS/email push on mobile, email/URL share on desktop).
5. **Full Content Viewing**
   - Watch Full CTA -> Player loads with orientation prompt (mobile) or full-screen (desktop/TV) -> Playback controls, ad breaks for free tier -> End slate (recommendations + review prompt).
6. **Profile Browsing**
   - Access via bottom/tab bar -> Display liked/saved grid matching schema -> Settings gear for account details.
7. **Content Upload (Mobile optional, Desktop primary)**
   - Access via Upload tab -> Form fields (title, description, genre dropdown, hashtags) per layout -> Upload validation (MP4/MOV 2-30 min) -> Submission confirmation.
8. **Subscription Upsell**
   - Access from nav or gating moments -> Plan comparison (Free vs Premium $9.99) per design -> In-app purchase flow (mobile), web checkout (desktop), Roku/Fire TV native billing for premium (Phase 2 optional).

## 9. Functional Requirements
### 9.1 Discovery Feed (All Platforms)
- Single focused trailer with blurred background preview.
- Genre tabs anchored top (mobile/desktop) or left rail (TV) replicating Action/Comedy/Drama/Sci-Fi/Horror set.
- Auto-play with mute toggle; audio state persists per device.
- Primary CTA is Watch Full. Secondary actions: Save, Share/Invite, Like placeholder.
- Preload next/previous trailer assets; handle offline/slow network gracefully.

### 9.2 Watch Party / Sharing
- Friend suggestion list with invite buttons mirroring mock design.
- Search capability with debounced backend calls.
- Invite transport: push/in-app notifications (mobile), email + URL (desktop), QR code for TV (Phase 1C optional).
- State for pending invites and ability to cancel.

### 9.3 Player Experience
- Support portrait trailers (9:16) and landscape full content (16:9) with smooth transitions.
- Controls tailored per platform:
  - Mobile: tap controls, gesture seeking, picture-in-picture (iOS/Android) optional.
  - Desktop: keyboard shortcuts, mouse hover controls.
  - TV: D-pad navigation, play/pause via OK button, skip via left/right.
- DRM readiness: Widevine (Android/Chrome), FairPlay (iOS/Safari), PlayReady optional (Fire TV) pending licensing.

### 9.4 Accounts & Profiles
- Authentication parity across platforms with SSO fallbacks.
- Profile sections: Liked, Saved, Uploads (creators), follower counts.
- Settings gear: manage notifications, data saver, playback preferences.
- Multi-device sync of watch history and saved list.

### 9.5 Creator Upload Workflow
- Desktop primary; mobile upload optional (Phase 1A limited to metadata editing).
- Form validation for required fields matching mock placeholders.
- Upload progress indicator; background processing for transcoding.
- Confirmation and review timeline messaging.

### 9.6 Subscription & Monetization
- Free tier default; premium plan card per mock with gradient CTA.
- Support in-app purchases (Apple, Google) and Stripe/PayPal on web; Roku/Fire TV billing deferred (display upsell only in MVP).
- Pre-roll ads integrated via chosen ad partner with frequency caps.
- Hook for mid-roll markers (metadata-driven, disabled by default).

### 9.7 Notifications & Messaging
- Push notifications (mobile) for new content, watch party invites, reminders.
- Email notifications (desktop) for watch party and upload status.
- In-app inbox for cross-platform parity.

### 9.8 Accessibility & Localization
- Closed captions default to on when muted; toggle persists.
- Support dynamic type (mobile) and scalable text (desktop/TV).
- Localization scaffolding (EN baseline, architecture ready for ES/FR).

## 10. Content & Data Requirements
- **Catalog**: 200 verified titles with trailers and full-length assets, metadata (title, synopsis, genre tags, maturity, runtime).
- **Asset Specs**: Trailers 1080x1920 (9:16), full content up to 1080p (16:9); fallback 720p encodes available.
- **Captions**: SRT/VTT per asset, ingest pipeline ensures timecodes align with both trailer and full video.
- **Ad Metadata**: Pre-roll URLs, optional mid-roll cue points.
- **User Data**: Profiles, watchlist, playback progress, review submissions, invite logs.

## 11. Technical Requirements
- **Frontend Stacks**: React Native (Expo managed workflow for iOS and Android), React + Vite web client, Roku BrightScript/SceneGraph, and Fire TV (Android TV / Kotlin) shells that consume the shared design system and data contracts.
- **Shared Component Library**: Design tokens (colors, typography, spacing) exported for Figma + code; ensures schema consistency.
- **Backend Services**: Firebase Auth, Firestore, Cloud Storage (public assets + authenticated creator uploads), Cloud Functions (GraphQL/REST content API), Cloud Messaging, plus Ads and analytics integrations on Google Cloud. Web client uses Firebase JS SDK via shared/firebase config.
- **Video Delivery**: CDN with HLS/DASH packaging, DRM license server integration, prefetch endpoints for next trailer.
- **Performance Budgets**: App cold start <3s mobile, <2s desktop web; trailer start <2s; player memory footprint <150MB mobile, <300MB TV.
- **Security & Privacy**: Encrypt sensitive data, secure storage (Keychain/Keystore), GDPR/CCPA consent capture, audit logging for uploads.
- **Testing Strategy**: Unit/UI tests per platform, cross-device QA matrix (iPhone 13/15, Pixel 6, iPad, Surface, Roku Ultra, Fire TV Stick 4K). Automated regression suite for feed/player.

## 12. Analytics & Telemetry
- Core events: app_open, trailer_play_start/complete, swipe_next, watch_full_tap, full_play_start/complete, ad_impression, invite_sent/accepted, review_submit, watchlist_add/remove, upload_start/submit, subscription_cta_click.
- Sessionization consistent across devices (shared user ID).
- Dashboard segmentation by platform to measure KPIs (MAU, retention, conversion).
- A/B testing hooks for feed ordering and upsell messaging (Phase 2).

## 13. Rollout Plan & Milestones
- **Month 0-1**: Finalize cross-platform design system, confirm tech stacks, deliver mobile feed prototype, start desktop responsive shell.
- **Month 2**: Integrate streaming playback, authentication, watchlist, analytics instrumentation; begin Roku/Fire TV UI implementation.
- **Month 3**: Content ingestion finalized, ad integration complete, cross-platform QA, beta programs (TestFlight, Play Closed Alpha, Web staging, Roku Direct Publisher preview, Fire TV beta).
- **Launch Criteria**: KPI telemetry live, crash-free sessions >=99%, trailer start SLA met across devices, content library tagged, compliance and accessibility checks passed.

## 14. Risks & Mitigations
- **Platform Divergence**: Risk of inconsistent UX; mitigate with shared design tokens, schema documentation, weekly design syncs.
- **Video Performance on TV**: Prefetch and CDN tuning, fallback to lower bitrate when needed.
- **Ad Experience**: Frequency caps, fallback creatives for TV where interactive ads unsupported.
- **Upload Complexity**: Desktop-first workflow with clear validation; monitor drop-off analytics.
- **Billing Fragmentation**: Phase premium purchases by platform; ensure clear messaging where billing unsupported.

## 15. Open Questions
- Ad partner selection (Google IMA, SpringServe, etc.) and TV SDK support.
- Firebase project configuration (environments, security rules) approval timeline.
- Scope of watch party functionality on TV (view invites vs create) for MVP.
- Level of DRM enforcement required at launch vs shortly after.
- Internationalization timeline and priority languages beyond English.

---
*Next Steps: Attach platform-specific mockups referencing the shared schema, align engineering estimates per platform, and break features into sprint-level user stories.*

## 16. Implementation Status
- **Completed**: Firebase project wiring (Auth, Firestore, Storage), deployed security rules, seeded publicContent with mock trailers, shared design tokens/mocks, Expo and Vite shells consuming live Firestore data, shared Firebase helper modules in shared/firebase.
- **In Progress**: Dependency installation (requires Node >= 20.19), platform-specific UI polish, authentication flows, watchlist/upload/review features, TV client scaffolding, automated testing.
- **Upcoming**: Real content ingestion, analytics dashboards, monetization integration, CI/CD setup, Roku/Fire TV prototype build-out, performance profiling.
