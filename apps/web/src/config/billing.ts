export type BillingPlanId = "starter" | "strategist" | "enterprise";
export type BillingInterval = "monthly" | "annual";

export interface BillingPlanDefinition {
  id: BillingPlanId;
  name: string;
  tagline: string;
  monthlyPrice: number | null;
  annualMonthlyEquivalent: number | null;
  seatsPerPlan: number | null;
  isSelfServe: boolean;
  cta: "select" | "contact_sales";
  features: string[];
}

export const BILLING_SUPPORT_PHONE = "+1 (424) 440-5509";

export const BILLING_PLAN_DEFINITIONS: Record<BillingPlanId, BillingPlanDefinition> = {
  starter: {
    id: "starter",
    name: "Starter",
    tagline:
      "Designed for individual EAs or administrative professionals supporting a single executive, offering reliable scheduling, calendar management, and task organization.",
    monthlyPrice: 49,
    annualMonthlyEquivalent: 39,
    seatsPerPlan: 1,
    isSelfServe: true,
    cta: "select",
    features: [
      "1 Executive Supported per Seat",
      "Task Management & Approvals",
      "Scheduling & Calendar Optimization",
      "Real-Time Updates & Notifications",
      "Route & Parking Planning",
      "Key Dates, Birthdays & Milestones",
      "Automated Reservations & Bookings",
      "Dynamic Meeting & Call Status",
    ],
  },
  strategist: {
    id: "strategist",
    name: "Strategist",
    tagline:
      "Perfect for advanced users or small EA teams managing multiple executives, with enhanced analytics, CRM integration, and collaboration features.",
    monthlyPrice: 89,
    annualMonthlyEquivalent: 79,
    seatsPerPlan: 5,
    isSelfServe: true,
    cta: "select",
    features: [
      "Everything in the Starter Plan",
      "Support for up to 5 Executives per Seat",
      "Executive Profiles, Preferences, Habits",
      "Knowledge Capture, Notes, Decisions",
      "Event & Ticket Management",
      "Vendor & Contact Management",
      "Meal & Nutrition Planning",
      "Delegation & Task Handoff",
      "One-Click Meeting Prep & Briefings",
      "AI-Powered Auto-Draft Responses",
      "Cross-Platform Workflow Automation",
    ],
  },
  enterprise: {
    id: "enterprise",
    name: "Enterprise",
    tagline:
      "Tailored for larger EA/Admin teams or organizations, providing scalable collaboration, custom reporting, and premium, concierge-level support.",
    monthlyPrice: null,
    annualMonthlyEquivalent: null,
    seatsPerPlan: null,
    isSelfServe: false,
    cta: "contact_sales",
    features: [
      "Everything in the Strategist Plan",
      "Unlimited Executive Capacity per Seat",
      "Personalized Onboarding & Training",
      "Dedicated Customer Success Manager",
      "AI-Enhanced Features",
      "Custom Reporting & Dashboards",
      "Productivity Insights & Analytics",
      "Executive & Team Performance Tracking",
      "Board Pack & Document Management",
      "Meeting Minutes & Action Items",
      "Succession Planning & Knowledge",
      "Professional Growth Programs",
      "RBAC & Audit Logs",
      "Custom API Integrations",
    ],
  },
};

export const PLAN_ORDER: BillingPlanId[] = ["starter", "strategist", "enterprise"];
export const SELF_SERVE_PLANS: BillingPlanId[] = ["starter", "strategist"];

export const CANCELLATION_REASON_OPTIONS = [
  { id: "missing_features", label: "Missing features" },
  { id: "trouble_setting_up", label: "Having trouble setting up" },
  { id: "too_expensive", label: "Too expensive" },
  { id: "not_using_enough", label: "Not using enough" },
  { id: "technical_issues", label: "Technical issues" },
  { id: "unsatisfactory_experience", label: "Unsatisfactory customer experience" },
  { id: "out_of_business", label: "Went out of business" },
  { id: "different_account", label: "Signing up for a different account" },
  { id: "switching_product", label: "I'm switching to a different product" },
] as const;

export type CancellationReasonId = (typeof CANCELLATION_REASON_OPTIONS)[number]["id"];

export function getDisplayPrice(planId: BillingPlanId, interval: BillingInterval): string {
  const plan = BILLING_PLAN_DEFINITIONS[planId];
  if (!plan.monthlyPrice || !plan.annualMonthlyEquivalent) return "Custom";
  return interval === "monthly"
    ? `${plan.monthlyPrice}/month`
    : `${plan.annualMonthlyEquivalent}/month`;
}

export function getAnnualSavingsPercent(planId: Exclude<BillingPlanId, "enterprise">): number {
  const plan = BILLING_PLAN_DEFINITIONS[planId];
  if (!plan.monthlyPrice || !plan.annualMonthlyEquivalent) return 0;
  return Math.round(((plan.monthlyPrice - plan.annualMonthlyEquivalent) / plan.monthlyPrice) * 100);
}

export function getLowerTier(planId: BillingPlanId): BillingPlanId | null {
  if (planId === "enterprise") return "strategist";
  if (planId === "strategist") return "starter";
  return null;
}

export function getExecutivesPerSeat(planId: BillingPlanId): number | null {
  return BILLING_PLAN_DEFINITIONS[planId].seatsPerPlan;
}

/**
 * Required Stripe env vars to configure in Vercel/.env
 * Values come from Stripe Dashboard:
 * - Developers > API keys:
 *   STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET
 * - Products > each recurring Price:
 *   STRIPE_PRICE_STARTER_MONTHLY, STRIPE_PRICE_STARTER_ANNUAL,
 *   STRIPE_PRICE_STRATEGIST_MONTHLY, STRIPE_PRICE_STRATEGIST_ANNUAL
 */
export const STRIPE_BILLING_ENV_VARS = [
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "STRIPE_PRICE_STARTER_MONTHLY",
  "STRIPE_PRICE_STARTER_ANNUAL",
  "STRIPE_PRICE_STRATEGIST_MONTHLY",
  "STRIPE_PRICE_STRATEGIST_ANNUAL",
] as const;

export function resolveStripePriceId(
  planId: BillingPlanId,
  interval: BillingInterval,
): string | null {
  if (planId === "enterprise") return null;
  const map: Record<Exclude<BillingPlanId, "enterprise">, Record<BillingInterval, string | undefined>> = {
    starter: {
      monthly: process.env.STRIPE_PRICE_STARTER_MONTHLY,
      annual: process.env.STRIPE_PRICE_STARTER_ANNUAL,
    },
    strategist: {
      monthly: process.env.STRIPE_PRICE_STRATEGIST_MONTHLY,
      annual: process.env.STRIPE_PRICE_STRATEGIST_ANNUAL,
    },
  };
  return map[planId][interval] || null;
}

export function inferPlanIntervalFromStripePrice(priceId: string | null | undefined): {
  planId: BillingPlanId | null;
  interval: BillingInterval | null;
} {
  if (!priceId) return { planId: null, interval: null };
  const entries: Array<{ key: string | undefined; planId: BillingPlanId; interval: BillingInterval }> = [
    { key: process.env.STRIPE_PRICE_STARTER_MONTHLY, planId: "starter", interval: "monthly" },
    { key: process.env.STRIPE_PRICE_STARTER_ANNUAL, planId: "starter", interval: "annual" },
    { key: process.env.STRIPE_PRICE_STRATEGIST_MONTHLY, planId: "strategist", interval: "monthly" },
    { key: process.env.STRIPE_PRICE_STRATEGIST_ANNUAL, planId: "strategist", interval: "annual" },
  ];
  const found = entries.find((entry) => entry.key && entry.key === priceId);
  return found ? { planId: found.planId, interval: found.interval } : { planId: null, interval: null };
}

export function normalizePlanId(raw: string | null | undefined): BillingPlanId | null {
  if (!raw) return null;
  const value = raw.toLowerCase().trim();
  if (value === "starter") return "starter";
  if (value === "strategist" || value === "professional" || value === "pro") return "strategist";
  if (value === "enterprise") return "enterprise";
  return null;
}

