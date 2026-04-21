/**
 * Billing Create Portal API
 * POST /api/billing/create-portal - Create a Stripe Customer Portal session
 * Used for managing payment methods, cancelling subscriptions, and viewing invoices
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
    const stripe = getStripe();
    const supabase = await createClient();

    // Get organization's Stripe customer ID
    const { data: org } = await supabase
      .from('organizations')
      .select('stripe_customer_id')
      .eq('id', context.user.org_id)
      .single();

    if (!org?.stripe_customer_id) {
      return badRequestResponse('No billing account found. Please subscribe to a plan first.');
    }

    // Create customer portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: org.stripe_customer_id,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings?tab=billing`,
    });

    return successResponse({ url: session.url });
  } catch (error) {
    console.error('Error creating portal session:', error);
    return internalErrorResponse(error instanceof Error ? error.message : 'Failed to create portal session');
  }
}

export async function POST(request: NextRequest) {
  return withAuth((req, ctx) => handlePost(req, ctx))(request);
}
