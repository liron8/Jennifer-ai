"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CreditCard02, RefreshCw01 } from "@untitledui/icons";
import { Button } from "@/components/base/buttons/button";
import { Input } from "@/components/base/input/input";
import { notify } from "@/lib/notifications";
import {
  BILLING_PLAN_DEFINITIONS,
  BILLING_SUPPORT_PHONE,
  CANCELLATION_REASON_OPTIONS,
  getAnnualSavingsPercent,
  getDisplayPrice,
  getLowerTier,
  PLAN_ORDER,
  SELF_SERVE_PLANS,
  type BillingInterval,
  type BillingPlanId,
  type CancellationReasonId,
} from "@/config/billing";

type SubscriptionStatus = "active" | "trialing" | "past_due" | "canceled" | "inactive";

interface SubscriptionResponse {
  plan_id: BillingPlanId;
  interval: BillingInterval;
  status: SubscriptionStatus;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  payment_method: {
    brand: string;
    last4: string;
    exp_month: number;
    exp_year: number;
  } | null;
}

type ModifyStep = "actions" | "plan" | "cancel";
type PlanFlowMode = "upgrade" | "downgrade";

const STARTER_DOWNGRADE_CONFIRMATION_1 =
  "I understand that I can support only one executive profile on the 49 /month plan.";
const STARTER_DOWNGRADE_CONFIRMATION_2 =
  "I confirm that I have deleted all excess executive profiles.";

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function isActiveSubscription(status: string | undefined): boolean {
  return status === "active" || status === "trialing" || status === "past_due";
}

export function BillingSettingsTab() {
  const [subscription, setSubscription] = useState<SubscriptionResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const [selectedInterval, setSelectedInterval] = useState<BillingInterval>("annual");
  const [selectedPlanId, setSelectedPlanId] = useState<BillingPlanId>("starter");

  const [isModifyOpen, setIsModifyOpen] = useState(false);
  const [modifyStep, setModifyStep] = useState<ModifyStep>("actions");
  const [planFlowMode, setPlanFlowMode] = useState<PlanFlowMode>("upgrade");

  const [cancelReason, setCancelReason] = useState<CancellationReasonId | "">("");
  const [switchingProduct, setSwitchingProduct] = useState("");
  const [cancelDetails, setCancelDetails] = useState("");

  const [confirmStarterLimit, setConfirmStarterLimit] = useState(false);
  const [confirmDeletedExcess, setConfirmDeletedExcess] = useState(false);

  const refreshSubscription = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/billing/subscription");
      if (!response.ok) throw new Error("Failed to fetch billing subscription details");
      const result = await response.json();
      const data = (result.data?.data ?? result.data) as SubscriptionResponse;
      setSubscription(data);
      if (data && isActiveSubscription(data.status)) {
        setSelectedPlanId(data.plan_id || "starter");
        setSelectedInterval(data.interval || "annual");
      } else {
        setSelectedPlanId("starter");
        setSelectedInterval("annual");
      }
    } catch (err) {
      console.error("Failed loading billing:", err);
      setError(err instanceof Error ? err.message : "Failed to load billing data");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshSubscription();
  }, [refreshSubscription]);

  const currentPlanId = subscription?.plan_id || "starter";
  const currentPlan = BILLING_PLAN_DEFINITIONS[currentPlanId];
  const currentInterval = subscription?.interval || "annual";
  const hasActiveSubscription = isActiveSubscription(subscription?.status);
  const lowerTier = getLowerTier(currentPlanId);

  const showMonthlyUpsell =
    hasActiveSubscription &&
    currentInterval === "monthly" &&
    (currentPlanId === "starter" || currentPlanId === "strategist");

  const annualSavings = currentPlanId === "enterprise" ? 0 : getAnnualSavingsPercent(currentPlanId);

  const canSubmitStarterDowngrade =
    selectedPlanId !== "starter" ||
    planFlowMode !== "downgrade" ||
    (confirmStarterLimit && confirmDeletedExcess);

  const openModifyFlow = () => {
    setModifyStep("actions");
    setPlanFlowMode("upgrade");
    setCancelReason("");
    setCancelDetails("");
    setSwitchingProduct("");
    setConfirmStarterLimit(false);
    setConfirmDeletedExcess(false);
    setSelectedPlanId(hasActiveSubscription ? currentPlanId : "starter");
    setSelectedInterval(hasActiveSubscription ? currentInterval : "annual");
    setIsModifyOpen(true);
  };

  const closeModifyFlow = () => {
    setIsModifyOpen(false);
    setModifyStep("actions");
  };

  const submitPlanSelection = async (planId: BillingPlanId, interval: BillingInterval) => {
    if (planId === "enterprise") {
      window.open("mailto:sales@tryjennifer.com?subject=Enterprise Plan Inquiry", "_blank");
      return;
    }
    setIsProcessing(true);
    try {
      const response = await fetch("/api/billing/change-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan_id: planId,
          interval,
          acknowledge_starter_limit: confirmStarterLimit,
          acknowledge_deleted_excess_executives: confirmDeletedExcess,
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error?.message || payload?.error || "Failed to update subscription");
      }
      const data = payload.data?.data ?? payload.data;
      if (data?.url) {
        window.location.href = data.url;
        return;
      }
      notify.success("Plan updated", `Subscription updated to ${BILLING_PLAN_DEFINITIONS[planId].name}.`);
      closeModifyFlow();
      await refreshSubscription();
    } catch (err) {
      console.error("Failed to change plan:", err);
      notify.error("Unable to change plan", err instanceof Error ? err.message : "Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const submitCancellation = async () => {
    if (!cancelReason) return;
    setIsProcessing(true);
    try {
      const response = await fetch("/api/billing/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason: cancelReason,
          switching_to_product: cancelReason === "switching_product" ? switchingProduct : undefined,
          details: cancelDetails || undefined,
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error?.message || payload?.error || "Failed to cancel subscription");
      }
      notify.success("Cancellation scheduled", "Subscription will cancel at the end of the current billing period.");
      closeModifyFlow();
      await refreshSubscription();
    } catch (err) {
      console.error("Cancellation failed:", err);
      notify.error("Unable to cancel subscription", err instanceof Error ? err.message : "Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const renderPlanCard = (planId: BillingPlanId, mode: "grid" | "compact" = "grid") => {
    const plan = BILLING_PLAN_DEFINITIONS[planId];
    const isSelected = selectedPlanId === planId;
    const isCurrent = hasActiveSubscription && subscription?.plan_id === planId && subscription?.interval === selectedInterval;
    const isCheapestHighlight = selectedInterval === "annual" && planId === "starter";
    const priceLabel =
      planId === "enterprise" ? "Custom" : `$${getDisplayPrice(planId, selectedInterval)}`;
    const cadenceLabel =
      planId === "enterprise"
        ? "Contact sales"
        : selectedInterval === "annual"
          ? "Billed annually"
          : "Billed monthly";

    return (
      <div
        key={`${mode}-${planId}`}
        className={`rounded-xl border p-4 ${isSelected ? "border-brand-500 ring-2 ring-brand-100" : "border-secondary"} ${
          isCheapestHighlight ? "bg-success-50/40 dark:bg-success-500/5" : "bg-primary"
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h4 className="text-base font-semibold text-primary">{plan.name}</h4>
            <p className="mt-1 text-xs text-tertiary">{plan.tagline}</p>
          </div>
          {isCheapestHighlight && (
            <span className="rounded-full bg-success-100 px-2 py-0.5 text-[11px] font-medium text-success-700 dark:bg-success-500/10 dark:text-success-400">
              Best value
            </span>
          )}
        </div>
        <div className="mt-3">
          <p className="text-2xl font-bold text-primary">{priceLabel}</p>
          <p className="text-xs text-tertiary">{cadenceLabel}</p>
        </div>
        {mode === "grid" && (
          <ul className="mt-4 flex max-h-40 flex-col gap-1 overflow-auto">
            {plan.features.map((feature) => (
              <li key={feature} className="text-xs text-secondary">
                - {feature}
              </li>
            ))}
          </ul>
        )}
        <div className="mt-4">
          {plan.cta === "contact_sales" ? (
            <Button
              size="sm"
              color="secondary"
              className="w-full"
              onClick={() => window.open("mailto:sales@tryjennifer.com?subject=Enterprise Plan Inquiry", "_blank")}
            >
              Contact sales
            </Button>
          ) : (
            <Button
              size="sm"
              color={isCurrent ? "secondary" : "primary"}
              className="w-full"
              isDisabled={isCurrent || isProcessing}
              onClick={() => {
                setSelectedPlanId(planId);
                void submitPlanSelection(planId, selectedInterval);
              }}
            >
              {isCurrent ? "Current plan" : "Select plan"}
            </Button>
          )}
        </div>
      </div>
    );
  };

  const planCards = useMemo(
    () => PLAN_ORDER.map((planId) => renderPlanCard(planId, "grid")),
    [selectedPlanId, selectedInterval, subscription, hasActiveSubscription, isProcessing],
  );

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
          <p className="text-sm text-tertiary">Loading billing...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-center">
          <p className="text-lg font-semibold text-primary">Unable to load billing</p>
          <p className="max-w-md text-sm text-tertiary">{error}</p>
          <Button size="md" color="secondary" iconLeading={RefreshCw01} onClick={() => void refreshSubscription()}>
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold text-primary">Billing & Subscription</h2>
        <p className="text-sm text-tertiary">Manage plans, cadence, renewals, and cancellation preferences.</p>
      </div>

      <div className="rounded-xl bg-primary p-6 shadow-xs ring-1 ring-secondary ring-inset">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm text-tertiary">{hasActiveSubscription ? `${currentPlan.name} Account` : "Subscription"}</p>
            <div className="mt-1 flex items-end gap-2">
              <span className="text-4xl font-bold text-primary">
                {hasActiveSubscription && currentPlanId !== "enterprise"
                  ? `$${currentInterval === "monthly" ? currentPlan.monthlyPrice : currentPlan.annualMonthlyEquivalent}`
                  : hasActiveSubscription && currentPlanId === "enterprise"
                    ? "Custom"
                    : `$${BILLING_PLAN_DEFINITIONS.starter.annualMonthlyEquivalent}`}
              </span>
              <span className="pb-1 text-sm text-tertiary">
                {hasActiveSubscription
                  ? currentPlanId === "enterprise"
                    ? "pricing"
                    : "per month"
                  : "per month"}
              </span>
            </div>
            <p className="mt-1 text-sm text-secondary">
              {hasActiveSubscription
                ? currentInterval === "annual"
                  ? "Billed annually"
                  : "Billed monthly"
                : "Starter annual is selected by default for new subscriptions"}
            </p>
            <p className="mt-2 text-sm text-tertiary">
              {subscription?.current_period_end
                ? `Your next invoice is scheduled on ${formatDate(subscription.current_period_end)}`
                : "No active paid subscription yet."}
            </p>
            {subscription?.cancel_at_period_end && (
              <p className="mt-2 text-xs font-medium text-warning-700 dark:text-warning-400">
                Subscription is set to cancel at period end.
              </p>
            )}
          </div>
          <Button color="primary" size="sm" onClick={openModifyFlow}>
            {hasActiveSubscription ? "Modify subscription" : "Choose a plan"}
          </Button>
        </div>

        {showMonthlyUpsell && (
          <button
            type="button"
            className="mt-4 w-full rounded-lg border border-brand-200 bg-brand-50 px-4 py-3 text-left dark:border-brand-500/30 dark:bg-brand-500/10"
            onClick={() => {
              setSelectedPlanId(currentPlanId);
              setSelectedInterval("annual");
              setPlanFlowMode("upgrade");
              setModifyStep("plan");
              setIsModifyOpen(true);
            }}
          >
            <p className="text-sm font-semibold text-primary">
              Save {annualSavings}% by switching to annual - pay $
              {currentPlanId === "starter"
                ? BILLING_PLAN_DEFINITIONS.starter.annualMonthlyEquivalent
                : BILLING_PLAN_DEFINITIONS.strategist.annualMonthlyEquivalent}
              /month billed annually
            </p>
          </button>
        )}
      </div>

      <div className="rounded-xl bg-primary p-6 shadow-xs ring-1 ring-secondary ring-inset">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-primary">Plan pricing</h3>
          <div className="inline-flex rounded-full border border-secondary p-1">
            <button
              type="button"
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                selectedInterval === "monthly" ? "bg-brand-600 text-white" : "text-secondary"
              }`}
              onClick={() => setSelectedInterval("monthly")}
            >
              Monthly
            </button>
            <button
              type="button"
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                selectedInterval === "annual" ? "bg-brand-600 text-white" : "text-secondary"
              }`}
              onClick={() => setSelectedInterval("annual")}
            >
              Annual
            </button>
          </div>
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-3">{planCards}</div>
      </div>

      <div className="rounded-xl bg-primary p-6 shadow-xs ring-1 ring-secondary ring-inset">
        <h3 className="text-sm font-semibold text-primary">Payment Method</h3>
        {subscription?.payment_method ? (
          <div className="mt-4 flex items-center gap-4 rounded-lg border border-secondary p-4">
            <div className="flex h-10 w-14 items-center justify-center rounded-md bg-gray-100 dark:bg-gray-800">
              <CreditCard02 className="h-5 w-5 text-fg-quaternary" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-primary">•••• •••• •••• {subscription.payment_method.last4}</p>
              <p className="text-xs text-tertiary capitalize">
                {subscription.payment_method.brand} - Expires{" "}
                {String(subscription.payment_method.exp_month).padStart(2, "0")}/{subscription.payment_method.exp_year}
              </p>
            </div>
          </div>
        ) : (
          <p className="mt-2 text-sm text-tertiary">No payment method on file.</p>
        )}
      </div>

      <div className="rounded-xl bg-gray-50 p-5 dark:bg-gray-800/50">
        <p className="text-sm font-medium text-primary">Have a billing question?</p>
        <p className="mt-1 text-sm text-tertiary">Contact us at {BILLING_SUPPORT_PHONE}</p>
      </div>

      {isModifyOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={closeModifyFlow}>
          <div
            className="w-full max-w-5xl rounded-xl bg-white p-6 shadow-xl dark:bg-gray-900"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold text-primary">Modify subscription</h3>
              <Button size="sm" color="secondary" onClick={closeModifyFlow}>
                Close
              </Button>
            </div>

            {modifyStep === "actions" && (
              <div className="mt-6 grid gap-4">
                <button
                  type="button"
                  className="rounded-xl border border-secondary p-4 text-left hover:border-brand-300"
                  onClick={() => {
                    setPlanFlowMode("upgrade");
                    setModifyStep("plan");
                  }}
                >
                  <p className="text-lg font-semibold text-primary">Upgrade current plan</p>
                  <p className="text-sm text-tertiary">Choose cadence and move to a higher subscription tier.</p>
                </button>

                {lowerTier && (
                  <button
                    type="button"
                    className="rounded-xl border border-secondary p-4 text-left hover:border-brand-300"
                    onClick={() => {
                      setPlanFlowMode("downgrade");
                      setSelectedPlanId(lowerTier);
                      setModifyStep("plan");
                    }}
                  >
                    <p className="text-lg font-semibold text-primary">Downgrade plan</p>
                    <p className="text-sm text-tertiary">Move to a lower tier with reduced limits.</p>
                  </button>
                )}

                {hasActiveSubscription && (
                  <button
                    type="button"
                    className="rounded-xl border border-error-200 p-4 text-left hover:border-error-300"
                    onClick={() => setModifyStep("cancel")}
                  >
                    <p className="text-lg font-semibold text-primary">Cancel plan</p>
                    <p className="text-sm text-tertiary">End the subscription at the current billing period end.</p>
                  </button>
                )}
              </div>
            )}

            {modifyStep === "plan" && (
              <div className="mt-6">
                <div className="mb-4 inline-flex rounded-full border border-secondary p-1">
                  <button
                    type="button"
                    className={`rounded-full px-3 py-1 text-xs font-medium ${
                      selectedInterval === "monthly" ? "bg-brand-600 text-white" : "text-secondary"
                    }`}
                    onClick={() => setSelectedInterval("monthly")}
                  >
                    Monthly
                  </button>
                  <button
                    type="button"
                    className={`rounded-full px-3 py-1 text-xs font-medium ${
                      selectedInterval === "annual" ? "bg-brand-600 text-white" : "text-secondary"
                    }`}
                    onClick={() => setSelectedInterval("annual")}
                  >
                    Annual
                  </button>
                </div>

                <div className="grid gap-4 lg:grid-cols-3">
                  {PLAN_ORDER.map((planId) => renderPlanCard(planId, "compact"))}
                </div>

                {planFlowMode === "downgrade" && selectedPlanId === "starter" && (
                  <div className="mt-4 rounded-xl border border-warning-200 p-4">
                    <p className="mb-2 text-sm font-semibold text-primary">Downgrade confirmation</p>
                    <label className="mb-2 flex items-start gap-2 text-sm text-secondary">
                      <input
                        type="checkbox"
                        checked={confirmStarterLimit}
                        onChange={(event) => setConfirmStarterLimit(event.target.checked)}
                        className="mt-0.5"
                      />
                      <span>{STARTER_DOWNGRADE_CONFIRMATION_1}</span>
                    </label>
                    <label className="flex items-start gap-2 text-sm text-secondary">
                      <input
                        type="checkbox"
                        checked={confirmDeletedExcess}
                        onChange={(event) => setConfirmDeletedExcess(event.target.checked)}
                        className="mt-0.5"
                      />
                      <span>{STARTER_DOWNGRADE_CONFIRMATION_2}</span>
                    </label>
                  </div>
                )}

                <div className="mt-6 flex justify-between">
                  <Button size="sm" color="secondary" onClick={() => setModifyStep("actions")}>
                    Back
                  </Button>
                  <Button
                    size="sm"
                    color="primary"
                    isDisabled={isProcessing || !canSubmitStarterDowngrade}
                    onClick={() => void submitPlanSelection(selectedPlanId, selectedInterval)}
                  >
                    {isProcessing ? "Processing..." : "Confirm plan change"}
                  </Button>
                </div>
              </div>
            )}

            {modifyStep === "cancel" && (
              <div className="mt-6">
                <p className="mb-4 text-sm text-tertiary">Why do you want to cancel?</p>
                <div className="flex flex-col gap-2">
                  {CANCELLATION_REASON_OPTIONS.map((option) => (
                    <label key={option.id} className="flex items-center gap-2 text-sm text-secondary">
                      <input
                        type="radio"
                        name="cancel_reason"
                        value={option.id}
                        checked={cancelReason === option.id}
                        onChange={(event) => setCancelReason(event.target.value as CancellationReasonId)}
                      />
                      <span>{option.label}</span>
                    </label>
                  ))}
                </div>

                {cancelReason === "switching_product" && (
                  <div className="mt-4">
                    <label className="mb-1 block text-sm font-medium text-secondary">Which product are you switching to?</label>
                    <Input
                      size="sm"
                      value={switchingProduct}
                      onChange={(value) => setSwitchingProduct(value)}
                      placeholder="Product name"
                    />
                  </div>
                )}

                <div className="mt-4">
                  <label className="mb-1 block text-sm font-medium text-secondary">Additional details (optional)</label>
                  <textarea
                    value={cancelDetails}
                    onChange={(event) => setCancelDetails(event.target.value)}
                    rows={3}
                    className="w-full rounded-lg border border-secondary bg-primary px-3 py-2 text-sm text-primary"
                    placeholder="Share any additional feedback..."
                  />
                </div>

                <div className="mt-6 flex justify-between">
                  <Button size="sm" color="secondary" onClick={() => setModifyStep("actions")}>
                    Back
                  </Button>
                  <Button
                    size="sm"
                    color="primary"
                    className="!bg-error-600 hover:!bg-error-700"
                    isDisabled={
                      isProcessing ||
                      !cancelReason ||
                      (cancelReason === "switching_product" && !switchingProduct.trim())
                    }
                    onClick={() => void submitCancellation()}
                  >
                    {isProcessing ? "Processing..." : "Confirm cancellation"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

