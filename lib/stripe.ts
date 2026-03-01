import Stripe from 'stripe';

function createStripeClient() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error(
      'STRIPE_SECRET_KEY is not set. Please add it to your .env.local file.'
    );
  }
  return new Stripe(key, { typescript: true });
}

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    _stripe = createStripeClient();
  }
  return _stripe;
}
