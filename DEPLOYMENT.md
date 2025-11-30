# Deployment Guide for Render

## Quick Setup Checklist

### 1. Stripe Configuration
- ⚠️ Secret Key: Add your Stripe secret key (starts with `sk_live_` or `sk_test_`)
- ⚠️ Publishable Key: Add your Stripe publishable key (starts with `pk_live_` or `pk_test_`)
- ⚠️ Webhook Secret: Get from Stripe Dashboard after setting up webhook endpoint

### 2. Render Environment Variables

Copy these into Render Dashboard → Your Service → Environment:

```env
NODE_ENV=production
PORT=3000
DATABASE_URL=<auto-set from PostgreSQL database>
STRIPE_SECRET_KEY=<your_stripe_secret_key>
STRIPE_WEBHOOK_SECRET=<get from Stripe Dashboard>
GOOGLE_CLIENT_ID=<your Google OAuth Client ID>
GOOGLE_CLIENT_SECRET=<your Google OAuth Client Secret>
GOOGLE_CALLBACK_URL=https://your-app.onrender.com/auth/google/callback
SESSION_SECRET=<generate random string>
JWT_SECRET=<generate random string>
FRONTEND_URL=https://your-app.onrender.com
```

### 3. Generate Secrets

Run these commands to generate secure secrets:

```bash
# Generate SESSION_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Generate JWT_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 4. Stripe Webhook Setup

1. Deploy your app to Render first
2. Go to Stripe Dashboard → Developers → Webhooks
3. Click "Add endpoint"
4. Enter your Render URL: `https://your-app.onrender.com/api/stripe/webhook`
5. Select event: `checkout.session.completed`
6. Copy the "Signing secret" (starts with `whsec_`)
7. Add it to Render as `STRIPE_WEBHOOK_SECRET`

### 5. Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to APIs & Services → Credentials
3. Edit your OAuth 2.0 Client ID
4. Add to "Authorized redirect URIs":
   - `https://your-app.onrender.com/auth/google/callback`
5. Update `GOOGLE_CALLBACK_URL` in Render to match your app URL

### 6. Database Setup

The database schema will be automatically created on first run. The `users` table will be created with:
- id (SERIAL PRIMARY KEY)
- email (VARCHAR UNIQUE)
- name (VARCHAR)
- google_id (VARCHAR UNIQUE)
- price_plan (VARCHAR)
- stripe_customer_id (VARCHAR)
- created_at (TIMESTAMP)

### 7. Testing After Deployment

1. Visit `https://your-app.onrender.com/pricing.html`
2. Click on a plan
3. Sign in with Google
4. Complete Stripe checkout (use test card: 4242 4242 4242 4242)
5. Verify webhook updates user plan in database
6. Check dashboard shows correct greeting

### Troubleshooting

- **Webhook not working**: Check that `STRIPE_WEBHOOK_SECRET` matches the one in Stripe Dashboard
- **Database connection error**: Verify `DATABASE_URL` is set correctly in Render
- **Google OAuth error**: Ensure callback URL matches exactly in Google Cloud Console
- **CORS errors**: Check that `FRONTEND_URL` matches your Render app URL

