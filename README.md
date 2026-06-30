<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# WardWatch

WardWatch is a production-grade, offline-first hyperlocal civic platform designed to connect residents, independent contractors (plumbers, electricians, landscapers), and municipal administrators. Residents can report local issues, contractors bid on and resolve repairs, and administrators authorize secure payouts.

---

## 🏆 Vibe2Ship Hackathon Event
This project was built for the **Vibe2Ship** event.

### 📋 Problem Statement: The Hyperlocal Trust & Action Gap
In modern metropolitan and suburban neighborhoods, civic maintenance suffers from a critical bottleneck: the lack of a direct, transparent, and action-oriented terminal connecting local citizens, skilled local contractors, and municipal officials. 
- **Residents** report issues but face a black box regarding validation, repair timelines, and assignment details.
- **Independent Contractors** (plumbers, electricians, builders) struggle to discover local jobs, propose structured bids directly, or communicate milestones with residents.
- **Administrators/Elected Officials** struggle to validate reports, detect duplicate complaints in the same vicinity, export auditing ledgers for municipal budgets, and manage secure payouts with verified proof of work.

**WardWatch** solves this trust and action gap by offering a fully integrated, offline-first civic action terminal with Gemini-audited issue validation, coordinate proximity duplicate detection, structured bidding/counter-offering, secure payouts, and verified rating loops.

---

## 🛠️ Tech Stack & Architecture

- **Frontend**: React 19, TypeScript, TailwindCSS, Lucide Icons, Leaflet Maps, and Sonner notifications.
- **API Protocol**: **tRPC** (end-to-end type-safe queries and mutations) backed by **TanStack Query (v5)**.
- **Backend Server**: Node.js + Express handling static uploads, signed asset endpoints, and tRPC routing adapters.
- **Database Layer**: CockroachDB-compatible relational schema with structured JSON document-repository fallbacks (`db.json` with synchronous atomic write locks).
- **Cloud Storage**: **Google Cloud Storage (GCS)** for persistent media attachments with CDN caching policies.

---

## 🌟 Core Features

### 1. 🔐 Cryptographic JWT Session Tokens & tRPC Protection
- **Session Tokens**: Implements a secure Access Token pattern using HMAC SHA-256 signatures (`jsonwebtoken`).
- **Protected Procedures**: Restricts write operations using tRPC procedures. Unauthenticated clients are rejected with `UNAUTHORIZED` status faults.
- **Context Security**: Token payloads (`userId`, `role`, `email`) are parsed and verified on the server. Outbound mutation parameters (such as `contractorId`, `reporterId`) are derived directly from the trusted backend context (`ctx.user.id`) rather than client inputs.
- **Link Injection**: Frontend client automatically reads and attaches the token in an `Authorization: Bearer <token>` header for all query linkages.

### 2. 📴 View-Only Offline Mode & PWA Caching
- **Network Listening**: Synchronizes network state dynamically via event listeners. Drops instantly lock all write operations (creating reports, scheduling events, voting, RSVPing, claiming work).
- **Sticky Banner Alert**: Prominently warns the user: *"Offline Mode: Showing read-only cached view. Actions are disabled until connection is restored."*
- **Service Worker**: Features a stale-while-revalidate PWA Service Worker (`service-worker.js`) intercepting and caching static assets and uploaded media from GCS/local stores.
- **Cache Headers**: Enforces `Cache-Control: public, max-age=31536000, immutable` headers on Cloud Storage pre-signed URLs and local directories.

### 3. 🛡️ Heuristic Waste & Severity Fallback Auditor
- **Heuristic Auditing**: Fallback analyzer that automatically categorizes issues, determines default severity parameters, and computes representative resource waste templates to speed up reporting workflows.

### 4. 🏘️ Audited Tenancy Conversion & Cooldown Rules
- **Residency Registry**: Enables optional occupancy status ("Homeowner" vs "Tenant") tracking.
- **7-Day Cooldown**: Restricts occupancy modifications to once per week using a residency start cooldown validation rule.
- **Audit Logging**: Saves history timelines inside `tenancyHistory`, displaying transition logs and countdown timers in the profile card settings panel.

### 5. 👥 Public Profiles & Focal Navigation
- **User Handles**: Sanitizes and creates unique user handles (e.g. `@john_resident`) for accounts.
- **Profile Modal Overlays**: Displays clickable links across leaderboards, issue cards, and bids, displaying user stats, civic badges, XP points, and galleries.
- **Inter-Tab Highlighting**: Clicking on an issue within a user's gallery automatically redirects to the main feed, scrolls to the item, and highlights it with a temporary green ring.

### 6. 📅 Campaigns & Events Hub
- **Civic Events**: Allows residents to schedule neighborhood-wide cleanups, tree-plantings, safety patrols, or social meetups.
- **Capacity Tracking**: Limits attendance through customizable RSVP meters and progress counters.

### 7. 🛠️ Rich Dynamic Capabilities & Group Manager
- **Hierarchical Structuring**: Organizes skills and categories under modular parent groups (e.g. Plumbing & Drainage, Civil & Roadwork, Electrical & Power) containing descriptions and image galleries.
- **Optgroup Form Layout**: Categories selection lists are populated dynamically under HTML `<optgroup>` parent blocks with real-time capability previews detailing descriptions and uploaded image galleries.
- **Interactive Checkbox Panels**: Contractors can view and toggle capabilities grouped by categories inside Profile Settings, dynamically matching inquiries matching *any* checked capabilities in their workroom.
- **Capability Transfers & CRUD**: Admin panel enables live creation/updating of groups and capabilities, allowing administrators to transfer a capability to a different group in real-time.

### 8. 💬 Collaborate Chat Rooms & Bidding Proposals
- **Detailed Bidding**: Contractors submit structured service quotes detailing labor costs, materials costs, estimated hours, and notes, replacing simple fixed claims.
- **Bids Approval**: Issue reporters and administrators can review proposals, and click "Accept Proposal" (which assigns the contractor and locks the price quote) or "Decline".
- **Collaborative Chat**: Residents and contractors can chat in real time inside any issue card's coordinate chat drawer, identifying repair steps and updating logs.
- **Utility Alerts Scheduler**: Admins can schedule utilities announcements (water cuts, outages, garbage collection) with categories, date ranges, and affected areas.
- **Geo-fenced Alerts**: Auto-calculates proximity from reported critical issues and pushes warnings to neighbors within 500 meters.

### 9. 💰 Contractor Payment & Payout Tracking
- **Public Accountability**: Tracks all payout statuses (Pending, Processing, Paid, Overdue) securely via CockroachDB-compatible relations.
- **Proof of Payment**: Admins can upload receipt proof URLs and specify payment methods (Cash, UPI, Cheque, Bank Transfer) directly through the governance dashboard.
- **Overdue Detection**: Features an automated 24-hour Node cron job that flags payments as "Overdue" if unpaid 14 days post-resolution, triggering severe alerts to users.
- **Issue Card Badges**: Resolving an issue dynamically surfaces its real-time payment status across the public map and timeline feeds.

### 10. 🗺️ Interactive Leaflet Map Hub & Deep Linking
- **Interactive Map Pins**: Displays custom color-coded map pins (Red, Blue, Amber, Green) marking active construction or repair zones.
- **Dynamic Popups**: Map pins include descriptive popups with immediate action buttons that scroll and highlight the target issue on the main feed.
- **PWA Push Notifications Deep-Linking**: Notifications route users seamlessly to the targeted bid, chat comment, or overdue payment in a single click.
- **Web Share API**: Native device sharing capability allows users to instantly distribute issue deep-links across social media platforms.

### 11. ✨ Inbox & Feed Enhancements
- **Mark All Read**: Quick action to instantly clear notification clutter and sync unread badge counts across the platform.
- **Cursor-Based Infinite Scrolling**: Uses `tRPC`'s `useInfiniteQuery` to paginate large neighborhood datasets in chunks of 10, improving TTI (Time to Interactive) and overall app performance.

### 12. 🚀 Advanced Civic Infrastructure Features
- **Contractor Bid Tracking Hub**: Provides contractors with a dedicated hub panel in the Contractor Workroom to view, track, and manage all their submitted bids (pending, accepted, rejected, or countered). Includes direct accept/decline action triggers for counter-offers.
- **CSV Data Export for Admins**: Enables admins to export the Payments Ledger and Neighborhood Reports in CSV format client-side from the Governance Command Center for transparent municipal auditing.
- **Contractor Rating & Review System**: Allows residents to rate and review contractors (1-5 stars + text comments) directly on the issue cards of resolved projects. Displays calculated average ratings and written reviews inside contractor profile cards.
- **Admin Duplicate Report Detector**: Uses a coordinate-based Haversine distance engine to automatically flag potential duplicates within 100 meters under the same category, allowing admins to link/unlink them and clean up the public feed.

---

## 🚀 Running Locally

### Prerequisites
- Node.js (v18 or higher)
- pnpm

### 1. Installation
Install all backend and client dependencies:
```bash
pnpm install
```

### 2. Environment Variables
Create a `.env` file in the root directory (based on `.env.example`):
```env
PORT=5001
JWT_SECRET=your-super-secret-cryptographic-key
GEMINI_API_KEY=your-google-gemini-api-key
# GCS configs (optional, falls back to local static server directory)
GCS_BUCKET_NAME=your-gcs-bucket
GOOGLE_APPLICATION_CREDENTIALS=path-to-service-account.json
```

### 3. Start Development Server
Run the local Express development server:
```bash
pnpm run dev
```
Open your browser and navigate to `http://localhost:5001` (or whichever port is shown).