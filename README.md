# CleanConnect

CleanConnect is a two-sided cleaning marketplace where customers post cleaning jobs and cleaners compete for the work.

## Core workflow

1. Customers and cleaners register with role-specific accounts.
2. Cleaners publish service profiles, pricing, location, and availability.
3. Customers browse cleaner profiles or post cleaning jobs.
4. Cleaners browse open jobs and submit one offer per job.
5. Customers compare offers and hire a cleaner.
6. The cleaner manages the job from assigned to in progress to completed.
7. Matched users can message within the job.
8. Customers can review cleaners after completed jobs.

## Local setup

### Server

Copy `server/.env.example` to `server/.env`, provide the values, then run:

```powershell
cd server
npm install
npm run dev
```

### Client

Optionally copy `client/.env.example` to `client/.env`, then run:

```powershell
cd client
npm install
npm run dev
```

The default client URL is `http://localhost:5173` and the default API URL is `http://localhost:5000`.

## Environment variables

Server:

- `MONGO_URI`: MongoDB connection string.
- `JWT_SECRET`: long random signing secret.
- `PORT`: API port; defaults to `5000`.
- `CLIENT_ORIGINS`: comma-separated allowed browser origins.
- `CLIENT_URL`: browser URL used for Stripe redirects; defaults to `http://localhost:5173`.
- `STRIPE_SECRET_KEY`: Stripe test-mode secret key (`sk_test_...`).
- `STRIPE_WEBHOOK_SECRET`: signing secret from the Stripe CLI or Dashboard (`whsec_...`).
- `STRIPE_PLATFORM_FEE_PERCENT`: marketplace commission percentage; defaults to `12`.

Client:

- `VITE_API_URL`: deployed API base URL.

## Verification

```powershell
cd client
npm run build
npm run lint
```

Server files can be syntax checked with `node --check <file>`.

With the backend running, execute the disposable full marketplace regression suite:

```powershell
cd server
npm run test:e2e -- --admin-password "YOUR_LOCAL_ADMIN_PASSWORD"
```

The suite creates isolated customer, cleaner, job, offer, message, review, and report records; verifies the admin workflow; and removes those test records afterward.

## Stripe payments and cleaner payouts

CleanConnect includes Stripe-hosted Checkout, Stripe Connect onboarding, webhook-confirmed payment state, platform fees, and refund status synchronization. It never marks a booking paid from a browser redirect.

For local test mode, add Stripe test credentials to `server/.env`, then forward signed events:

```powershell
stripe listen --forward-to localhost:5000/api/payments/webhook
```

Copy the resulting `whsec_...` value into `STRIPE_WEBHOOK_SECRET`. Cleaners can then finish payout onboarding from their dashboard, and customers can pay the accepted offer through Stripe Checkout. Never commit secret or webhook keys.

## External production integrations still required

Live Stripe payments, identity/background verification, email/SMS delivery, image storage, maps, and production hosting require vendor accounts and credentials. They should not be simulated with real money or sensitive identity data during local development.

## Administrator access

Public registration intentionally cannot create administrators. Register a normal trusted account first, then promote it from the server directory:

```powershell
cd server
npm run admin:promote -- --email you@example.com --confirm
```

Log out of any existing session and sign in again. Admin accounts are redirected to `/admin/dashboard`. Promotions and account enable/disable actions are recorded in the admin audit log.

To create a separate local-development administrator without replacing a customer or cleaner account:

```powershell
cd server
npm run admin:create -- --email admin@cleanconnect.local --confirm
```

The generated password is printed once. Store it securely.

### Administrator-assisted password reset

In the admin dashboard, open **Users** and select **Reset Password**. CleanConnect generates a temporary password, invalidates the user’s existing sessions, and records the action in the audit log. Deliver the temporary password securely. At the next login, the user is restricted to `/change-password` until they choose a new strong password.
