"use client";

/**
 * TaskCard Component
 * Beautiful card component for displaying tasks in board/card view
 */

import {
  Calendar,
  MessageCircle01,
  Paperclip,
  DotsHorizontal,
  CheckDone01,
} from "@untitledui/icons";
import { Avatar } from "@/components/base/avatar/avatar";
import { type Task, priorityConfig, categoryColors, getInitials } from "./task-types";

interface TaskCardProps {
  task: Task;
  onClick?: () => void;
  onStatusChange?: (taskId: string, status: Task["status"]) => void;
}

export function TaskCard({ task, onClick }: TaskCardProps) {
  const priority = priorityConfig[task.priority];
  const categoryColor = categoryColors[task.category] || categoryColors.Admin;
  const subtasks = task.subtasks || [];
  const completedSubtasks = subtasks.filter(st => st.completed).length;
  const totalSubtasks = subtasks.length;

  return (
    <div
      onClick={onClick}
      className="group cursor-pointer rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-all hover:border-gray-300 hover:shadow-md dark:border-gray-700 dark:bg-gray-900 dark:hover:border-gray-600"
    >
      {/* Header: Category & Menu */}
      <div className="mb-3 flex items-center justify-between">
        <span className={`inline-flex rounded-md px-2 py-1 text-xs font-medium ${categoryColor}`}>
          {task.category}
        </span>
        <button 
          onClick={(e) => e.stopPropagation()}
          className="rounded-lg p-1 opacity-0 transition-opacity hover:bg-gray-100 group-hover:opacity-100 dark:hover:bg-gray-800"
        >
          <DotsHorizontal className="h-4 w-4 text-gray-400" />
        </button>
      </div>

      {/* Title & Description */}
      <h4 className={`text-sm font-semibold text-gray-900 dark:text-white ${task.completed ? "line-through opacity-60" : ""}`}>
        {task.title}
      </h4>
      {task.description && (
        <p className="mt-1.5 line-clamp-2 text-xs text-gray-500 dark:text-gray-400">
          {task.description}
        </p>
      )}

      {/* Assignee */}
      <div className="mt-3 flex items-center gap-2">
        <Avatar 
          initials={getInitials(task.executive)} 
          alt={task.executive} 
          size="xs" 
        />
        <span className="text-xs text-gray-600 dark:text-gray-400">{task.executive}</span>
      </div>

      {/* Sub-tasks Progress */}
      {totalSubtasks > 0 && (
        <div className="mt-3">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5">
              <CheckDone01 className="h-3.5 w-3.5 text-brand-500" />
              <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                {completedSubtasks}/{totalSubtasks} subtasks
              </span>
            </div>
            {completedSubtasks === totalSubtasks && (
              <span className="text-xs font-medium text-green-600 dark:text-green-400">Done</span>
            )}
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
            <div
              className={`h-full rounded-full transition-all ${completedSubtasks === totalSubtasks ? 'bg-green-500' : 'bg-brand-500'}`}
              style={{ width: `${(completedSubtasks / totalSubtasks) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Footer: Date, Priority, Meta */}
      <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3 dark:border-gray-800">
        <div className="flex items-center gap-3">
          {/* Comments */}
          {task.comments !== undefined && task.comments > 0 && (
            <div className="flex items-center gap-1">
              <MessageCircle01 className="h-3.5 w-3.5 text-blue-500" />
              <span className="text-xs text-gray-500">{task.comments}</span>
            </div>
          )}
          
          {/* Attachments */}
          {task.attachments !== undefined && task.attachments > 0 && (
            <div className="flex items-center gap-1">
              <Paperclip className="h-3.5 w-3.5 text-amber-500" />
              <span className="text-xs text-gray-500">{task.attachments}</span>
            </div>
          )}

          {/* Due Date */}
          <div className="flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5 text-emerald-500" />
            <span className="text-xs text-gray-500">{task.dueDate}</span>
          </div>
        </div>

        {/* Priority Badge */}
        <div className="flex items-center gap-1.5">
          <div className={`h-2 w-2 rounded-full ${priority.dotColor}`} />
          <span className={`text-xs font-medium ${priority.color.split(" ")[0]}`}>
            {priority.label}
          </span>
        </div>
      </div>
    </div>
  );
}
