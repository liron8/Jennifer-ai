/**
 * Billing Create Checkout API
 * POST /api/billing/create-checkout - Create a Stripe checkout session
 */

import { type NextRequest } from 'next/server';
import Stripe from 'stripe';
import { withAuth, type AuthContext } from '@/lib/api/middleware';
import { successResponse, internalErrorResponse, badRequestResponse } from '@/lib/api/utils';
import { createClient } from '@/lib/supabase/server';

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY is not set');
  return new Stripe(key);
}

async function handlePost(request: NextRequest, context: AuthContext) {
  try {
    const body = await request.json();
    const { price_id } = body;

    if (!price_id) {
      return badRequestResponse('price_id is required');
    }

    const stripe = getStripe();
    const supabase = await createClient();

    // Get or create Stripe customer
    const { data: org } = await supabase
      .from('organizations')
      .select('id, stripe_customer_id, name')
      .eq('id', context.user.org_id)
      .single();

    let customerId = org?.stripe_customer_id;

    if (!customerId) {
      // Create a new Stripe customer
      const customer = await stripe.customers.create({
        email: context.user.email,
        name: org?.name || undefined,
        metadata: {
          org_id: context.user.org_id,
          user_id: context.user.id,
        },
      });
      customerId = customer.id;

      // Save the customer ID
      await supabase
        .from('organizations')
        .update({ stripe_customer_id: customerId })
        .eq('id', context.user.org_id);
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: price_id,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings?tab=billing&checkout=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings?tab=billing&checkout=cancelled`,
      metadata: {
        org_id: context.user.org_id,
      },
    });

    return successResponse({ url: session.url });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return internalErrorResponse(error instanceof Error ? error.message : 'Failed to create checkout session');
  }
}

export async function POST(request: NextRequest) {
  return withAuth((req, ctx) => handlePost(req, ctx))(request);
}
