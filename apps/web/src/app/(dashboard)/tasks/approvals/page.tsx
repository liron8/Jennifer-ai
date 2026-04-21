"use client";

/**
 * Approvals Page
 * Manage approval requests with tabs for pending/approved/rejected
 * Connected to real database via /api/approvals
 */

import { useMemo, useState, useCallback } from "react";
import {
  AlertCircle,
  Calendar,
  Check,
  Clock,
  CreditCard01,
  File06,
  HelpCircle,
  Plus,
  Users01,
  XClose,
} from "@untitledui/icons";
import { TabList, Tabs } from "@/components/application/tabs/tabs";
import { Button } from "@/components/base/buttons/button";
import { BadgeWithDot } from "@/components/base/badges/badges";
import { Avatar } from "@/components/base/avatar/avatar";
import { useApprovals, type DatabaseApproval, type CreateApprovalData } from "@/hooks/useApprovals";
import { AddApprovalSlideout } from "../_components/add-approval-slideout";
import { notify } from "@/lib/notifications";

// Approval type definition
interface Approval {
  id: string;
  title: string;
  description: string;
  type: "expense" | "calendar" | "document" | "travel" | "other";
  amount?: string;
  submittedBy: string;
  submittedAt: string;
  status: "pending" | "approved" | "rejected" | "info-requested";
  executive: string;
  category: string;
  urgency: "high" | "medium" | "low";
  attachments?: number;
}

const getTypeIcon = (type: Approval["type"]) => {
  switch (type) {
    case "expense":
      return CreditCard01;
    case "calendar":
      return Calendar;
    case "document":
      return File06;
    case "travel":
      return Users01;
    default:
      return File06;
  }
};

const getStatusColor = (status: Approval["status"]) => {
  switch (status) {
    case "pending":
      return "warning";
    case "approved":
      return "success";
    case "rejected":
      return "error";
    case "info-requested":
      return "blue";
    default:
      return "gray";
  }
};

const getStatusLabel = (status: Approval["status"]) => {
  switch (status) {
    case "pending":
      return "Pending";
    case "approved":
      return "Approved";
    case "rejected":
      return "Rejected";
    case "info-requested":
      return "Info Requested";
    default:
      return status;
  }
};

const getUrgencyColor = (urgency: Approval["urgency"]) => {
  switch (urgency) {
    case "high":
      return "error";
    case "medium":
      return "warning";
    case "low":
      return "gray";
    default:
      return "gray";
  }
};

const getInitials = (name: string) => {
  const parts = name.split(" ");
  return parts.length > 1 ? `${parts[0].charAt(0)}${parts[1].charAt(0)}` : parts[0].charAt(0);
};

// Convert database approval to UI format
const convertToUIApproval = (dbApproval: DatabaseApproval): Approval => ({
  id: dbApproval.id,
  title: dbApproval.title,
  description: dbApproval.description || "",
  type: dbApproval.approval_type,
  amount: dbApproval.amount ? `$${Number(dbApproval.amount).toFixed(2)}` : undefined,
  submittedBy: (dbApproval as any).submitter?.full_name || "User",
  submittedAt: new Date(dbApproval.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
  status: dbApproval.status === "info_requested" ? "info-requested" : dbApproval.status,
  executive: (dbApproval as any).executive?.full_name || "Unassigned",
  category: dbApproval.category || "General",
  urgency: dbApproval.urgency,
  attachments: dbApproval.attachments?.length || 0,
});

export default function ApprovalsPage() {
  const [activeTab, setActiveTab] = useState("pending");
  const [isAddApprovalOpen, setIsAddApprovalOpen] = useState(false);

  // Fetch approvals from database
  const { approvals: dbApprovals, isLoading, stats, createApproval, updateApprovalStatus, refetch } = useApprovals();

  // Convert database approvals to UI format
  const approvals = useMemo(() => {
    if (Array.isArray(dbApprovals)) {
      return dbApprovals.map(convertToUIApproval);
    }
    return [];
  }, [dbApprovals]);

  const filteredApprovals = useMemo(() => {
    const safeApprovals = Array.isArray(approvals) ? approvals : [];
    if (activeTab === "all") return safeApprovals;
    if (activeTab === "pending") return safeApprovals.filter((a) => a.status === "pending" || a.status === "info-requested");
    return safeApprovals.filter((a) => a.status === activeTab);
  }, [approvals, activeTab]);

  const handleCreateApproval = useCallback(async (data: CreateApprovalData) => {
    try {
      await createApproval(data);
      notify.success('Approval submitted', 'Your approval request has been submitted.');
    } catch (err) {
      notify.error('Failed to create approval', err instanceof Error ? err.message : 'Please try again.');
    }
  }, [createApproval]);

  const handleApprove = useCallback(async (id: string) => {
    try {
      await updateApprovalStatus(id, 'approved');
      notify.success('Approval approved', 'The request has been approved.');
    } catch (err) {
      notify.error('Failed to approve', 'Please try again.');
    }
  }, [updateApprovalStatus]);

  const handleReject = useCallback(async (id: string) => {
    try {
      await updateApprovalStatus(id, 'rejected');
      notify.success('Approval rejected', 'The request has been rejected.');
    } catch (err) {
      notify.error('Failed to reject', 'Please try again.');
    }
  }, [updateApprovalStatus]);

  const handleRequestInfo = useCallback(async (id: string) => {
    try {
      await updateApprovalStatus(id, 'info_requested');
      notify.success('Info requested', 'A request for more information has been sent.');
    } catch (err) {
      notify.error('Failed to request info', 'Please try again.');
    }
  }, [updateApprovalStatus]);

  // Use stats from hook if available, otherwise calculate from local data
  const safeApprovals = Array.isArray(approvals) ? approvals : [];
  const pendingCount = (stats?.pending ?? 0) + (stats?.info_requested ?? 0) || safeApprovals.filter((a) => a.status === "pending" || a.status === "info-requested").length;
  const approvedCount = stats?.approved ?? safeApprovals.filter((a) => a.status === "approved").length;
  const rejectedCount = stats?.rejected ?? safeApprovals.filter((a) => a.status === "rejected").length;

  return (
    <div className="flex flex-col gap-6 p-4 lg:p-8">
      {/* Page Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-xl font-semibold text-primary lg:text-2xl">Approvals</h1>
            <p className="text-sm text-tertiary">Review and manage approval requests</p>
          </div>
          {pendingCount > 0 && (
            <BadgeWithDot color="error" type="pill-color" size="md">
              {pendingCount} pending
            </BadgeWithDot>
          )}
        </div>
        <Button size="md" color="primary" iconLeading={Plus} onClick={() => setIsAddApprovalOpen(true)}>
          New Approval
        </Button>
      </div>

      {/* Tabs */}
      <Tabs selectedKey={activeTab} onSelectionChange={(key) => setActiveTab(key as string)}>
        <TabList
          type="button-minimal"
          items={[
            { id: "pending", label: `Pending (${pendingCount})` },
            { id: "approved", label: `Approved (${approvedCount})` },
            { id: "rejected", label: `Rejected (${rejectedCount})` },
            { id: "all", label: `All (${safeApprovals.length})` },
          ]}
        />
      </Tabs>

      {/* Approval Cards */}
      <div className="space-y-4">
        {filteredApprovals.length === 0 ? (
          <div className="flex h-64 items-center justify-center rounded-xl border border-secondary bg-primary">
            <div className="text-center">
              <Check className="mx-auto h-12 w-12 text-fg-quaternary" />
              <p className="mt-2 text-sm font-medium text-primary">No approvals found</p>
              <p className="text-xs text-tertiary">
                {activeTab === "pending" ? "All caught up!" : "No items in this category"}
              </p>
            </div>
          </div>
        ) : (
          filteredApprovals.map((approval) => {
            const TypeIcon = getTypeIcon(approval.type);
            return (
              <div
                key={approval.id}
                className="rounded-xl border border-secondary bg-primary p-5 transition-all hover:shadow-sm"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  {/* Left Content */}
                  <div className="flex gap-4">
                    <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-utility-${getStatusColor(approval.status)}-100`}>
                      <TypeIcon className={`h-5 w-5 text-utility-${getStatusColor(approval.status)}-600`} />
                    </div>
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-semibold text-primary">{approval.title}</h3>
                        {approval.amount && (
                          <span className="text-sm font-semibold text-primary">{approval.amount}</span>
                        )}
                        <BadgeWithDot color={getUrgencyColor(approval.urgency)} type="pill-color" size="sm" className="capitalize">
                          {approval.urgency}
                        </BadgeWithDot>
                      </div>
                      <p className="mt-1 text-sm text-tertiary">{approval.description}</p>
                      <div className="mt-3 flex flex-wrap items-center gap-4">
                        <div className="flex items-center gap-2">
                          <Avatar initials={getInitials(approval.submittedBy)} alt={approval.submittedBy} size="xs" />
                          <span className="text-xs text-secondary">Submitted by {approval.submittedBy}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3 text-fg-quaternary" />
                          <span className="text-xs text-tertiary">{approval.submittedAt}</span>
                        </div>
                        <span className="rounded bg-secondary px-1.5 py-0.5 text-xs text-secondary">
                          {approval.category}
                        </span>
                        {approval.attachments && (
                          <div className="flex items-center gap-1">
                            <File06 className="h-3 w-3 text-fg-quaternary" />
                            <span className="text-xs text-tertiary">{approval.attachments} attachment{approval.attachments > 1 ? "s" : ""}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Actions */}
                  <div className="flex items-center gap-2 lg:flex-shrink-0">
                    {approval.status === "pending" ? (
                      <>
                        <Button
                          size="sm"
                          color="primary"
                          iconLeading={Check}
                          onClick={() => handleApprove(approval.id)}
                        >
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          color="primary-destructive"
                          iconLeading={XClose}
                          onClick={() => handleReject(approval.id)}
                        >
                          Reject
                        </Button>
                        <Button
                          size="sm"
                          color="secondary"
                          iconLeading={HelpCircle}
                          onClick={() => handleRequestInfo(approval.id)}
                        >
                          Request Info
                        </Button>
                      </>
                    ) : approval.status === "info-requested" ? (
                      <>
                        <BadgeWithDot color="blue" type="pill-color" size="md">
                          Info Requested
                        </BadgeWithDot>
                        <Button
                          size="sm"
                          color="primary"
                          iconLeading={Check}
                          onClick={() => handleApprove(approval.id)}
                        >
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          color="primary-destructive"
                          iconLeading={XClose}
                          onClick={() => handleReject(approval.id)}
                        >
                          Reject
                        </Button>
                      </>
                    ) : (
                      <BadgeWithDot color={getStatusColor(approval.status)} type="pill-color" size="md">
                        {getStatusLabel(approval.status)}
                      </BadgeWithDot>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add Approval Slideout */}
      <AddApprovalSlideout
        isOpen={isAddApprovalOpen}
        onOpenChange={setIsAddApprovalOpen}
        onSubmit={handleCreateApproval}
      />
    </div>
  );
}
