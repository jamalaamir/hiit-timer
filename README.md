# 🏋️ HIIT Interval Timer By Jamal Aamir Khan

> The ultimate free workout timer app for Android — built for serious athletes and beginners alike.

---

## 📱 Download

[![Download APK](https://img.shields.io/badge/Download-APK-22C55E?style=for-the-badge&logo=android)](https://github.com)
[![Amazon Appstore](https://img.shields.io/badge/Amazon-Appstore-FF9900?style=for-the-badge&logo=amazon)](https://amazon.com)

---

## ✨ Features

### ⏱ Interval Timer
- Fully customizable **Warm Up**, **Work** and **Rest** intervals
- Set rounds from **1 to 30**
- Visual countdown with **color-coded phases**
- Audio alerts for every phase change
- **5 second countdown** before each phase starts
- Screen stays **ON** during your entire workout

### 🎯 Quick Presets
| Preset | Warm Up | Work | Rest | Rounds |
|--------|---------|------|------|--------|
| BEGINNER | 2:00 | 0:20 | 0:40 | 5 |
| ATHLETE | 1:00 | 0:40 | 0:20 | 8 |
| BEAST | 0:30 | 1:00 | 0:10 | 12 |
| TABATA | 0:10 | 0:20 | 0:10 | 8 |
| BOXING ROUND | 1:00 | 3:00 | 1:00 | 12 |
| CARDIO BURN | 1:30 | 0:45 | 0:15 | 10 |
| NAVY SEAL | 0:30 | 2:00 | 0:20 | 15 |

### 🕐 Stopwatch
- Precision **HH:MM:SS.cc** format
- Lap recording with split times
- 🏆 Fastest and 🐢 slowest lap highlighting
- Lap summary with totals

### 🎵 Music Player
- Load your own music from your device
- **Shuffle** or **In Order** playback
- Auto plays next song automatically
- Volume control and seek bar
- Playlist view

### 🎨 Themes
- ☀️ Light Mode
- 🌙 Dark Mode
- 🔴 Red Fire
- 🔵 Ocean
- 🟣 Purple Beast
- 🟡 Gold Champion

### 🔊 Sound Packs
- 🔔 Default
- 🥊 Boxing Bell
- 🪖 Military
- 🧘 Zen

---

## 📸 Screenshots

> Coming soon

---

## 🛠 Built With

| Technology | Purpose |
|------------|---------|
| React + Vite | Frontend UI |
| Capacitor.js | Android wrapper |
| Web Audio API | Sound generation |
| LocalStorage | Settings persistence |
| GitHub Actions | Automated APK build |

---

## 🚀 Build From Source

### Requirements
- Node.js 20+
- Java 17
- Android SDK

### Steps

```bash
# Clone the repo
git clone https://github.com/yourusername/hiit-interval-timer.git
cd hiit-interval-timer

# Install dependencies
npm install --legacy-peer-deps

# Build web app
npm run build

# Add Android platform
npx cap add android

# Sync to Android
npx cap sync android

# Open in Android Studio (optional)
npx cap open android
```

### Automated Build
Every push to `main` automatically builds a signed release APK via **GitHub Actions**.
Download the latest APK from the **Actions** tab → **Artifacts**.

---

## 📂 Project Structure

```
hiit-interval-timer/
├── src/
│   ├── App.jsx          # Main React app
│   └── main.jsx         # Entry point
├── icons/               # Android app icons (all densities)
├── .github/
│   └── workflows/
│       └── build-apk.yml  # GitHub Actions workflow
├── index.html
├── vite.config.js
├── capacitor.config.json
└── package.json
```

---

## ⚙️ GitHub Actions Secrets Required

To build a signed release APK, add these secrets to your repo:

| Secret | Description |
|--------|-------------|
| `KEYSTORE_PASSWORD` | Your keystore password |
| `KEY_ALIAS` | Your key alias |
| `KEY_PASSWORD` | Your key password |

---

## 📋 App Info

| Field | Value |
|-------|-------|
| **App ID** | com.jamalaamirkhan.hiittimer |
| **Version** | 1.0.0 |
| **Min Android** | Android 5.0 (API 21) |
| **Target Android** | Android 14 (API 34) |
| **Size** | ~5MB |
| **Price** | Free |

---

## 👤 Developer

**Jamal Aamir Khan**

[![Instagram](https://img.shields.io/badge/Instagram-E4405F?style=for-the-badge&logo=instagram&logoColor=white)](https://www.instagram.com/jamalaamirkhan/)
[![Facebook](https://img.shields.io/badge/Facebook-1877F2?style=for-the-badge&logo=facebook&logoColor=white)](https://www.facebook.com/jamalaamirk/)

---

## 📄 License

This project is personal software developed by Jamal Aamir Khan.
All rights reserved © 2026 Jamal Aamir Khan.

---

<div align="center">
  Made with ❤️ by Jamal Aamir Khan — Karachi, Pakistan 🇵🇰
</div>
