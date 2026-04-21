"use client";

/**
 * Top Navigation Header
 * Sticky header with search, notifications, settings, and user profile
 */

import { useMemo, useState, useEffect, useCallback } from "react";
import { Bell01, HelpCircle, SearchLg, Settings01, CheckCircle, AlertCircle, Clock, X } from "@untitledui/icons";
import { Button as AriaButton, DialogTrigger, Popover } from "react-aria-components";
import { Avatar } from "@/components/base/avatar/avatar";
import { Input } from "@/components/base/input/input";
import { cx } from "@/utils/cx";
import { NavAccountMenu } from "@/components/application/app-navigation/base-components/nav-account-card";
import { NavItemButton } from "@/components/application/app-navigation/base-components/nav-item-button";
import { useUser } from "@/hooks/useUser";

interface Notification {
  id: string;
  title: string;
  body: string | null;
  notification_type: string;
  category: string | null;
  is_read: boolean;
  created_at: string;
  action_url: string | null;
}

interface TopNavHeaderProps {
  className?: string;
}

export function TopNavHeader({ className }: TopNavHeaderProps) {
  const { profile } = useUser();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications?page_size=20');
      if (res.ok) {
        const json = await res.json();
        const payload = json.data || json;
        setNotifications(Array.isArray(payload.data) ? payload.data : Array.isArray(payload) ? payload : []);
        setUnreadCount(payload.meta?.unread_count ?? 0);
      }
    } catch {
      // Silently fail
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const markAsRead = useCallback(async (ids: string[]) => {
    if (ids.length === 0) return;
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notification_ids: ids }),
      });
      setNotifications(prev => prev.map(n => ids.includes(n.id) ? { ...n, is_read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - ids.length));
    } catch {
      // Silently fail
    }
  }, []);

  const markAllAsRead = useCallback(() => {
    const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
    markAsRead(unreadIds);
  }, [notifications, markAsRead]);

  const userInitials = useMemo(() => {
    if (profile?.full_name) {
      const names = profile.full_name.split(' ');
      return names.length > 1
        ? `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase()
        : names[0][0].toUpperCase();
    }
    return profile?.email ? profile.email[0].toUpperCase() : 'U';
  }, [profile]);

  const userDisplayName = profile?.full_name || profile?.email?.split('@')[0] || 'User';

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle className="h-4 w-4 text-success-primary" />;
      case 'error': case 'alert': return <AlertCircle className="h-4 w-4 text-error-primary" />;
      default: return <Clock className="h-4 w-4 text-brand-500" />;
    }
  };

  const formatTimeAgo = (dateStr: string) => {
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHrs = Math.floor(diffMins / 60);
    if (diffHrs < 24) return `${diffHrs}h ago`;
    const diffDays = Math.floor(diffHrs / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <header
      className={cx(
        "sticky top-0 z-40 flex h-16 items-center justify-between border-b border-secondary bg-primary px-4 lg:px-6",
        className
      )}
    >
      {/* Search */}
      <div className="flex-1 max-w-md">
        <Input
          shortcut
          size="sm"
          aria-label="Search"
          placeholder="Search..."
          icon={SearchLg}
          className="w-full"
        />
      </div>

      {/* Right side actions */}
      <div className="flex items-center gap-1">
        <NavItemButton
          size="md"
          icon={HelpCircle}
          label="Help"
          href="/support"
          tooltipPlacement="bottom"
        />
        <NavItemButton
          size="md"
          icon={Settings01}
          label="Settings"
          href="/settings/profile"
          tooltipPlacement="bottom"
        />

        {/* Notifications Dropdown */}
        <DialogTrigger isOpen={isNotificationsOpen} onOpenChange={(open) => {
          setIsNotificationsOpen(open);
          if (open) fetchNotifications();
        }}>
          <AriaButton
            className={({ isPressed, isFocused }) =>
              cx(
                "relative flex cursor-pointer items-center justify-center rounded-md bg-primary p-2 text-fg-quaternary outline-focus-ring transition duration-100 ease-linear select-none hover:bg-primary_hover hover:text-fg-quaternary_hover focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-2 size-10",
                (isPressed || isFocused) && "bg-active text-fg-quaternary_hover"
              )
            }
            aria-label="Notifications"
          >
            <Bell01 aria-hidden="true" className="size-5 shrink-0 transition-inherit-all" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-error-primary px-1 text-[10px] font-semibold text-white">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </AriaButton>
          <Popover
            placement="bottom right"
            offset={8}
            className={({ isEntering, isExiting }) =>
              cx(
                "w-96 rounded-xl border border-secondary bg-primary shadow-lg will-change-transform",
                isEntering && "duration-300 ease-out animate-in fade-in placement-bottom:slide-in-from-top-2",
                isExiting && "duration-150 ease-in animate-out fade-out placement-bottom:slide-out-to-top-2"
              )
            }
          >
            <div className="flex items-center justify-between border-b border-secondary px-4 py-3">
              <h3 className="text-sm font-semibold text-primary">Notifications</h3>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-xs font-medium text-brand-600 hover:text-brand-700 transition-colors"
                >
                  Mark all as read
                </button>
              )}
            </div>
            <div className="max-h-96 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary mb-3">
                    <Bell01 className="h-6 w-6 text-quaternary" />
                  </div>
                  <p className="text-sm font-medium text-primary">No notifications yet</p>
                  <p className="mt-1 text-xs text-tertiary text-center">
                    {"You'll be notified about tasks, approvals, calendar reminders, and more."}
                  </p>
                </div>
              ) : (
                notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={cx(
                      "flex gap-3 px-4 py-3 border-b border-secondary last:border-b-0 transition-colors cursor-pointer hover:bg-primary_hover",
                      !notification.is_read && "bg-brand-25 dark:bg-brand-500/5"
                    )}
                    onClick={() => {
                      if (!notification.is_read) markAsRead([notification.id]);
                      if (notification.action_url) window.location.href = notification.action_url;
                    }}
                  >
                    <div className="mt-0.5 shrink-0">
                      {getNotificationIcon(notification.notification_type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={cx("text-sm text-primary line-clamp-1", !notification.is_read && "font-semibold")}>
                          {notification.title}
                        </p>
                        {!notification.is_read && (
                          <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-500" />
                        )}
                      </div>
                      {notification.body && (
                        <p className="mt-0.5 text-xs text-tertiary line-clamp-2">{notification.body}</p>
                      )}
                      <p className="mt-1 text-xs text-quaternary">{formatTimeAgo(notification.created_at)}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Popover>
        </DialogTrigger>

        {/* User Avatar Dropdown */}
        <DialogTrigger>
          <AriaButton
            className={({ isPressed, isFocused }) =>
              cx(
                "group relative ml-2 inline-flex cursor-pointer rounded-full",
                (isPressed || isFocused) && "outline-2 outline-offset-2 outline-focus-ring"
              )
            }
          >
            <Avatar alt={userDisplayName} initials={userInitials} size="md" status="online" />
          </AriaButton>
          <Popover
            placement="bottom right"
            offset={8}
            className={({ isEntering, isExiting }) =>
              cx(
                "will-change-transform",
                isEntering &&
                  "duration-300 ease-out animate-in fade-in placement-bottom:slide-in-from-top-2",
                isExiting &&
                  "duration-150 ease-in animate-out fade-out placement-bottom:slide-out-to-top-2"
              )
            }
          >
            <NavAccountMenu />
          </Popover>
        </DialogTrigger>
      </div>
    </header>
  );
}
