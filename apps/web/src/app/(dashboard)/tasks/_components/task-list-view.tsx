"use client";

/**
 * TaskListView Component
 * List view for displaying tasks with checkbox, details, and actions
 */

import {
  Calendar,
  CheckCircle,
  Edit01,
  Trash01,
  MessageCircle01,
  Paperclip,
} from "@untitledui/icons";
import { Avatar } from "@/components/base/avatar/avatar";
import { ButtonUtility } from "@/components/base/buttons/button-utility";
import { type Task, priorityConfig, categoryColors, statusConfig, getInitials } from "./task-types";

interface TaskListViewProps {
  tasks: Task[];
  selectedTask?: Task | null;
  onTaskClick?: (task: Task) => void;
  onToggleComplete?: (taskId: string) => void;
  onEditTask?: (task: Task) => void;
  onDeleteTask?: (taskId: string) => void;
}

export function TaskListView({ tasks, selectedTask, onTaskClick, onToggleComplete, onEditTask, onDeleteTask }: TaskListViewProps) {
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

  const activeTasks = tasks.filter(t => !t.completed);
  const completedTasks = tasks.filter(t => t.completed);

  const renderTask = (task: Task) => {
    const priority = priorityConfig[task.priority];
    const status = statusConfig[task.status];
    const categoryColor = categoryColors[task.category] || categoryColors.Admin;
    const isSelected = selectedTask?.id === task.id;

    return (
      <div
        key={task.id}
            onClick={() => onTaskClick?.(task)}
            className={`group flex cursor-pointer items-start gap-4 rounded-xl bg-white p-4 shadow-sm ring-1 transition-all hover:shadow-md dark:bg-gray-900 ${
              isSelected 
                ? "ring-brand-500 shadow-md" 
                : "ring-black/[0.04] hover:ring-black/[0.08] dark:ring-white/[0.04] dark:hover:ring-white/[0.08]"
            } ${task.completed ? "opacity-60" : ""}`}
          >
            {/* Checkbox */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleComplete?.(task.id);
              }}
              className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2 transition-all ${
                task.completed
                  ? "border-green-500 bg-green-500"
                  : "border-gray-300 hover:border-brand-500 dark:border-gray-600"
              }`}
            >
              {task.completed && <CheckCircle className="h-3 w-3 text-white" />}
            </button>

            {/* Task Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className={`text-sm font-semibold text-gray-900 dark:text-white ${task.completed ? "line-through" : ""}`}>
                      {task.title}
                    </p>
                    <span className={`inline-flex rounded px-1.5 py-0.5 text-xs font-medium ${status.bgColor} ${status.color}`}>
                      {status.label}
                    </span>
                  </div>
                  {task.description && (
                    <p className="mt-1 text-xs text-gray-500 line-clamp-1 dark:text-gray-400">{task.description}</p>
                  )}
                </div>
                
                {/* Priority Badge */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <div className={`h-2 w-2 rounded-full ${priority.dotColor}`} />
                  <span className={`text-xs font-medium ${priority.color.split(" ")[0]}`}>
                    {priority.label}
                  </span>
                </div>
              </div>

              {/* Meta Info */}
              <div className="mt-3 flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-gray-400" />
                  <span className="text-xs text-gray-500">{task.dueDate}</span>
                </div>
                
                <span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${categoryColor}`}>
                  {task.category}
                </span>
                
                <div className="flex items-center gap-1.5">
                  <Avatar initials={getInitials(task.executive)} alt={task.executive} size="xs" />
                  <span className="text-xs text-gray-500">{task.executive}</span>
                </div>

                {task.comments !== undefined && task.comments > 0 && (
                  <div className="flex items-center gap-1 text-gray-400">
                    <MessageCircle01 className="h-3.5 w-3.5" />
                    <span className="text-xs">{task.comments}</span>
                  </div>
                )}

                {task.attachments !== undefined && task.attachments > 0 && (
                  <div className="flex items-center gap-1 text-gray-400">
                    <Paperclip className="h-3.5 w-3.5" />
                    <span className="text-xs">{task.attachments}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
              <ButtonUtility size="xs" color="tertiary" tooltip="Edit" icon={Edit01} onClick={(e: React.MouseEvent) => {
                e.stopPropagation();
                onEditTask?.(task);
              }} />
              <ButtonUtility size="xs" color="tertiary" tooltip="Delete" icon={Trash01} onClick={(e: React.MouseEvent) => {
                e.stopPropagation();
                onDeleteTask?.(task.id);
              }} />
            </div>
          </div>
        );
  };

  return (
    <div className="space-y-3">
      {activeTasks.map(renderTask)}
      {completedTasks.length > 0 && (
        <>
          <div className="flex items-center gap-3 pt-4 pb-1">
            <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
            <span className="flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400">
              <CheckCircle className="h-3.5 w-3.5" />
              Done ({completedTasks.length})
            </span>
            <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
          </div>
          {completedTasks.map(renderTask)}
        </>
      )}
    </div>
  );
}
