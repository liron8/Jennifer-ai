"use client";

/**
 * Knowledge Base Sidebar
 * Collapsible panel for managing files, text notes, and links
 * that provide context to the AI assistant.
 */

import { useState, useEffect, useCallback, useRef, Fragment } from "react";
import { ConfirmationDialog } from "@/components/application/confirmation-dialog/confirmation-dialog";
import {
  BookOpen01,
  File06,
  Globe01,
  Link01,
  Plus,
  Trash01,
  Type01,
  XClose,
  Eye,
  ChevronRight,
  ChevronLeft,
  UploadCloud01,
} from "@untitledui/icons";
import { Button } from "@/components/base/buttons/button";
import { notify } from "@/lib/notifications";

interface KBItem {
  id: string;
  type: "file" | "text" | "link";
  title: string;
  content: string | null;
  file_url: string | null;
  file_name: string | null;
  file_size: number | null;
  created_at: string;
}

type TabType = "file" | "text" | "link";

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export function KnowledgeBaseSidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const [items, setItems] = useState<KBItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>("file");
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<KBItem | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchItems = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/knowledge-base");
      if (res.ok) {
        const result = await res.json();
        setItems(result.data?.data ?? result.data ?? []);
      }
    } catch (err) {
      console.error("Failed to fetch KB items:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) fetchItems();
  }, [isOpen, fetchItems]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("title", file.name);

    try {
      const res = await fetch("/api/knowledge-base", {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        notify.success("File uploaded", `"${file.name}" has been added to your knowledge base.`);
        fetchItems();
      } else {
        notify.error("Upload failed", "Could not upload file.");
      }
    } catch {
      notify.error("Upload failed", "An error occurred.");
    }

    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleAddTextOrLink = async () => {
    if (!newTitle.trim()) return;

    try {
      const res = await fetch("/api/knowledge-base", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: activeTab,
          title: newTitle.trim(),
          content: activeTab === "link" ? newContent.trim() : newContent,
        }),
      });
      if (res.ok) {
        notify.success("Added", `"${newTitle.trim()}" has been added.`);
        setNewTitle("");
        setNewContent("");
        setIsAdding(false);
        fetchItems();
      } else {
        notify.error("Error", "Failed to save item.");
      }
    } catch {
      notify.error("Error", "An error occurred.");
    }
  };

  const handleDelete = async (item: KBItem) => {
    setDeleteTarget(item);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`/api/knowledge-base?id=${deleteTarget.id}`, { method: "DELETE" });
      if (res.ok) {
        setItems((prev) => prev.filter((i) => i.id !== deleteTarget.id));
        notify.success("Deleted", `"${deleteTarget.title}" has been removed.`);
      }
    } catch {
      notify.error("Error", "Failed to delete item.");
    } finally {
      setDeleteTarget(null);
    }
  };

  const handleView = (item: KBItem) => {
    if (item.type === "link" && item.content) {
      window.open(item.content, "_blank", "noopener,noreferrer");
    } else if (item.type === "file" && item.file_url) {
      window.open(item.file_url, "_blank", "noopener,noreferrer");
    } else if (item.type === "text") {
      alert(item.content || "No content");
    }
  };

  const filteredItems = items.filter((i) => i.type === activeTab);

  const tabs: { id: TabType; label: string; icon: typeof File06 }[] = [
    { id: "file", label: "Files", icon: File06 },
    { id: "text", label: "Text", icon: Type01 },
    { id: "link", label: "Links", icon: Link01 },
  ];

  // Collapsed toggle button
  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed right-0 top-1/2 -translate-y-1/2 z-30 flex items-center gap-1.5 rounded-l-lg bg-brand-600 px-2 py-3 text-white shadow-lg hover:bg-brand-700 transition-colors"
        title="Open Knowledge Base"
      >
        <BookOpen01 className="h-4 w-4" />
        <ChevronLeft className="h-3 w-3" />
      </button>
    );
  }

  return (
    <div className="flex h-full w-80 shrink-0 flex-col border-l border-secondary bg-primary">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-secondary px-4 py-3">
        <div className="flex items-center gap-2">
          <BookOpen01 className="h-4 w-4 text-brand-600" />
          <h3 className="text-sm font-semibold text-primary">Knowledge Base</h3>
          <span className="rounded-full bg-gray-100 px-1.5 text-[10px] font-medium text-gray-500 dark:bg-gray-700 dark:text-gray-400">
            {items.length}
          </span>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="rounded p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-secondary">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const count = items.filter((i) => i.type === tab.id).length;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setIsAdding(false);
              }}
              className={`flex flex-1 items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors ${
                activeTab === tab.id
                  ? "border-b-2 border-brand-600 text-brand-600"
                  : "text-gray-500 hover:text-gray-700 dark:text-gray-400"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-5 w-5 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Items List */}
            {filteredItems.length === 0 && !isAdding ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <p className="text-xs text-tertiary mb-3">
                  No {activeTab === "file" ? "files" : activeTab === "text" ? "text notes" : "links"} yet.
                </p>
              </div>
            ) : (
              <ul className="flex flex-col gap-1.5">
                {filteredItems.map((item) => (
                  <li
                    key={item.id}
                    className="group flex items-center justify-between rounded-lg px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      {item.type === "file" && <File06 className="h-4 w-4 shrink-0 text-gray-400" />}
                      {item.type === "text" && <Type01 className="h-4 w-4 shrink-0 text-gray-400" />}
                      {item.type === "link" && <Globe01 className="h-4 w-4 shrink-0 text-gray-400" />}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium text-primary">{item.title}</p>
                        {item.type === "file" && item.file_size && (
                          <p className="text-[10px] text-tertiary">{formatFileSize(item.file_size)}</p>
                        )}
                        {item.type === "link" && item.content && (
                          <p className="truncate text-[10px] text-tertiary">{item.content}</p>
                        )}
                        {item.type === "text" && item.content && (
                          <p className="truncate text-[10px] text-tertiary">{item.content.substring(0, 60)}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleView(item)}
                        className="rounded p-1 text-gray-400 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-500/10"
                        title="View"
                      >
                        <Eye className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => handleDelete(item)}
                        className="rounded p-1 text-gray-400 hover:text-error-600 hover:bg-error-50 dark:hover:bg-error-500/10"
                        title="Delete"
                      >
                        <Trash01 className="h-3 w-3" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {/* Add New Form */}
            {isAdding && activeTab !== "file" && (
              <div className="mt-3 flex flex-col gap-2 rounded-lg border border-secondary p-3">
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder={activeTab === "link" ? "Link title" : "Note title"}
                  className="w-full rounded-md border border-secondary bg-primary px-2.5 py-1.5 text-xs text-primary placeholder:text-quaternary focus:border-brand-300 focus:outline-none focus:ring-1 focus:ring-brand-100"
                  autoFocus
                />
                {activeTab === "text" ? (
                  <textarea
                    value={newContent}
                    onChange={(e) => setNewContent(e.target.value)}
                    placeholder="Paste or type text content..."
                    rows={4}
                    className="w-full rounded-md border border-secondary bg-primary px-2.5 py-1.5 text-xs text-primary placeholder:text-quaternary focus:border-brand-300 focus:outline-none focus:ring-1 focus:ring-brand-100 resize-none"
                  />
                ) : (
                  <input
                    type="url"
                    value={newContent}
                    onChange={(e) => setNewContent(e.target.value)}
                    placeholder="https://..."
                    className="w-full rounded-md border border-secondary bg-primary px-2.5 py-1.5 text-xs text-primary placeholder:text-quaternary focus:border-brand-300 focus:outline-none focus:ring-1 focus:ring-brand-100"
                  />
                )}
                <div className="flex gap-2">
                  <Button size="sm" color="primary" onClick={handleAddTextOrLink} className="flex-1">
                    Save
                  </Button>
                  <Button
                    size="sm"
                    color="secondary"
                    onClick={() => {
                      setIsAdding(false);
                      setNewTitle("");
                      setNewContent("");
                    }}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer Actions */}
      <div className="border-t border-secondary px-3 py-2.5">
        {activeTab === "file" ? (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx,.txt,.csv,.xls,.xlsx,.md,.json"
              onChange={handleFileUpload}
              className="hidden"
            />
            <Button
              size="sm"
              color="secondary"
              iconLeading={UploadCloud01}
              className="w-full"
              onClick={() => fileInputRef.current?.click()}
            >
              Upload File
            </Button>
          </>
        ) : (
          <Button
            size="sm"
            color="secondary"
            iconLeading={Plus}
            className="w-full"
            onClick={() => setIsAdding(true)}
          >
            Add {activeTab === "text" ? "Text Note" : "Link"}
          </Button>
        )}
      </div>

      {/* Delete Confirmation */}
      <ConfirmationDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title={`Delete "${deleteTarget?.title ?? "item"}"?`}
        description="This will permanently remove this item from your knowledge base. This cannot be undone."
        confirmLabel="Delete"
        variant="danger"
      />
    </div>
  );
}
