# Cambodia Kinder Learning (Koki) 🇰🇭 🐵

A Cambodia-first educational mobile game built with **React Native** and **Expo (SDK 57)** designed for children ages **3–9**. Koki teaches Khmer script, numbers, phonics, vocabulary, and early English through gamified, offline-first adventures.

---

## 🌟 Key Features

### 🛡️ Child Safety & Privacy by Design
- **COPPA & Store Kids Category Compliant**: Zero advertising SDKs, zero third-party trackers, zero camera access, zero microphone permissions.
- **Parent Gate**: All sensitive areas (settings, account binding, friend requests, screen time) are strictly guarded behind a dynamic math-challenge gate.
- **Private Friend Codes**: Children connect only with known friends via private parent-shared codes. No public directory, no nearby search, no stranger discovery, and no direct messaging.
- **Friends-Only Leaderboard**: Friendly, non-punitive learning leaderboard ("Friends Learning Together") celebrating positive effort without public shaming or loser labels.
- **Full Account & Data Deletion**: Direct one-tap cascade cloud deletion compliant with Apple Guideline 5.1.1(v) and Google Play User Data Policy.

### 📚 Interactive Curriculum & Worlds
- **Koki Village (World 1)**: Core starter world bundled for 100% offline learning.
- **English Side Quest**: Foundational English phonics and vocabulary.
- **Listening & Tracing Activities**: Audio-first phonics, letter recognition, and interactive tracing.
- **Downloadable Content Packs**: Dynamic pack manager with SHA-256 integrity verification, sandboxed local storage, and safe HTTPS downloads.

### 🎮 Motivation & Gamification
- **Hearts System**: Safe retry mechanism that regenerates over time.
- **Daily Goals & Streaks**: Encourages consistent daily learning habits.
- **Coin Ledger & Wardrobe**: Earned coins unlock child-friendly avatars and cosmetic companions.
- **Gentle Learning Reminders**: Parent-scheduled, positive, non-guilt local notifications.

### ⚡ Offline-First Architecture
- **Local SQLite Engine**: Powered by `expo-sqlite` with automatic migrations (`v1` through `v10`).
- **Optional Cloud Sync**: Optional Supabase backend syncing lesson progress, cosmetic inventories, streaks, and friendships across devices with deterministic conflict resolution.

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or newer)
- [Xcode](https://developer.apple.com/xcode/) (for iOS simulator on macOS)
- [Android Studio](https://developer.android.com/studio) (for Android emulator)

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/Chhunsour/Cambodia-Kinder-Learning.git
   cd Cambodia-Kinder-Learning
   ```

2. Install dependencies:
   ```bash
   npm install --legacy-peer-deps
   ```

3. (Optional) Set up Supabase environment variables:
   ```bash
   cp .env.example .env
   ```

### Running the App
- **iOS Simulator**:
  ```bash
  npm run ios
  ```
- **Android Emulator / Device**:
  ```bash
  npm run android
  ```
- **Start Expo Metro Bundler**:
  ```bash
  npm start
  ```

---

## 🧪 Verification & Automated Tests

Koki includes comprehensive automated test suites covering progression, child safety compliance, audio, and sync engines:

```bash
# Verify Child Safety & Store Compliance (100% Pass)
node scratch/test_compliance_and_security.js

# Verify Notifications & Reminder Logic
node scratch/test_notifications.js

# Verify Local <-> Cloud Sync Engine & Conflict Resolution
node scratch/test_sync_engine.js

# TypeScript Type Check
npm run typecheck
```

---

## 📂 Project Structure

```text
├── app/                    # Expo Router file-based navigation
│   ├── (main)/             # Main child experience (Home, Adventure, Companion, Collection)
│   ├── (onboarding)/       # First-time child setup & avatar picker
│   ├── lesson/             # Interactive lesson gameplay screens
│   ├── parent/             # Parent Area (behind Parent Gate)
│   └── _layout.tsx         # Root layout & navigation providers
├── assets/                 # Bundled fonts, audios, manifests, and images
├── components/             # Reusable UI components & Design System tokens
├── features/               # Modular domain features
│   ├── contentPacks/       # Downloadable pack manager & SHA-256 verifier
│   ├── friends/            # Parent-managed private friend codes
│   ├── leaderboard/        # Safe friends-only leaderboard
│   ├── lessons/            # Lesson session runner & interactive activities
│   ├── notifications/      # Gentle local reminder scheduling
│   ├── parent/             # Parent settings & account management
│   └── progression/        # Curriculum, stars, streaks, and hearts
├── hooks/                  # Custom React hooks
├── services/               # Core services (AudioService, SyncEngine)
├── storage/                # SQLite repositories, migrations, and schema definitions
└── supabase/               # Supabase SQL migrations & RLS security policies
```

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
