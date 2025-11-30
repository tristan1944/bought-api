# Setup Guide: Stripe Webhook & Google OAuth

## 1. Stripe Webhook Endpoint

### Endpoint URL
Your Stripe webhook endpoint is:
```
https://your-app.onrender.com/api/stripe/webhook
```

**For local development (using ngrok):**
```
https://your-ngrok-url.ngrok.io/api/stripe/webhook
```

### How to Configure in Stripe Dashboard

1. **Go to Stripe Dashboard:**
   - Visit https://dashboard.stripe.com/
   - Log in to your account

2. **Navigate to Webhooks:**
   - Click on **"Developers"** in the left sidebar
   - Click on **"Webhooks"**

3. **Add Endpoint:**
   - Click **"Add endpoint"** button
   - Enter your webhook URL:
     - **Production:** `https://your-app.onrender.com/api/stripe/webhook`
     - **Local Testing:** Use ngrok URL if testing locally
   
4. **Select Events:**
   - Under "Events to send", select:
     - ✅ `checkout.session.completed`
   - Click **"Add endpoint"**

5. **Copy Webhook Secret:**
   - After creating the endpoint, click on it
   - Find the **"Signing secret"** (starts with `whsec_`)
   - Copy this secret
   - Add it to your Render environment variables as `STRIPE_WEBHOOK_SECRET`

### Testing Locally with ngrok

If you want to test webhooks locally:

```bash
# Install ngrok (if not installed)
brew install ngrok  # macOS
# or download from https://ngrok.com/

# Start your local server
npm start

# In another terminal, expose your local server
ngrok http 3000

# Use the ngrok HTTPS URL for your Stripe webhook
# Example: https://abc123.ngrok.io/api/stripe/webhook
```

---

## 2. Google OAuth Configuration

### Step-by-Step Setup in Google Cloud Console

1. **Go to Google Cloud Console:**
   - Visit https://console.cloud.google.com/
   - Sign in with your Google account

2. **Create or Select a Project:**
   - Click the project dropdown at the top
   - Click **"New Project"**
   - Enter project name: `bought-api` (or your preferred name)
   - Click **"Create"**
   - Select the project from the dropdown

3. **Enable Google+ API:**
   - In the left sidebar, go to **"APIs & Services"** → **"Library"**
   - Search for **"Google+ API"** or **"Google Identity"**
   - Click on **"Google+ API"** or **"Google Identity"**
   - Click **"Enable"**

   **Alternative:** Enable these APIs:
   - **Google+ API** (if available)
   - **People API** (recommended)
   - **Google Identity** (newer, recommended)

4. **Create OAuth 2.0 Credentials:**
   - Go to **"APIs & Services"** → **"Credentials"**
   - Click **"+ CREATE CREDENTIALS"** at the top
   - Select **"OAuth client ID"**

5. **Configure OAuth Consent Screen (if first time):**
   - If prompted, click **"Configure Consent Screen"**
   - Choose **"External"** (unless you have a Google Workspace)
   - Click **"Create"**
   - Fill in required fields:
     - **App name:** `Bought API` (or your app name)
     - **User support email:** Your email
     - **Developer contact information:** Your email
   - Click **"Save and Continue"**
   - On "Scopes" page, click **"Save and Continue"**
   - On "Test users" page (if needed), click **"Save and Continue"**
   - Review and click **"Back to Dashboard"**

6. **Create OAuth Client ID:**
   - Application type: **"Web application"**
   - Name: `Bought API Web Client` (or your preferred name)
   
   **Authorized JavaScript origins:**
   ```
   http://localhost:3000
   https://your-app.onrender.com
   ```
   
   **Authorized redirect URIs:**
   ```
   http://localhost:3000/auth/google/callback
   https://your-app.onrender.com/auth/google/callback
   ```
   
   - Click **"Create"**

7. **Copy Credentials:**
   - A popup will show your **Client ID** and **Client Secret**
   - **Copy both immediately** (you won't see the secret again!)
   - If you missed it, you can reset it later

8. **Add to Environment Variables:**

   **For Local Development (.env file):**
   ```env
   GOOGLE_CLIENT_ID=your_client_id_here.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=your_client_secret_here
   GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback
   ```

   **For Render (Environment Variables):**
   ```
   GOOGLE_CLIENT_ID=your_client_id_here.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=your_client_secret_here
   GOOGLE_CALLBACK_URL=https://your-app.onrender.com/auth/google/callback
   ```

### Important Notes:

- **Callback URL must match exactly** - including `http://` vs `https://` and trailing slashes
- For **production**, make sure to use `https://` URLs
- The **Client Secret** is sensitive - never commit it to git
- If you lose the Client Secret, you can create a new one in Google Cloud Console

### Testing Google OAuth:

1. Start your server: `npm start`
2. Visit: `http://localhost:3000/pricing.html`
3. Click on any plan
4. You should be redirected to Google sign-in
5. After signing in, you'll be redirected back to your app

---

## Quick Reference

### Stripe Webhook
- **Endpoint:** `/api/stripe/webhook`
- **Full URL (Production):** `https://your-app.onrender.com/api/stripe/webhook`
- **Event:** `checkout.session.completed`
- **Secret Variable:** `STRIPE_WEBHOOK_SECRET`

### Google OAuth
- **Callback Path:** `/auth/google/callback`
- **Full URL (Production):** `https://your-app.onrender.com/auth/google/callback`
- **Full URL (Local):** `http://localhost:3000/auth/google/callback`
- **Required Variables:** `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL`

