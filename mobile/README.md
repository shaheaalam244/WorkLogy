# WorkLogy Mobile Applications — Setup & Execution Guide (`mobile/README.md`)

This directory contains two standalone native mobile applications for the **WorkLogy Hyperlocal Marketplace**:

1. **WorkLogy Customer App** (`worklogy/mobile/customer-app`)
2. **WorkLogy Vendor Pro App** (`worklogy/mobile/vendor-app`)

Both apps are built with **React Native**, **Expo SDK 51**, and **TypeScript**, connecting directly to the existing WorkLogy Express backend and MongoDB database.

---

## 1. Prerequisites

- **Node.js**: `v18.0.0` or higher (tested on Node 20 / 25).
- **Backend API**: The WorkLogy backend must be running on `http://localhost:5001`.
- **Expo CLI**: Installed via `npm install -g expo-cli` (or run with `npx expo`).
- **Development Target**:
  - **Android**: Android Studio emulator or physical device with **Expo Go**.
  - **iOS**: Xcode simulator (macOS only) or physical iPhone with **Expo Go**.

---

## 2. WorkLogy Customer App Setup (`customer-app`)

### Step 1: Navigate & Install Dependencies
```bash
cd worklogy/mobile/customer-app
npm install
```

### Step 2: Configure Environment
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Default configuration:
```env
# For iOS Simulator:
EXPO_PUBLIC_API_URL=http://localhost:5001/api

# For Android Emulator:
# EXPO_PUBLIC_API_URL=http://10.0.2.2:5001/api

# For Physical Device (replace with your development machine's LAN IP):
# EXPO_PUBLIC_API_URL=http://192.168.1.15:5001/api
```

### Step 3: Run the Application
```bash
npx expo start
```
- Press `a` to open Android Emulator.
- Press `i` to open iOS Simulator.
- Scan the terminal QR code with **Expo Go** on a physical phone.

---

## 3. WorkLogy Vendor Pro App Setup (`vendor-app`)

### Step 1: Navigate & Install Dependencies
```bash
cd worklogy/mobile/vendor-app
npm install
```

### Step 2: Configure Environment
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Default configuration:
```env
# For iOS Simulator:
EXPO_PUBLIC_API_URL=http://localhost:5001/api

# For Android Emulator:
# EXPO_PUBLIC_API_URL=http://10.0.2.2:5001/api

# For Physical Device:
# EXPO_PUBLIC_API_URL=http://192.168.1.15:5001/api
```

### Step 3: Run the Application
```bash
npx expo start
```
- Press `a` to open Android Emulator.
- Press `i` to open iOS Simulator.
- Scan the terminal QR code with **Expo Go** on a physical phone.

---

## 4. Production Build Instructions (EAS Build)

To generate production APK/AAB for Android or IPA for iOS:

```bash
# 1. Install EAS CLI globally
npm install -g eas-cli

# 2. Login to your Expo account
eas login

# 3. Build Customer App
cd worklogy/mobile/customer-app
eas build --platform android --profile production
eas build --platform ios --profile production

# 4. Build Vendor App
cd worklogy/mobile/vendor-app
eas build --platform android --profile production
eas build --platform ios --profile production
```

---

## 5. API Connectivity & Troubleshooting

1. **Network request failed on physical phone**:
   - Ensure your phone and development machine are connected to the same Wi-Fi network.
   - Do not use `localhost` on a physical device. Replace `localhost` in `.env` with your computer's LAN IP address (e.g. `http://192.168.1.25:5001/api`).
2. **CORS / Connection Refused**:
   - Verify that the WorkLogy backend is running on port 5001 (`cd worklogy/backend && npm run dev`).
3. **Arrival OTP Verification**:
   - In the Customer App under "My Jobs", active bookings display a 6-digit security OTP. The vendor enters this code into the Vendor App Arrival dialog to transition the job to `in_progress`.
