# Bought API - Subscription Service

A subscription service with Stripe payment integration and Google OAuth authentication, deployed on Render with PostgreSQL.

## Features

- Three pricing plans ($1, $2, $3)
- Stripe payment processing with webhooks
- Google OAuth authentication
- User account management with PostgreSQL
- Plan-based dashboard greetings

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
PORT=3000
DATABASE_URL=postgresql://user:password@localhost:5432/bought-api
STRIPE_SECRET_KEY=sk_live_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback
SESSION_SECRET=your_session_secret_key
JWT_SECRET=your_jwt_secret_key
FRONTEND_URL=http://localhost:3000
NODE_ENV=development
```

### 3. Stripe Setup

1. Get your Stripe credentials from the Stripe Dashboard:
   - Publishable Key: Found in Stripe Dashboard → Developers → API keys
   - Secret Key: Found in Stripe Dashboard → Developers → API keys
2. Set up a webhook endpoint in Stripe Dashboard:
   - For local testing: Use ngrok to expose your server, then add webhook URL
   - For production: Add webhook URL: `https://your-app.onrender.com/api/stripe/webhook`
   - Events: `checkout.session.completed`
   - Copy the webhook secret to `.env` as `STRIPE_WEBHOOK_SECRET`

### 4. Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URIs:
   - Local: `http://localhost:3000/auth/google/callback`
   - Production: `https://your-app.onrender.com/auth/google/callback`
6. Copy Client ID and Client Secret to `.env`

### 5. PostgreSQL Setup (Local Development)

For local development, you can:
- Install PostgreSQL locally and create a database
- Use a cloud PostgreSQL service (like Render Postgres, Supabase, or Neon)
- Update `DATABASE_URL` in your `.env` file

### 6. Run the Application

```bash
npm start
```

For development with auto-reload:

```bash
npm run dev
```

The application will be available at `http://localhost:3000`

## Deployment on Render

### Prerequisites
- A Render account (sign up at https://render.com)
- Your Stripe credentials
- Google OAuth credentials

### Steps

1. **Create a PostgreSQL Database on Render:**
   - Go to Render Dashboard → New → PostgreSQL
   - Name it `bought-api-db`
   - Note the connection string (will be auto-set as `DATABASE_URL`)

2. **Create a Web Service:**
   - Go to Render Dashboard → New → Web Service
   - Connect your GitHub repository
   - Use these settings:
     - **Name:** `bought-api`
     - **Environment:** `Node`
     - **Build Command:** `npm install`
     - **Start Command:** `npm start`
     - **Plan:** Free or Starter

3. **Set Environment Variables in Render:**
   - `NODE_ENV` = `production`
   - `PORT` = `3000` (or leave default)
   - `DATABASE_URL` = (auto-set from PostgreSQL database)
   - `STRIPE_SECRET_KEY` = `<your_stripe_secret_key>`
   - `STRIPE_WEBHOOK_SECRET` = (from Stripe Dashboard)
   - `GOOGLE_CLIENT_ID` = (your Google OAuth Client ID)
   - `GOOGLE_CLIENT_SECRET` = (your Google OAuth Client Secret)
   - `GOOGLE_CALLBACK_URL` = `https://your-app.onrender.com/auth/google/callback`
   - `SESSION_SECRET` = (generate a random string)
   - `JWT_SECRET` = (generate a random string)
   - `FRONTEND_URL` = `https://your-app.onrender.com`

4. **Update Stripe Webhook:**
   - Go to Stripe Dashboard → Webhooks
   - Add endpoint: `https://your-app.onrender.com/api/stripe/webhook`
   - Select event: `checkout.session.completed`
   - Copy the webhook signing secret to Render environment variables

5. **Update Google OAuth:**
   - Add production callback URL in Google Cloud Console
   - Update `GOOGLE_CALLBACK_URL` in Render environment variables

6. **Deploy:**
   - Render will automatically deploy when you push to your repository
   - Or manually trigger a deploy from the Render dashboard

## Project Structure

```
bought-api/
├── config/
│   ├── database.js       # PostgreSQL connection
│   └── passport.js       # Google OAuth configuration
├── middleware/
│   └── auth.js           # JWT authentication middleware
├── models/
│   └── User.js           # User database model (PostgreSQL)
├── routes/
│   ├── auth.js           # Authentication routes
│   └── stripe.js         # Stripe payment routes
├── public/
│   ├── pricing.html      # Pricing page
│   ├── dashboard.html    # User dashboard
│   └── success.html      # Payment success page
├── server.js             # Main server file
├── render.yaml           # Render deployment configuration
└── package.json
```

## API Endpoints

### Authentication
- `GET /auth/google` - Initiate Google OAuth
- `GET /auth/google/callback` - Google OAuth callback
- `POST /auth/check-user` - Check if user exists
- `GET /auth/me` - Get current user (requires token)

### Stripe
- `POST /api/stripe/create-checkout-session` - Create Stripe checkout session (requires auth)
- `POST /api/stripe/webhook` - Stripe webhook handler

## Usage Flow

1. User visits `/pricing.html` and selects a plan
2. If not logged in, user is prompted to sign in with Google
3. After authentication, user is redirected to Stripe checkout
4. After payment, Stripe webhook updates user's plan in database
5. User can access `/dashboard.html` to see their plan-specific greeting

## Testing Stripe Webhooks Locally

Use ngrok to expose your local server:

```bash
ngrok http 3000
```

Then use the ngrok URL for your Stripe webhook endpoint.

