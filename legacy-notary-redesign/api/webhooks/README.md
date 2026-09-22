# Webhook setup

These webhook routes are intended for Vercel serverless deployment and now support confirmation tracking for real Stripe and Square checkout flows.

## Routes

- `/api/webhooks/stripe`
- `/api/webhooks/square`
- `/api/payments/config`
- `/api/payments/stripe/create-intent`
- `/api/payments/square/create-payment`
- `/api/payments/status`

## Environment variables

Add environment variables in **Vercel Project Settings**. Do **not** commit real values to this repository.

- `STRIPE_SECRET_KEY`
- `STRIPE_PUBLISHABLE_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `SQUARE_APPLICATION_ID`
- `SQUARE_LOCATION_ID`
- `SQUARE_ACCESS_TOKEN`
- `SQUARE_ENVIRONMENT` (`sandbox` or `production`)
- `SQUARE_WEBHOOK_SIGNATURE_KEY`
- `SQUARE_WEBHOOK_NOTIFICATION_URL`

`STRIPE_WEBHOOK_SECRET` and `SQUARE_WEBHOOK_SIGNATURE_KEY` are webhook signing secrets. They are different from your Stripe API secret key or any Square API access token.

## Endpoint URLs

Register the deployed Vercel webhook URL with each provider:

- `https://<your-vercel-domain>/api/webhooks/stripe`
- `https://<your-vercel-domain>/api/webhooks/square`

If your Squarespace custom domain points to the same Vercel deployment, you may use that custom domain instead. Square signature verification depends on the exact URL registered in Square, so `SQUARE_WEBHOOK_NOTIFICATION_URL` must exactly match the deployed endpoint URL configured in the Square dashboard.

## Deploy notes

- Redeploy after adding or changing any environment variable in Vercel.
- Browser checkout now creates provider-backed payments server-side and waits for payment confirmation state.
- Webhooks are used to track final payment outcomes (`succeeded` / `failed`) for status polling.
- Ensure your Squarespace and Vercel domain configuration points checkout traffic and webhook callbacks to the same deployment.
