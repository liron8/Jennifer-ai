import type { NextRequest } from "next/server";
import Stripe from "stripe";
import { z } from "zod";
import { withAuth, type AuthContext } from "@/lib/api/middleware";
import { badRequestResponse, internalErrorResponse, successResponse } from "@/lib/api/utils";
import { createClient } from "@/lib/supabase/server";
import { CANCELLATION_REASON_OPTIONS } from "@/config/billing";

const cancellationReasonValues = CANCELLATION_REASON_OPTIONS.map((option) => option.id) as [
  string,
  ...string[],
];

const requestSchema = z.object({
  reason: z.enum(cancellationReasonValues),
  switching_to_product: z.string().max(200).optional(),
  details: z.string().max(2000).optional(),
});

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
  return new Stripe(key);
}

function mergeCancellationSettings(
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
    const parsed = requestSchema.safeParse(await request.json());
    if (!parsed.success) return badRequestResponse("Invalid cancellation payload");

    const { reason, details, switching_to_product } = parsed.data;
    if (reason === "switching_product" && !switching_to_product?.trim()) {
      return badRequestResponse("Please provide the other product name");
    }

    const supabase = await createClient();
    const stripe = getStripe();

    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .select("id, settings, stripe_subscription_id")
      .eq("id", context.user.org_id)
      .single();

    if (orgError || !org) return internalErrorResponse("Organization not found");
    if (!org.stripe_subscription_id) return badRequestResponse("No active Stripe subscription found");

    const subscription = await stripe.subscriptions.update(org.stripe_subscription_id, {
      cancel_at_period_end: true,
    });

    const settings = mergeCancellationSettings(org.settings, {
      cancel_at_period_end: true,
      cancellation_feedback: {
        reason,
        details: details || null,
        switching_to_product: switching_to_product || null,
        requested_by_user_id: context.user.id,
        requested_at: new Date().toISOString(),
      },
    });

    await supabase
      .from("organizations")
      .update({
        subscription_status: subscription.status,
        settings,
        updated_at: new Date().toISOString(),
      })
      .eq("id", context.user.org_id);

    const subData = subscription as unknown as Record<string, unknown>;
    const periodEnd = typeof subData.current_period_end === "number"
      ? new Date(subData.current_period_end * 1000).toISOString()
      : null;

    return successResponse({
      cancel_at_period_end: true,
      current_period_end: periodEnd,
      status: subscription.status,
    });
  } catch (error) {
    console.error("Error cancelling subscription:", error);
    return internalErrorResponse(error instanceof Error ? error.message : "Failed to cancel subscription");
  }
}

export async function POST(request: NextRequest) {
  return withAuth((req, ctx) => handlePost(req, ctx))(request);
}

