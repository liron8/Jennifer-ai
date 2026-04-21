/**
 * Task Types and Data
 * Shared types and sample data for the To-Do page components
 */

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
  completed_at?: string | null;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  priority: "high" | "medium" | "low";
  status: "todo" | "in_progress" | "approval" | "done";
  category: string;
  dueDate: string;
  executive: string;
  completed: boolean;
  createdAt: string;
  comments?: number;
  attachments?: number;
  subtasks?: Subtask[];
}

export type TaskStatus = "todo" | "in_progress" | "approval" | "done";
export type TaskPriority = "high" | "medium" | "low";
export type ViewMode = "board" | "list" | "table";

export const categories = [
  "All",
  "Travel",
  "Reports",
  "Personal",
  "Communications",
  "Legal",
  "Admin",
  "Events",
  "Calendar",
];

export const statusConfig: Record<TaskStatus, { label: string; color: string; bgColor: string }> = {
  todo: { label: "To Do", color: "text-gray-700", bgColor: "bg-gray-100" },
  in_progress: { label: "In Progress", color: "text-blue-700", bgColor: "bg-blue-100" },
  approval: { label: "Approval", color: "text-purple-700", bgColor: "bg-purple-100" },
  done: { label: "Done", color: "text-green-700", bgColor: "bg-green-100" },
};

export const priorityConfig: Record<TaskPriority, { label: string; color: string; dotColor: string }> = {
  high: { label: "High", color: "text-error-700 bg-error-50", dotColor: "bg-error-500" },
  medium: { label: "Medium", color: "text-warning-700 bg-warning-50", dotColor: "bg-warning-500" },
  low: { label: "Low", color: "text-gray-700 bg-gray-100", dotColor: "bg-gray-400" },
};

export const categoryColors: Record<string, string> = {
  Travel: "bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400",
  Reports: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400",
  Personal: "bg-pink-100 text-pink-700 dark:bg-pink-500/20 dark:text-pink-400",
  Communications: "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/20 dark:text-cyan-400",
  Legal: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400",
  Admin: "bg-gray-100 text-gray-700 dark:bg-gray-500/20 dark:text-gray-400",
  Events: "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400",
  Calendar: "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-400",
};

export const getInitials = (name: string) => {
  const parts = name.split(" ");
  return parts.length > 1 ? `${parts[0].charAt(0)}${parts[1].charAt(0)}` : parts[0].charAt(0);
};
