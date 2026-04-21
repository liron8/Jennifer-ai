"use client";

/**
 * KanbanBoard Component
 * Kanban-style board view with drag-and-drop columns for To Do, In Progress, Approval, and Done
 */

import { useState, useCallback } from "react";
import { Plus } from "@untitledui/icons";
import { type Task, type TaskStatus, statusConfig } from "./task-types";
import { TaskCard } from "./task-card";

interface KanbanBoardProps {
  tasks: Task[];
  onTaskClick?: (task: Task) => void;
  onStatusChange?: (taskId: string, newStatus: TaskStatus) => void;
  onAddTask?: (status: TaskStatus) => void;
}

interface KanbanColumnProps {
  status: TaskStatus;
  tasks: Task[];
  onTaskClick?: (task: Task) => void;
  onAddTask?: () => void;
  onDrop?: (taskId: string, newStatus: TaskStatus) => void;
  isDragOver: boolean;
  onDragOver: (status: TaskStatus) => void;
  onDragLeave: () => void;
}

function KanbanColumn({ status, tasks, onTaskClick, onAddTask, onDrop, isDragOver, onDragOver, onDragLeave }: KanbanColumnProps) {
  const config = statusConfig[status];
  const columnColors: Record<TaskStatus, string> = {
    todo: "border-t-amber-400",
    in_progress: "border-t-blue-500",
    approval: "border-t-purple-500",
    done: "border-t-green-500",
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    onDragOver(status);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Only trigger if leaving the column entirely (not entering a child)
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      onDragLeave();
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData("text/plain");
    if (taskId) {
      onDrop?.(taskId, status);
    }
    onDragLeave();
  };

  return (
    <div
      className="flex w-80 flex-shrink-0 flex-col"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Column Header */}
      <div className={`mb-4 rounded-t-xl border-t-4 ${columnColors[status]} bg-gray-50 px-4 py-3 dark:bg-gray-900/50`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`h-2 w-2 rounded-full ${
              status === "todo" ? "bg-amber-400" : 
              status === "in_progress" ? "bg-blue-500" : 
              status === "approval" ? "bg-purple-500" : "bg-green-500"
            }`} />
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              {config.label}
            </h3>
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-gray-200 px-1.5 text-xs font-medium text-gray-700 dark:bg-gray-700 dark:text-gray-300">
              {tasks.length}
            </span>
          </div>
          <button 
            onClick={onAddTask}
            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-200 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Cards Container */}
      <div className={`flex flex-1 flex-col gap-3 overflow-y-auto rounded-b-xl pb-4 transition-colors ${
        isDragOver ? "bg-brand-50/50 ring-2 ring-brand-200 ring-inset dark:bg-brand-900/10 dark:ring-brand-800" : ""
      }`}>
        {tasks.map((task) => (
          <div
            key={task.id}
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData("text/plain", task.id);
              e.dataTransfer.effectAllowed = "move";
            }}
            className="cursor-grab active:cursor-grabbing"
          >
            <TaskCard
              task={task}
              onClick={() => onTaskClick?.(task)}
            />
          </div>
        ))}

        {/* Empty State */}
        {tasks.length === 0 && (
          <div className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed py-8 ${
            isDragOver ? "border-brand-300 bg-brand-50/50 dark:border-brand-700" : "border-gray-200 dark:border-gray-700"
          }`}>
            <p className="text-sm text-gray-400">{isDragOver ? "Drop here" : "No tasks"}</p>
            {!isDragOver && (
              <button 
                onClick={onAddTask}
                className="mt-2 text-sm font-medium text-brand-600 hover:text-brand-700"
              >
                + Add task
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function KanbanBoard({ tasks, onTaskClick, onStatusChange, onAddTask }: KanbanBoardProps) {
  const columns: TaskStatus[] = ["todo", "in_progress", "approval", "done"];
  const [dragOverColumn, setDragOverColumn] = useState<TaskStatus | null>(null);

  const getTasksByStatus = (status: TaskStatus) => 
    tasks.filter((task) => task.status === status);

  const handleDrop = useCallback((taskId: string, newStatus: TaskStatus) => {
    const task = tasks.find(t => t.id === taskId);
    if (task && task.status !== newStatus) {
      onStatusChange?.(taskId, newStatus);
    }
  }, [tasks, onStatusChange]);

  return (
    <div className="flex gap-5 overflow-x-auto pb-4">
      {columns.map((status) => (
        <KanbanColumn
          key={status}
          status={status}
          tasks={getTasksByStatus(status)}
          onTaskClick={onTaskClick}
          onAddTask={() => onAddTask?.(status)}
          onDrop={handleDrop}
          isDragOver={dragOverColumn === status}
          onDragOver={setDragOverColumn}
          onDragLeave={() => setDragOverColumn(null)}
        />
      ))}
    </div>
  );
}
