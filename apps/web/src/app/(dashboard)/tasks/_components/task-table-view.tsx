"use client";

/**
 * TaskTableView Component
 * Table view for displaying tasks in a structured format
 */

import {
  CheckCircle,
  ChevronDown,
  ChevronUp,
} from "@untitledui/icons";
import { Avatar } from "@/components/base/avatar/avatar";
import { type Task, priorityConfig, categoryColors, statusConfig, getInitials } from "./task-types";

interface TaskTableViewProps {
  tasks: Task[];
  onTaskClick?: (task: Task) => void;
  onToggleComplete?: (taskId: string) => void;
}

export function TaskTableView({ tasks, onTaskClick, onToggleComplete }: TaskTableViewProps) {
  if (tasks.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <div className="text-center">
          <CheckCircle className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600" />
          <p className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No tasks found</p>
          <p className="text-xs text-gray-500">Try adjusting your filters</p>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900/50">
            <th className="w-12 px-4 py-3">
              <span className="sr-only">Status</span>
            </th>
            <th className="px-4 py-3 text-left">
              <button className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-gray-500">
                Task
                <ChevronDown className="h-3 w-3" />
              </button>
            </th>
            <th className="px-4 py-3 text-left">
              <button className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-gray-500">
                Status
              </button>
            </th>
            <th className="px-4 py-3 text-left">
              <button className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-gray-500">
                Priority
                <ChevronUp className="h-3 w-3" />
              </button>
            </th>
            <th className="px-4 py-3 text-left">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Category</span>
            </th>
            <th className="px-4 py-3 text-left">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Due Date</span>
            </th>
            <th className="px-4 py-3 text-left">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Assignee</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
          {tasks.map((task) => {
            const priority = priorityConfig[task.priority];
            const status = statusConfig[task.status];
            const categoryColor = categoryColors[task.category] || categoryColors.Admin;

            return (
              <tr
                key={task.id}
                onClick={() => onTaskClick?.(task)}
                className={`cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50 ${
                  task.completed ? "opacity-60" : ""
                }`}
              >
                {/* Checkbox */}
                <td className="px-4 py-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleComplete?.(task.id);
                    }}
                    className={`flex h-5 w-5 items-center justify-center rounded-full border-2 transition-all ${
                      task.completed
                        ? "border-green-500 bg-green-500"
                        : "border-gray-300 hover:border-brand-500 dark:border-gray-600"
                    }`}
                  >
                    {task.completed && <CheckCircle className="h-3 w-3 text-white" />}
                  </button>
                </td>

                {/* Task Title */}
                <td className="px-4 py-3">
                  <div className="max-w-xs">
                    <p className={`text-sm font-medium text-gray-900 dark:text-white ${task.completed ? "line-through" : ""}`}>
                      {task.title}
                    </p>
                    {task.description && (
                      <p className="mt-0.5 truncate text-xs text-gray-500">{task.description}</p>
                    )}
                  </div>
                </td>

                {/* Status */}
                <td className="px-4 py-3">
                  <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${status.bgColor} ${status.color}`}>
                    {status.label}
                  </span>
                </td>

                {/* Priority */}
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <div className={`h-2 w-2 rounded-full ${priority.dotColor}`} />
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                      {priority.label}
                    </span>
                  </div>
                </td>

                {/* Category */}
                <td className="px-4 py-3">
                  <span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${categoryColor}`}>
                    {task.category}
                  </span>
                </td>

                {/* Due Date */}
                <td className="px-4 py-3">
                  <span className="text-sm text-gray-600 dark:text-gray-400">{task.dueDate}</span>
                </td>

                {/* Assignee */}
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Avatar initials={getInitials(task.executive)} alt={task.executive} size="xs" />
                    <span className="text-sm text-gray-600 dark:text-gray-400">{task.executive}</span>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
