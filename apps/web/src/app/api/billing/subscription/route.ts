/**
 * Billing Subscription API
 * GET /api/billing/subscription - Get current subscription details
 */

import { type NextRequest } from 'next/server';
import Stripe from 'stripe';
import { withAuth, type AuthContext } from '@/lib/api/middleware';
import { successResponse, internalErrorResponse } from '@/lib/api/utils';
import { createClient } from '@/lib/supabase/server';

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY is not set');
  return new Stripe(key);
}

async function handleGet(request: NextRequest, context: AuthContext) {
  try {
    const supabase = await createClient();

    // Get organization's Stripe customer ID
    const { data: org } = await supabase
      .from('organizations')
      .select('stripe_customer_id, stripe_subscription_id, subscription_tier, subscription_status')
      .eq('id', context.user.org_id)
      .single();

    if (!org?.stripe_customer_id || !org?.stripe_subscription_id) {
      return successResponse({
        plan: 'free',
        status: 'active',
        current_period_end: null,
        cancel_at_period_end: false,
        payment_method: null,
      });
    }

    const stripe = getStripe();

    // Fetch subscription from Stripe
    const subscription = await stripe.subscriptions.retrieve(org.stripe_subscription_id, {
      expand: ['default_payment_method', 'items.data.price.product'],
    }) as Stripe.Subscription;

    // Get payment method details
    let paymentMethod = null;
    if (subscription.default_payment_method && typeof subscription.default_payment_method !== 'string') {
      const pm = subscription.default_payment_method as Stripe.PaymentMethod;
      if (pm.card) {
        paymentMethod = {
          brand: pm.card.brand,
          last4: pm.card.last4,
          exp_month: pm.card.exp_month,
          exp_year: pm.card.exp_year,
        };
      }
    }

    // Get plan details from the subscription item
    const item = subscription.items.data[0];
    const price = item?.price;
    const product = price?.product as Stripe.Product | undefined;

    // Stripe v20 removed current_period_end from the Subscription type,
    // but it's still returned in the API response at runtime
    const subData = subscription as unknown as Record<string, unknown>;
    const periodEnd = typeof subData.current_period_end === 'number'
      ? new Date(subData.current_period_end * 1000).toISOString()
      : null;

    return successResponse({
      plan: product?.name || org.subscription_tier || 'pro',
      status: subscription.status,
      current_period_end: periodEnd,
      cancel_at_period_end: subscription.cancel_at_period_end,
      payment_method: paymentMethod,
      price_amount: price?.unit_amount ? price.unit_amount / 100 : null,
      price_interval: price?.recurring?.interval || null,
    });
  } catch (error) {
    console.error('Error fetching subscription:', error);
    // Return default free plan on error
    return successResponse({
      plan: 'free',
      status: 'active',
      current_period_end: null,
      cancel_at_period_end: false,
      payment_method: null,
    });
  }
}

export async function GET(request: NextRequest) {
  return withAuth((req, ctx) => handleGet(req, ctx))(request);
}
