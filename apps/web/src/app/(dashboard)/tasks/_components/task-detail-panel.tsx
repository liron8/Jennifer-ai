"use client";

/**
 * TaskDetailPanel Component
 * Side panel for viewing and editing task details with sub-task management
 */

import { useState, useCallback } from "react";
import {
  Calendar,
  CheckCircle,
  Edit01,
  Trash01,
  XClose,
  Plus,
  CheckDone01,
} from "@untitledui/icons";
import { Avatar } from "@/components/base/avatar/avatar";
import { Button } from "@/components/base/buttons/button";
import { type Task, type Subtask, priorityConfig, statusConfig, getInitials } from "./task-types";

interface TaskDetailPanelProps {
  task: Task;
  onClose: () => void;
  onToggleComplete: (taskId: string) => void;
  onEditTask?: (task: Task) => void;
  onDeleteTask?: (taskId: string) => void;
  onSubtasksChange?: (taskId: string, subtasks: Subtask[]) => void;
}

export function TaskDetailPanel({ task, onClose, onToggleComplete, onEditTask, onDeleteTask, onSubtasksChange }: TaskDetailPanelProps) {
  const priority = priorityConfig[task.priority] || priorityConfig.medium;
  const status = statusConfig[task.status] || statusConfig.todo;
  const subtasks = task.subtasks || [];
  const completedSubtasks = subtasks.filter(st => st.completed).length;

  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [editingSubtaskId, setEditingSubtaskId] = useState<string | null>(null);
  const [editingSubtaskTitle, setEditingSubtaskTitle] = useState("");

  const handleToggleSubtask = useCallback((subtaskId: string) => {
    const updated = subtasks.map(st =>
      st.id === subtaskId
        ? { ...st, completed: !st.completed, completed_at: !st.completed ? new Date().toISOString() : null }
        : st
    );
    onSubtasksChange?.(task.id, updated);
  }, [subtasks, task.id, onSubtasksChange]);

  const handleAddSubtask = useCallback(() => {
    const trimmed = newSubtaskTitle.trim();
    if (!trimmed) return;
    const newSt: Subtask = {
      id: `subtask-${Date.now()}`,
      title: trimmed,
      completed: false,
      completed_at: null,
    };
    onSubtasksChange?.(task.id, [...subtasks, newSt]);
    setNewSubtaskTitle("");
  }, [newSubtaskTitle, subtasks, task.id, onSubtasksChange]);

  const handleDeleteSubtask = useCallback((subtaskId: string) => {
    onSubtasksChange?.(task.id, subtasks.filter(st => st.id !== subtaskId));
  }, [subtasks, task.id, onSubtasksChange]);

  const handleStartEditSubtask = useCallback((subtask: Subtask) => {
    setEditingSubtaskId(subtask.id);
    setEditingSubtaskTitle(subtask.title);
  }, []);

  const handleSaveSubtaskEdit = useCallback(() => {
    if (!editingSubtaskId || !editingSubtaskTitle.trim()) {
      setEditingSubtaskId(null);
      return;
    }
    const updated = subtasks.map(st =>
      st.id === editingSubtaskId ? { ...st, title: editingSubtaskTitle.trim() } : st
    );
    onSubtasksChange?.(task.id, updated);
    setEditingSubtaskId(null);
    setEditingSubtaskTitle("");
  }, [editingSubtaskId, editingSubtaskTitle, subtasks, task.id, onSubtasksChange]);

  const handleCancelSubtaskEdit = useCallback(() => {
    setEditingSubtaskId(null);
    setEditingSubtaskTitle("");
  }, []);

  return (
    <div className="hidden w-96 flex-shrink-0 overflow-y-auto rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900 lg:block">
      <div className="flex items-start justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Task Details</h3>
        <button
          onClick={onClose}
          className="rounded-lg p-1 hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          <XClose className="h-5 w-5 text-gray-400" />
        </button>
      </div>

      <div className="mt-6 space-y-4">
        <div>
          <label className="text-xs font-medium text-gray-500">Title</label>
          <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">{task.title}</p>
        </div>

        {task.description && (
          <div>
            <label className="text-xs font-medium text-gray-500">Description</label>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{task.description}</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-gray-500">Status</label>
            <div className="mt-1">
              <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${status.bgColor} ${status.color}`}>
                {status.label}
              </span>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500">Priority</label>
            <div className="mt-1 flex items-center gap-1.5">
              <div className={`h-2 w-2 rounded-full ${priority.dotColor}`} />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {priority.label}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-gray-500">Due Date</label>
            <div className="mt-1 flex items-center gap-1.5">
              <Calendar className="h-4 w-4 text-gray-400" />
              <span className="text-sm text-gray-900 dark:text-white">{task.dueDate}</span>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500">Created</label>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{task.createdAt}</p>
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-gray-500">Category</label>
          <p className="mt-1 text-sm text-gray-900 dark:text-white">{task.category}</p>
        </div>

        <div>
          <label className="text-xs font-medium text-gray-500">Assignee</label>
          <div className="mt-1 flex items-center gap-2">
            <Avatar initials={getInitials(task.executive)} alt={task.executive} size="sm" />
            <span className="text-sm text-gray-900 dark:text-white">{task.executive}</span>
          </div>
        </div>

        {/* Sub-tasks Section */}
        <div className="border-t border-gray-100 pt-4 dark:border-gray-800">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <CheckDone01 className="h-4 w-4 text-brand-500" />
              <span className="text-sm font-semibold text-gray-900 dark:text-white">Sub-tasks</span>
            </div>
            {subtasks.length > 0 && (
              <span className="text-xs font-medium text-gray-500">
                {completedSubtasks}/{subtasks.length} done
              </span>
            )}
          </div>

          {subtasks.length > 0 && (
            <>
              <div className="mb-3 h-1.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                <div
                  className={`h-full rounded-full transition-all ${completedSubtasks === subtasks.length ? 'bg-green-500' : 'bg-brand-500'}`}
                  style={{ width: `${(completedSubtasks / subtasks.length) * 100}%` }}
                />
              </div>

              <div className="flex flex-col gap-1.5 mb-3">
                {subtasks.map((st) => (
                  <div key={st.id} className="group flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <button
                      onClick={() => handleToggleSubtask(st.id)}
                      className={`flex h-4.5 w-4.5 flex-shrink-0 items-center justify-center rounded border transition-colors ${
                        st.completed
                          ? 'border-green-500 bg-green-500 text-white'
                          : 'border-gray-300 hover:border-brand-400 dark:border-gray-600'
                      }`}
                    >
                      {st.completed && (
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                    {editingSubtaskId === st.id ? (
                      <input
                        type="text"
                        value={editingSubtaskTitle}
                        onChange={(e) => setEditingSubtaskTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSaveSubtaskEdit();
                          if (e.key === "Escape") handleCancelSubtaskEdit();
                        }}
                        onBlur={handleSaveSubtaskEdit}
                        autoFocus
                        className="flex-1 rounded border border-brand-300 bg-white px-2 py-0.5 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-brand-600 dark:bg-gray-800 dark:text-white"
                      />
                    ) : (
                      <span
                        className={`flex-1 text-sm cursor-pointer ${st.completed ? 'text-gray-400 line-through' : 'text-gray-700 dark:text-gray-300'}`}
                        onDoubleClick={() => handleStartEditSubtask(st)}
                      >
                        {st.title}
                      </span>
                    )}
                    {editingSubtaskId !== st.id && (
                      <>
                        <button
                          onClick={() => handleStartEditSubtask(st)}
                          className="rounded p-0.5 text-gray-300 opacity-0 transition-opacity hover:text-gray-600 group-hover:opacity-100 dark:hover:text-gray-200"
                        >
                          <Edit01 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteSubtask(st.id)}
                          className="rounded p-0.5 text-gray-300 opacity-0 transition-opacity hover:text-error-500 group-hover:opacity-100"
                        >
                          <Trash01 className="h-3.5 w-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}

          {subtasks.length === 0 && (
            <p className="mb-3 text-xs text-gray-400">No sub-tasks yet. Add one below.</p>
          )}

          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Add a sub-task..."
              value={newSubtaskTitle}
              onChange={(e) => setNewSubtaskTitle(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleAddSubtask(); }}
              className="flex-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500"
            />
            <button
              onClick={handleAddSubtask}
              disabled={!newSubtaskTitle.trim()}
              className="flex items-center rounded-lg border border-gray-200 bg-gray-50 px-2 py-1.5 text-brand-600 hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:bg-gray-800 dark:text-brand-400"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-3">
        <div className="flex gap-3">
          <Button size="sm" color="secondary" className="flex-1" iconLeading={Edit01} onClick={() => onEditTask?.(task)}>
            Edit
          </Button>
          <Button
            size="sm"
            color={task.completed ? "secondary" : "primary"}
            className="flex-1"
            iconLeading={CheckCircle}
            onClick={() => onToggleComplete(task.id)}
          >
            {task.completed ? "Reopen" : "Complete"}
          </Button>
        </div>
        <Button size="sm" color="secondary" className="w-full text-error-700 hover:text-error-800" iconLeading={Trash01} onClick={() => onDeleteTask?.(task.id)}>
          Delete Task
        </Button>
      </div>
    </div>
  );
}
