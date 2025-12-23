# Fix Google OAuth 401: invalid_client Error

## Problem
You're seeing `Error 401: invalid_client` because the Google OAuth credentials in your `.env` file are set to placeholder values.

## Solution: Set Up Real Google OAuth Credentials

### Step 1: Go to Google Cloud Console
1. Visit: https://console.cloud.google.com/
2. Sign in with your Google account

### Step 2: Create or Select a Project
- Click the project dropdown at the top
- Click **"New Project"**
- Name it: `bought-api` (or your preferred name)
- Click **"Create"**

### Step 3: Enable Required APIs
1. Go to **"APIs & Services"** → **"Library"**
2. Search for **"Google Identity"** or **"People API"**
3. Click **"Enable"**

### Step 4: Configure OAuth Consent Screen
1. Go to **"APIs & Services"** → **"OAuth consent screen"**
2. Choose **"External"** (unless you have Google Workspace)
3. Fill in:
   - **App name:** `Bought API`
   - **User support email:** Your email
   - **Developer contact:** Your email
4. Click **"Save and Continue"** through all steps

### Step 5: Create OAuth Credentials
1. Go to **"APIs & Services"** → **"Credentials"**
2. Click **"+ CREATE CREDENTIALS"** → **"OAuth client ID"**
3. Application type: **"Web application"**
4. Name: `Bought API Web Client`

5. **Authorized JavaScript origins:**
   ```
   http://localhost:3000
   ```

6. **Authorized redirect URIs:**
   ```
   http://localhost:3000/auth/google/callback
   ```

7. Click **"Create"**

### Step 6: Copy Credentials
- **Client ID** (looks like: `123456789-abc.apps.googleusercontent.com`)
- **Client Secret** (looks like: `GOCSPX-abc123...`)
- ⚠️ **Copy the secret immediately** - you won't see it again!

### Step 7: Update Your .env File

Edit `/Users/tristan/Desktop/bought-api/.env` and replace the placeholder values:

```env
GOOGLE_CLIENT_ID=your_actual_client_id_here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_actual_client_secret_here
GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback
```

### Step 8: Restart the Server

```bash
cd /Users/tristan/Desktop/bought-api
# Stop the current server (Ctrl+C or kill the process)
npm start
```

## Verify It Works

1. Visit: `http://localhost:3000/pricing.html`
2. Click on a plan
3. You should be redirected to Google sign-in (not an error page)

## Common Issues

### Still getting 401 error?
- ✅ Make sure you copied the **entire** Client ID and Client Secret
- ✅ Check that the redirect URI in Google Console matches exactly: `http://localhost:3000/auth/google/callback`
- ✅ Make sure you added `http://localhost:3000` to Authorized JavaScript origins
- ✅ Restart your server after updating `.env`

### OAuth consent screen issues?
- If your app is in "Testing" mode, add your email as a test user
- Go to **"OAuth consent screen"** → **"Test users"** → **"Add Users"**

### Need help?
See `SETUP_GUIDE.md` for more detailed instructions.

