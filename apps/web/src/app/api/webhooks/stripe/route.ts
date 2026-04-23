import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import {
  getExecutivesPerSeat,
  inferPlanIntervalFromStripePrice,
  normalizePlanId,
} from '@/config/billing';

function getStripeClient() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY is not set');
  return new Stripe(key);
}

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function mergeBillingSettings(
  settings: unknown,
  update: Record<string, unknown>,
): Record<string, unknown> {
  const current = (settings && typeof settings === 'object' ? settings : {}) as Record<string, unknown>;
  const billing = (current.billing && typeof current.billing === 'object')
    ? (current.billing as Record<string, unknown>)
    : {};
  return {
    ...current,
    billing: {
      ...billing,
      ...update,
    },
  };
}

export async function POST(request: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json(
      { error: 'Stripe webhook secret not configured' },
      { status: 500 }
    );
  }

  const stripe = getStripeClient();
  const body = await request.text();
  const headersList = await headers();
  const signature = headersList.get('stripe-signature');

  if (!signature) {
    return NextResponse.json(
      { error: 'Missing stripe-signature header' },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error(`Webhook signature verification failed: ${errorMessage}`);
    return NextResponse.json(
      { error: `Webhook Error: ${errorMessage}` },
      { status: 400 }
    );
  }

  const supabase = getSupabaseAdmin();

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      console.log('Checkout session completed:', session.id);

      if (session.metadata?.org_id && session.subscription) {
        const subscriptionId = typeof session.subscription === 'string'
          ? session.subscription
          : session.subscription.id;

        const { data: currentOrg } = await supabase
          .from('organizations')
          .select('settings')
          .eq('id', session.metadata.org_id)
          .single();
        const settings = mergeBillingSettings(currentOrg?.settings, {
          cancellation_feedback: null,
        });

        await supabase
          .from('organizations')
          .update({
            stripe_customer_id: session.customer as string,
            stripe_subscription_id: subscriptionId,
            subscription_status: 'active',
            settings,
            updated_at: new Date().toISOString(),
          })
          .eq('id', session.metadata.org_id);
      }
      break;
    }

    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription;
      console.log(`Subscription ${event.type}:`, subscription.id);

      const customerId = typeof subscription.customer === 'string'
        ? subscription.customer
        : subscription.customer.id;

      const item = subscription.items.data[0];
      const priceId = item?.price?.id;

      // Determine tier/interval from known configured Stripe Price IDs.
      let tier = normalizePlanId(subscription.metadata?.plan_id) || 'starter';
      let interval: 'monthly' | 'annual' = subscription.metadata?.interval === 'annual' ? 'annual' : 'monthly';
      if (priceId) {
        const inferred = inferPlanIntervalFromStripePrice(priceId);
        if (inferred.planId) tier = inferred.planId;
        if (inferred.interval) interval = inferred.interval;
        try {
          const price = await stripe.prices.retrieve(priceId, { expand: ['product'] });
          const product = price.product as Stripe.Product;
          tier = normalizePlanId(product.metadata?.tier || product.name) || tier;
        } catch {
          // Use default tier
        }
      }

      const subData = subscription as unknown as Record<string, unknown>;
      const currentPeriodEnd = typeof subData.current_period_end === 'number'
        ? new Date(subData.current_period_end * 1000).toISOString()
        : null;
      const { data: currentOrg } = await supabase
        .from('organizations')
        .select('settings')
        .eq('stripe_customer_id', customerId)
        .single();
      const settings = mergeBillingSettings(currentOrg?.settings, {
        plan_id: tier,
        interval,
        executives_per_seat: getExecutivesPerSeat(tier),
        cancel_at_period_end: subscription.cancel_at_period_end,
        current_period_end: currentPeriodEnd,
      });

      await supabase
        .from('organizations')
        .update({
          stripe_subscription_id: subscription.id,
          subscription_status: subscription.status,
          subscription_tier: tier,
          settings,
          updated_at: new Date().toISOString(),
        })
        .eq('stripe_customer_id', customerId);
      break;
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;
      console.log('Subscription deleted:', subscription.id);

      const customerId = typeof subscription.customer === 'string'
        ? subscription.customer
        : subscription.customer.id;

      const { data: currentOrg } = await supabase
        .from('organizations')
        .select('settings')
        .eq('stripe_customer_id', customerId)
        .single();
      const settings = mergeBillingSettings(currentOrg?.settings, {
        cancel_at_period_end: false,
      });

      await supabase
        .from('organizations')
        .update({
          subscription_status: 'canceled',
          subscription_tier: null,
          settings,
          updated_at: new Date().toISOString(),
        })
        .eq('stripe_customer_id', customerId);
      break;
    }

    case 'invoice.payment_succeeded': {
      const invoice = event.data.object as Stripe.Invoice;
      console.log('Invoice payment succeeded:', invoice.id);
      break;
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice;
      console.log('Invoice payment failed:', invoice.id);

      if (invoice.customer) {
        const customerId = typeof invoice.customer === 'string'
          ? invoice.customer
          : invoice.customer.id;

        await supabase
          .from('organizations')
          .update({
            subscription_status: 'past_due',
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_customer_id', customerId);
      }
      break;
    }

    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  return NextResponse.json({ received: true });
}
