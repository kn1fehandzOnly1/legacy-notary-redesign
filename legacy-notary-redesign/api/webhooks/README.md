# Webhook setup

These webhook routes are intended for Vercel serverless deployment and should keep all existing static pages and browser checkout behavior unchanged.

## Routes

- `/api/webhooks/stripe`
- `/api/webhooks/square`

## Environment variables

Add environment variables in **Vercel Project Settings**. Do **not** commit real values to this repository.

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
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
- The current checkout page still simulates payment in the browser and does **not** yet create real Stripe or Square payments.
- These routes only provide a verified webhook foundation for future server-side payment integration.
