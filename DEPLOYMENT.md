# 🚀 QuickResize Deployment Guide (Firebase Hosting)

QuickResize is designed as an ultra-fast, offline-secure client-side Progressive Web Application (PWA). Follow these step-by-step instructions to preview, test, and deploy the application directly to the **Firebase Hosting Free Tier**.

---

## 📋 Prerequisites

Before proceeding, ensure you have the following installed locally on your development machine:
1. **Node.js** (v18.x or newer recommended)
2. **npm** (comes packaged with Node.js)
3. **Firebase CLI** installed globally:
   ```bash
   npm install -g firebase-tools
   ```

---

## 🛠️ Step 1: Initialize Firebase locally

1. Log into your Google account via the Firebase CLI tools command:
   ```bash
   firebase login
   ```
2. Link this project space with your active Firebase hosting profile. Inside the project root folder, run:
   ```bash
   firebase init hosting
   ```
3. During the CLI prompts, configure the workspace according to these parameters:
   - **Project Selection**: Choose *use an existing project* or *create a new project*.
   - **What do you want to use as your public directory?** Answer `dist` (this matches the Vite compilation outputs).
   - **Configure as a single-page app (rewrite all urls to /index.html)?** Answer `Yes` (this is automatically preset inside the provided `firebase.json` file).
   - **Set up automatic builds and deploys with GitHub?** Answer `No` (or `Yes` if linking a GitHub Actions runner pipeline).
   - **File dist/index.html already exists. Overwrite?** Answer `No` (otherwise Vite's compiler entry will be replaced with a default placeholder).

This generates a `.firebaserc` mapping file linking your online hosting console.

---

## 📦 Step 2: Compile Production Assets

Clean and bundle the React TypeScript PWA assets through the Vite builder compilation workflow:

```bash
# Install package dependencies
npm install

# Compile the final optimized static bundle
npm run build
```

The production output assets will be generated securely inside the `/dist` local directory.

---

## 🧪 Step 3: Run Local Simulation Emulator

To test PWA install features, Service Worker caching, and full offline mechanics without deploying to cloud networks, emulate the hosting setup locally:

```bash
firebase emulators:start --only hosting
```

Your browser will run the compiled app sandbox at `http://localhost:5000` (or another designated port).

---

## 🚀 Step 4: Live Production Deploy

Deploy all compiled static vectors, code indices, and manifest specs to the cloud with a single command:

```bash
firebase deploy --only hosting
```

The Firebase CLI will compile security validations and provide a permanent public hosting URL, e.g., `https://your-app-id.web.app`.

---

## 📲 PWA Features & Offline Testing

Once deployed to a secure context (`https://` or `localhost`):
- **Installing**: Supported browsers will prompt an "Install App" button in the address bar to download QuickResize directly onto desktops or mobile devices.
- **Offline Integrity**: Load the application, disconnect your device network, and reload the page. The Service Worker (`sw.js`) guarantees the complete landing page, upload deck, formats selectors, and local canvas optimized flows operate with 100% fidelity.
