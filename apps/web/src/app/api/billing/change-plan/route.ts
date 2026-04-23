import type { NextRequest } from "next/server";
import Stripe from "stripe";
import { z } from "zod";
import { withAuth, type AuthContext } from "@/lib/api/middleware";
import { badRequestResponse, internalErrorResponse, successResponse } from "@/lib/api/utils";
import { createClient } from "@/lib/supabase/server";
import {
  getExecutivesPerSeat,
  normalizePlanId,
  resolveStripePriceId,
  type BillingInterval,
  type BillingPlanId,
} from "@/config/billing";

const requestSchema = z.object({
  plan_id: z.enum(["starter", "strategist", "enterprise"]),
  interval: z.enum(["monthly", "annual"]).default("annual"),
  acknowledge_starter_limit: z.boolean().optional(),
  acknowledge_deleted_excess_executives: z.boolean().optional(),
});

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
  return new Stripe(key);
}

function mergeBillingSettings(
  settings: unknown,
  update: Record<string, unknown>,
): Record<string, unknown> {
  const current = (settings && typeof settings === "object" ? settings : {}) as Record<string, unknown>;
  const billing = (current.billing && typeof current.billing === "object"
    ? current.billing
    : {}) as Record<string, unknown>;
  return {
    ...current,
    billing: {
      ...billing,
      ...update,
    },
  };
}

async function handlePost(request: NextRequest, context: AuthContext) {
  try {
    const body = await request.json();
    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) return badRequestResponse("Invalid change plan payload");

    const { plan_id, interval, acknowledge_deleted_excess_executives, acknowledge_starter_limit } = parsed.data;
    if (plan_id === "enterprise") {
      return badRequestResponse("Enterprise requires contacting sales");
    }

    const priceId = resolveStripePriceId(plan_id, interval);
    if (!priceId) {
      return badRequestResponse(
        `Missing Stripe price ID for ${plan_id}/${interval}. Configure STRIPE_PRICE_* env vars.`,
      );
    }

    const supabase = await createClient();
    const stripe = getStripe();
    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .select("id, name, settings, stripe_customer_id, stripe_subscription_id, subscription_tier")
      .eq("id", context.user.org_id)
      .single();

    if (orgError || !org) return internalErrorResponse("Organization not found");

    const currentPlan = normalizePlanId(org.subscription_tier);
    const isDowngradeToStarter = currentPlan && currentPlan !== "starter" && plan_id === "starter";
    if (
      isDowngradeToStarter &&
      (!acknowledge_starter_limit || !acknowledge_deleted_excess_executives)
    ) {
      return badRequestResponse("Downgrade confirmations are required");
    }

    if (!org.stripe_customer_id || !org.stripe_subscription_id) {
      const customer = org.stripe_customer_id
        ? { id: org.stripe_customer_id }
        : await stripe.customers.create({
            email: context.user.email,
            name: org.name || undefined,
            metadata: { org_id: context.user.org_id, user_id: context.user.id },
          });
      const session = await stripe.checkout.sessions.create({
        customer: customer.id,
        mode: "subscription",
        payment_method_types: ["card"],
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3005"}/settings?tab=billing&checkout=success`,
        cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3005"}/settings?tab=billing&checkout=cancelled`,
        metadata: { org_id: context.user.org_id, target_plan: plan_id, target_interval: interval },
      });

      await supabase
        .from("organizations")
        .update({ stripe_customer_id: customer.id, updated_at: new Date().toISOString() })
        .eq("id", context.user.org_id);

      return successResponse({ mode: "checkout", url: session.url });
    }

    const currentSubscription = await stripe.subscriptions.retrieve(org.stripe_subscription_id, {
      expand: ["items.data.price"],
    });
    const subscriptionItemId = currentSubscription.items.data[0]?.id;
    if (!subscriptionItemId) return internalErrorResponse("No subscription item found");

    const updatedSubscription = await stripe.subscriptions.update(org.stripe_subscription_id, {
      cancel_at_period_end: false,
      proration_behavior: "create_prorations",
      items: [{ id: subscriptionItemId, price: priceId }],
      metadata: {
        org_id: context.user.org_id,
        plan_id,
        interval,
      },
    });

    const settings = mergeBillingSettings(org.settings, {
      interval,
      plan_id,
      executives_per_seat: getExecutivesPerSeat(plan_id),
      cancel_at_period_end: false,
      cancellation_feedback: null,
    });

    await supabase
      .from("organizations")
      .update({
        subscription_tier: plan_id,
        subscription_status: updatedSubscription.status,
        settings,
        updated_at: new Date().toISOString(),
      })
      .eq("id", context.user.org_id);

    return successResponse({
      mode: "updated",
      plan_id,
      interval,
      status: updatedSubscription.status,
      cancel_at_period_end: updatedSubscription.cancel_at_period_end,
    });
  } catch (error) {
    console.error("Error changing subscription plan:", error);
    return internalErrorResponse(error instanceof Error ? error.message : "Failed to change plan");
  }
}

export async function POST(request: NextRequest) {
  return withAuth((req, ctx) => handlePost(req, ctx))(request);
}

