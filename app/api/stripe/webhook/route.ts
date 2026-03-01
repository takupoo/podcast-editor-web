import { NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import type Stripe from 'stripe';

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = getStripe().webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Webhook signature verification failed:', message);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.userId;
      console.log('Checkout completed:', { userId, customerId: session.customer });
      // TODO: Save subscription status to database
      // e.g., await db.user.update({ where: { clerkId: userId }, data: { stripeCustomerId: session.customer, subscriptionStatus: 'active' } })
      break;
    }

    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription;
      console.log('Subscription updated:', {
        customerId: subscription.customer,
        status: subscription.status,
      });
      // TODO: Update subscription status in database
      // e.g., await db.user.update({ where: { stripeCustomerId: subscription.customer }, data: { subscriptionStatus: subscription.status } })
      break;
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;
      console.log('Subscription deleted:', {
        customerId: subscription.customer,
      });
      // TODO: Mark subscription as canceled in database
      // e.g., await db.user.update({ where: { stripeCustomerId: subscription.customer }, data: { subscriptionStatus: 'canceled' } })
      break;
    }

    default:
      console.log('Unhandled event type:', event.type);
  }

  return NextResponse.json({ received: true });
}
