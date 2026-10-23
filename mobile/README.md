# WorkLogy Mobile Applications — Developer Setup & Operations Guide (`mobile/README.md`)

This directory contains the two standalone native mobile applications for the **WorkLogy Hyperlocal Marketplace**:

1. **WorkLogy Customer Mobile App** (`mobile/customer-app/`)
2. **WorkLogy Vendor Pro Mobile App** (`mobile/vendor-app/`)

Both applications are built with **React Native 0.86**, **Expo SDK 57**, and **TypeScript 5.6**, communicating with the central Express backend and MongoDB database.

---

## 1. Prerequisites & Environment Requirements

| Requirement | Supported Version | Note |
| :--- | :--- | :--- |
| **Node.js** | `>= 18.0.0` (LTS recommended, tested on Node 20 & 25) | Node runtime |
| **npm** | `>= 9.0.0` | Package manager |
| **Expo CLI** | `npx expo` | Built into project dependencies |
| **Backend API** | Port `5001` | Must be running (`cd backend && npm run dev`) |
| **Development Device** | Android Studio Emulator, iOS Simulator, or Physical Phone | Requires **Expo Go** app for physical testing |

---

## 2. WorkLogy Customer Mobile App (`mobile/customer-app`)

### Step 1: Install Dependencies
```bash
cd mobile/customer-app
npm install
```

### Step 2: Configure Environment Variables
Copy `.env.example` to create `.env`:
```bash
cp .env.example .env
```

Configure `EXPO_PUBLIC_API_URL` and `EXPO_PUBLIC_SOCKET_URL` according to your test environment:
```env
# Option A: iOS Simulator (macOS):
EXPO_PUBLIC_API_URL=http://localhost:5001/api
EXPO_PUBLIC_SOCKET_URL=http://localhost:5001

# Option B: Android Studio Emulator:
# EXPO_PUBLIC_API_URL=http://10.0.2.2:5001/api
# EXPO_PUBLIC_SOCKET_URL=http://10.0.2.2:5001

# Option C: Physical Mobile Device via Expo Go (Replace with your development machine's LAN IP):
# EXPO_PUBLIC_API_URL=http://192.168.1.15:5001/api
# EXPO_PUBLIC_SOCKET_URL=http://192.168.1.15:5001
```

### Step 3: Run the Development Server
```bash
npx expo start
```
- Press `a` to launch in Android Emulator.
- Press `i` to launch in iOS Simulator.
- Scan the terminal QR code using the **Expo Go** mobile app on a physical device connected to the same Wi-Fi.

### Step 4: Verification & Type Checks
```bash
# Type check TypeScript code
npx tsc --noEmit

# Test Android Metro bundle export
npx expo export -p android --no-bytecode
```

---

## 3. WorkLogy Vendor Pro Mobile App (`mobile/vendor-app`)

### Step 1: Install Dependencies
```bash
cd mobile/vendor-app
npm install
```

### Step 2: Configure Environment Variables
Copy `.env.example` to create `.env`:
```bash
cp .env.example .env
```

Configure `EXPO_PUBLIC_API_URL` and `EXPO_PUBLIC_SOCKET_URL`:
```env
# Option A: iOS Simulator (macOS):
EXPO_PUBLIC_API_URL=http://localhost:5001/api
EXPO_PUBLIC_SOCKET_URL=http://localhost:5001

# Option B: Android Studio Emulator:
# EXPO_PUBLIC_API_URL=http://10.0.2.2:5001/api
# EXPO_PUBLIC_SOCKET_URL=http://10.0.2.2:5001

# Option C: Physical Mobile Device via Expo Go:
# EXPO_PUBLIC_API_URL=http://192.168.1.15:5001/api
# EXPO_PUBLIC_SOCKET_URL=http://192.168.1.15:5001
```

### Step 3: Run the Development Server
```bash
npx expo start
```
- Press `a` to open Android Emulator.
- Press `i` to open iOS Simulator.
- Scan the terminal QR code using **Expo Go** on a physical phone.

### Step 4: Verification & Type Checks
```bash
# Type check TypeScript code
npx tsc --noEmit

# Test Android Metro bundle export
npx expo export -p android --no-bytecode
```

---

## 4. Production Build Instructions (EAS Build)

To generate standalone production APK/AAB (Android) or IPA (iOS) packages using Expo Application Services:

```bash
# 1. Install EAS CLI globally
npm install -g eas-cli

# 2. Authenticate with your Expo account
eas login

# 3. Build Customer App
cd mobile/customer-app
eas build --platform android --profile production
eas build --platform ios --profile production

# 4. Build Vendor App
cd mobile/vendor-app
eas build --platform android --profile production
eas build --platform ios --profile production
```

---

## 5. Common Development Problems & Troubleshooting

### 1. "Network request failed" on Physical Phone
- **Cause**: Using `http://localhost:5001` on a physical device. `localhost` refers to the mobile device itself, not your development PC.
- **Solution**: Find your computer's local Wi-Fi IP (e.g. `192.168.1.25`) by running `ipconfig` (Windows) or `ifconfig` / `ip a` (macOS/Linux). Update `EXPO_PUBLIC_API_URL=http://192.168.1.25:5001/api` in `.env` and restart Expo with `npx expo start -c`.
- **Network Check**: Ensure both your phone and PC are connected to the exact same Wi-Fi router and that your computer's firewall permits incoming traffic on port 5001.

### 2. "CORS / Connection Refused"
- **Cause**: Central backend API is not running.
- **Solution**: Open a separate terminal, navigate to `backend/`, and run `npm run dev`. Ensure the log prints `Server running on port 5001` and `MongoDB Connected`.

### 3. Arrival OTP Verification Flow
- **Customer App**: Go to "My Jobs" or "Active Orders" $\rightarrow$ active bookings display a 6-digit security OTP (e.g. `482910`).
- **Vendor App**: Open the confirmed job $\rightarrow$ tap "Enter Arrival OTP" $\rightarrow$ submit code to transition the job to `in_progress`.

### 4. Clearing Metro Bundler Cache
If encountering stale bundle issues after asset or dependency changes, clear the Metro cache:
```bash
npx expo start -c
```
