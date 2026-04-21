"use client";

/**
 * Delegations Page
 * Manage task delegations with tabs for delegated to/from me
 * Connected to real database via /api/delegations
 */

import { useMemo, useState, useCallback, useEffect } from "react";
import {
  ArrowRight,
  Calendar,
  Clock,
  Edit01,
  Eye,
  Plus,
  SearchLg,
  Trash01,
  Users01,
  RefreshCw01,
  CheckCircle,
} from "@untitledui/icons";
import { AddDelegationSlideout, type DelegationFormData } from "../_components/add-delegation-slideout";
import type { SortDescriptor } from "react-aria-components";
import { Table, TableRowActionsDropdown } from "@/components/application/table/table";
import { TabList, Tabs } from "@/components/application/tabs/tabs";
import { PaginationPageMinimalCenter } from "@/components/application/pagination/pagination";
import { Button } from "@/components/base/buttons/button";
import { ButtonUtility } from "@/components/base/buttons/button-utility";
import { BadgeWithDot } from "@/components/base/badges/badges";
import { Avatar } from "@/components/base/avatar/avatar";
import { InputBase } from "@/components/base/input/input";
import { useDelegations, type DatabaseDelegation } from "@/hooks/useDelegations";
import { useTasks } from "@/hooks/useTasks";
import { notify } from "@/lib/notifications";
import { ConfirmDeleteDialog } from "@/components/application/confirm-delete-dialog";

// Delegation type definition for UI
interface Delegation {
  id: string;
  task: string;
  taskId: string;
  description?: string;
  from: string;
  fromId: string;
  to: string;
  toId: string;
  dueDate: string;
  status: "pending" | "active" | "completed" | "overdue" | "cancelled";
  priority: "high" | "medium" | "low";
  createdAt: string;
  message?: string;
}

const getStatusColor = (status: Delegation["status"]) => {
  switch (status) {
    case "pending":
      return "warning";
    case "active":
      return "blue";
    case "completed":
      return "success";
    case "overdue":
      return "error";
    case "cancelled":
      return "gray";
    default:
      return "gray";
  }
};

const getStatusLabel = (status: Delegation["status"]) => {
  switch (status) {
    case "pending":
      return "Pending";
    case "active":
      return "In Progress";
    case "completed":
      return "Completed";
    case "overdue":
      return "Overdue";
    case "cancelled":
      return "Cancelled";
    default:
      return status;
  }
};

const getPriorityColor = (priority: Delegation["priority"]) => {
  switch (priority) {
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
  if (name === "Me") return "ME";
  const parts = name.split(" ");
  return parts.length > 1 ? `${parts[0].charAt(0)}${parts[1].charAt(0)}` : parts[0].charAt(0);
};

// Convert database delegation to UI format
const convertToUIDelegation = (dbDelegation: DatabaseDelegation, currentUserId: string): Delegation => {
  // Determine if this is overdue
  const isOverdue = dbDelegation.due_date && 
    new Date(dbDelegation.due_date) < new Date() && 
    dbDelegation.status !== 'completed' && 
    dbDelegation.status !== 'rejected';

  // Map database status to UI status
  let uiStatus: Delegation['status'];
  if (isOverdue) {
    uiStatus = 'overdue';
  } else if (dbDelegation.status === 'accepted') {
    uiStatus = 'active';
  } else if (dbDelegation.status === 'completed') {
    uiStatus = 'completed';
  } else if (dbDelegation.status === 'rejected') {
    uiStatus = 'cancelled';
  } else {
    uiStatus = 'pending';
  }

  // Determine from/to labels based on current user
  const isFromMe = dbDelegation.delegated_by === currentUserId;
  const isToMe = dbDelegation.delegated_to === currentUserId;

  return {
    id: dbDelegation.id,
    task: dbDelegation.tasks?.title || "Unknown Task",
    taskId: dbDelegation.task_id,
    description: dbDelegation.tasks?.description || dbDelegation.delegation_notes || undefined,
    from: isFromMe ? "Me" : "Team Member",
    fromId: dbDelegation.delegated_by,
    to: isToMe ? "Me" : "Team Member",
    toId: dbDelegation.delegated_to,
    dueDate: dbDelegation.due_date 
      ? new Date(String(dbDelegation.due_date).split('T')[0] + 'T12:00:00').toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
      : new Date(dbDelegation.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    status: uiStatus,
    priority: dbDelegation.tasks?.priority || "medium",
    createdAt: new Date(dbDelegation.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    message: dbDelegation.delegation_notes || undefined,
  };
};

export default function DelegationsPage() {
  const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor>();
  const [activeTab, setActiveTab] = useState("to-me");
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddDelegationOpen, setIsAddDelegationOpen] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>("");

  // Fetch current user ID
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const response = await fetch('/api/settings/profile');
        if (response.ok) {
          const data = await response.json();
          const profile = data.data?.data ?? data.data;
          setCurrentUserId(profile?.id || "");
        }
      } catch (err) {
        console.error('Failed to fetch current user:', err);
      }
    };
    fetchCurrentUser();
  }, []);

  // Fetch delegations from database based on active tab
  const { 
    delegations: dbDelegations, 
    isLoading, 
    error,
    createDelegation, 
    updateDelegationStatus, 
    refetch,
    stats 
  } = useDelegations({
    direction: activeTab === "to-me" ? "received" : activeTab === "from-me" ? "sent" : "all",
  });

  // Fetch tasks for the delegation slideout
  const { tasks: availableTasks } = useTasks();

  // Convert database delegations to UI format
  const allDelegations = useMemo(() => {
    if (Array.isArray(dbDelegations)) {
      return dbDelegations.map(d => convertToUIDelegation(d, currentUserId));
    }
    return [];
  }, [dbDelegations, currentUserId]);

  const handleAddDelegation = useCallback(async (data: DelegationFormData) => {
    try {
      let taskId = data.taskId;

      // If creating a new task, create it first
      if (!taskId) {
        const taskRes = await fetch('/api/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: data.taskTitle,
            description: data.taskDescription || undefined,
            priority: data.priority,
            status: 'todo',
            due_date: data.dueDate || undefined,
          }),
        });
        if (!taskRes.ok) {
          const err = await taskRes.json();
          throw new Error(err.error?.message || 'Failed to create task');
        }
        const taskResult = await taskRes.json();
        const created = taskResult.data?.data ?? taskResult.data;
        taskId = created.id;
      }

      // Create the delegation
      await createDelegation({
        task_id: taskId!,
        delegated_to: data.delegateToId,
        message: data.notes || undefined,
        due_date: data.dueDate || undefined,
      });

      notify.success('Delegation created', 'The task has been delegated.');
      setIsAddDelegationOpen(false);
      refetch();
    } catch (err) {
      console.error('Failed to create delegation:', err);
      notify.error('Failed to create delegation', err instanceof Error ? err.message : 'Please try again.');
    }
  }, [createDelegation, refetch]);

  const handleAcceptDelegation = useCallback(async (id: string) => {
    try {
      await updateDelegationStatus(id, 'accepted');
      notify.success('Delegation accepted', 'You have accepted this task.');
    } catch (err) {
      notify.error('Failed to accept delegation', 'Please try again.');
    }
  }, [updateDelegationStatus]);

  const handleCompleteDelegation = useCallback(async (id: string) => {
    try {
      await updateDelegationStatus(id, 'completed');
      notify.success('Delegation completed', 'The task has been marked as complete.');
    } catch (err) {
      notify.error('Failed to complete delegation', 'Please try again.');
    }
  }, [updateDelegationStatus]);

  const handleRejectDelegation = useCallback(async (id: string) => {
    try {
      await updateDelegationStatus(id, 'rejected');
      notify.success('Delegation cancelled', 'The delegation has been cancelled.');
    } catch (err) {
      notify.error('Failed to cancel delegation', 'Please try again.');
    }
  }, [updateDelegationStatus]);

  // Edit delegation - open the slideout with pre-filled data
  const [editingDelegation, setEditingDelegation] = useState<Delegation | null>(null);
  const handleEditDelegation = useCallback((delegation: Delegation) => {
    setEditingDelegation(delegation);
    setIsAddDelegationOpen(true);
  }, []);

  // Delete delegation
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteConfirmDelegationId, setDeleteConfirmDelegationId] = useState<string | null>(null);
  const [deleteConfirmDelegationName, setDeleteConfirmDelegationName] = useState("");

  const promptDeleteDelegation = useCallback((id: string, title?: string) => {
    setDeleteConfirmDelegationId(id);
    setDeleteConfirmDelegationName(title || '');
  }, []);

  const confirmDeleteDelegation = useCallback(async () => {
    if (!deleteConfirmDelegationId) return;
    setDeletingId(deleteConfirmDelegationId);
    try {
      const response = await fetch(`/api/delegations/${deleteConfirmDelegationId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete delegation');
      notify.success('Delegation deleted', 'The delegation has been removed.');
      refetch();
    } catch (err) {
      notify.error('Failed to delete delegation', 'Please try again.');
    } finally {
      setDeletingId(null);
      setDeleteConfirmDelegationId(null);
      setDeleteConfirmDelegationName('');
    }
  }, [refetch, deleteConfirmDelegationId]);

  const filteredDelegations = useMemo(() => {
    let filtered = Array.isArray(allDelegations) ? allDelegations : [];

    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (d) =>
          d.task.toLowerCase().includes(query) ||
          d.from.toLowerCase().includes(query) ||
          d.to.toLowerCase().includes(query) ||
          d.description?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [allDelegations, searchQuery]);

  const sortedDelegations = useMemo(() => {
    if (!sortDescriptor) return filteredDelegations;

    return filteredDelegations.toSorted((a, b) => {
      const first = a[sortDescriptor.column as keyof Delegation];
      const second = b[sortDescriptor.column as keyof Delegation];

      if (typeof first === "string" && typeof second === "string") {
        const result = first.localeCompare(second);
        return sortDescriptor.direction === "ascending" ? result : -result;
      }

      return 0;
    });
  }, [sortDescriptor, filteredDelegations]);

  // Use stats from hook for counts
  const toMeCount = allDelegations.filter(d => d.to === "Me").length;
  const fromMeCount = allDelegations.filter(d => d.from === "Me").length;
  const pendingCount = allDelegations.filter(d => d.status === "pending" && d.to === "Me").length;
  const activeCount = allDelegations.filter(d => (d.status === "active" || d.status === "overdue") && d.to === "Me").length;

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 p-4 lg:p-8">
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-4">
            <div className="w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-tertiary">Loading delegations...</p>
          </div>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="flex flex-col gap-6 p-4 lg:p-8">
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-4 text-center">
            <p className="text-lg font-semibold text-primary">Unable to load delegations</p>
            <p className="text-sm text-tertiary max-w-md">{error}</p>
            <Button size="md" color="secondary" iconLeading={RefreshCw01} onClick={() => refetch()}>
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-4 lg:p-8">
      {/* Page Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-primary lg:text-2xl">Delegations</h1>
          <p className="text-sm text-tertiary">
            {pendingCount > 0 ? `${pendingCount} pending, ` : ""}{activeCount} active tasks delegated to you
          </p>
        </div>
        <div className="flex gap-3">
          <Button size="md" color="primary" iconLeading={Plus} onClick={() => setIsAddDelegationOpen(true)}>
            New Delegation
          </Button>
        </div>
      </div>

      {/* Tabs and Search */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <Tabs selectedKey={activeTab} onSelectionChange={(key) => setActiveTab(key as string)}>
          <TabList
            type="button-minimal"
            items={[
              { id: "to-me", label: `Delegated to Me (${toMeCount})` },
              { id: "from-me", label: `Delegated by Me (${fromMeCount})` },
              { id: "all", label: "All" },
            ]}
          />
        </Tabs>
        <div className="w-full lg:max-w-xs">
          <InputBase
            size="sm"
            type="search"
            aria-label="Search"
            placeholder="Search delegations..."
            icon={SearchLg}
            value={searchQuery}
            onChange={(val: string) => setSearchQuery(val)}
          />
        </div>
      </div>

      {/* Delegation Table */}
      <div className="rounded-xl border border-secondary bg-primary">
        <Table
          aria-label="Delegations"
          selectionMode="multiple"
          sortDescriptor={sortDescriptor}
          onSortChange={setSortDescriptor}
          className="bg-primary"
        >
          <Table.Header className="bg-primary">
            <Table.Head id="task" label="Task" isRowHeader allowsSorting className="w-full" />
            <Table.Head id="from" label="From" allowsSorting className="max-lg:hidden" />
            <Table.Head id="to" label="To" allowsSorting className="max-lg:hidden" />
            <Table.Head id="dueDate" label="Due Date" allowsSorting className="max-md:hidden" />
            <Table.Head id="priority" label="Priority" allowsSorting className="max-lg:hidden" />
            <Table.Head id="status" label="Status" allowsSorting className="max-md:hidden" />
            <Table.Head id="actions" />
          </Table.Header>

          <Table.Body items={sortedDelegations}>
            {(delegation) => (
              <Table.Row id={delegation.id}>
                <Table.Cell className="text-nowrap">
                  <div className="flex w-max flex-col">
                    <p className="text-sm font-medium text-primary">{delegation.task}</p>
                    {delegation.description && (
                      <p className="text-xs text-tertiary line-clamp-1 max-w-xs">{delegation.description}</p>
                    )}
                  </div>
                </Table.Cell>
                <Table.Cell className="text-nowrap max-lg:hidden">
                  <div className="flex items-center gap-2">
                    <Avatar initials={getInitials(delegation.from)} alt={delegation.from} size="xs" />
                    <span className="text-sm text-secondary">{delegation.from}</span>
                  </div>
                </Table.Cell>
                <Table.Cell className="text-nowrap max-lg:hidden">
                  <div className="flex items-center gap-2">
                    <Avatar initials={getInitials(delegation.to)} alt={delegation.to} size="xs" />
                    <span className="text-sm text-secondary">{delegation.to}</span>
                  </div>
                </Table.Cell>
                <Table.Cell className="text-nowrap max-md:hidden">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4 text-fg-quaternary" />
                    <span className="text-sm text-secondary">{delegation.dueDate}</span>
                  </div>
                </Table.Cell>
                <Table.Cell className="max-lg:hidden">
                  <BadgeWithDot color={getPriorityColor(delegation.priority)} type="pill-color" size="sm" className="capitalize">
                    {delegation.priority}
                  </BadgeWithDot>
                </Table.Cell>
                <Table.Cell className="max-md:hidden">
                  <BadgeWithDot color={getStatusColor(delegation.status)} type="pill-color" size="sm" className="capitalize">
                    {getStatusLabel(delegation.status)}
                  </BadgeWithDot>
                </Table.Cell>
                <Table.Cell className="pr-4 pl-4">
                  <div className="flex justify-end gap-1 max-lg:hidden">
                    {/* Mark as in-progress for pending delegations */}
                    {delegation.status === "pending" && (
                      <ButtonUtility 
                        size="xs" 
                        color="tertiary" 
                        tooltip="Start Task" 
                        icon={ArrowRight}
                        onClick={() => handleAcceptDelegation(delegation.id)}
                      />
                    )}
                    {/* Mark Complete for active/pending delegations */}
                    {(delegation.status === "active" || delegation.status === "pending" || delegation.status === "overdue") && (
                      <ButtonUtility 
                        size="xs" 
                        color="tertiary" 
                        tooltip="Mark Complete" 
                        icon={CheckCircle}
                        onClick={() => handleCompleteDelegation(delegation.id)}
                      />
                    )}
                    <ButtonUtility size="xs" color="tertiary" tooltip="Edit" icon={Edit01} onClick={() => handleEditDelegation(delegation)} />
                    <ButtonUtility size="xs" color="tertiary" tooltip="Delete" icon={Trash01} onClick={() => promptDeleteDelegation(delegation.id, delegation.task || delegation.message)} />
                  </div>
                  <div className="flex items-center justify-end lg:hidden">
                    <TableRowActionsDropdown />
                  </div>
                </Table.Cell>
              </Table.Row>
            )}
          </Table.Body>
        </Table>
        <div className="border-t border-secondary px-4 py-3">
          <PaginationPageMinimalCenter page={1} total={Math.ceil(sortedDelegations.length / 10)} />
        </div>
      </div>

      {/* Add Delegation Slideout */}
      <AddDelegationSlideout
        isOpen={isAddDelegationOpen}
        onOpenChange={(open) => {
          setIsAddDelegationOpen(open);
          if (!open) setEditingDelegation(null);
        }}
        onSubmit={handleAddDelegation}
      />

      {/* Delete Delegation Confirmation */}
      <ConfirmDeleteDialog
        isOpen={!!deleteConfirmDelegationId}
        onClose={() => { setDeleteConfirmDelegationId(null); setDeleteConfirmDelegationName(''); }}
        onConfirm={confirmDeleteDelegation}
        title="Delete Delegation"
        itemName={deleteConfirmDelegationName}
        isLoading={!!deletingId}
      />
    </div>
  );
}
