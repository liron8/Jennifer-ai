"use client";

/**
 * Collapsible Sidebar Navigation
 * Sidebar with collapse/expand toggle, dark mode switch, and JenniferAI branding
 */

import type { FC } from "react";
import { useState, useMemo, useCallback } from "react";
import { useUser } from "@/hooks/useUser";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  LifeBuoy01,
  LogOut01,
  Moon01,
  Sun,
} from "@untitledui/icons";
import { AnimatePresence, motion } from "motion/react";
import { Button as AriaButton, DialogTrigger as AriaDialogTrigger, Popover as AriaPopover } from "react-aria-components";
import { Avatar } from "@/components/base/avatar/avatar";
import { AvatarLabelGroup } from "@/components/base/avatar/avatar-label-group";
import { Button } from "@/components/base/buttons/button";
import { cx } from "@/utils/cx";
import { MobileNavigationHeader } from "@/components/application/app-navigation/base-components/mobile-header";
import { NavAccountMenu } from "@/components/application/app-navigation/base-components/nav-account-card";
import { NavItemBase } from "@/components/application/app-navigation/base-components/nav-item";
import { NavItemButton } from "@/components/application/app-navigation/base-components/nav-item-button";
import { NavList } from "@/components/application/app-navigation/base-components/nav-list";
import type { NavItemType } from "@/components/application/app-navigation/config";
import { useTheme } from "next-themes";

interface CollapsibleSidebarProps {
  activeUrl?: string;
  items: (NavItemType & { icon: FC<{ className?: string }> })[];
  footerItems?: (NavItemType & { icon: FC<{ className?: string }> })[];
}

export const CollapsibleSidebar = ({
  activeUrl,
  items,
  footerItems = [],
}: CollapsibleSidebarProps) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const { theme, setTheme } = useTheme();
  const { profile } = useUser();

  const handleSignOut = useCallback(async () => {
    try {
      await fetch('/api/auth/signout', { method: 'POST' });
    } catch {
      // Force redirect even on error
    }
    window.location.href = '/login';
  }, []);

  // Get user display info
  const userDisplayName = useMemo(() => {
    if (profile?.full_name) return profile.full_name;
    if (profile?.email) return profile.email.split('@')[0];
    return 'User';
  }, [profile]);
  
  const userEmail = profile?.email || '';
  const userInitials = useMemo(() => {
    if (profile?.full_name) {
      const names = profile.full_name.split(' ');
      return names.length > 1 
        ? `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase()
        : names[0][0].toUpperCase();
    }
    return userEmail ? userEmail[0].toUpperCase() : 'U';
  }, [profile, userEmail]);

  const activeItem = [...items, ...footerItems].find(
    (item) => item.href === activeUrl || item.items?.some((subItem) => subItem.href === activeUrl)
  );
  const [currentItem, setCurrentItem] = useState(activeItem || items[0]);

  const isSecondarySidebarVisible = !isCollapsed || (isCollapsed && isHovering && Boolean(currentItem?.items?.length));

  const COLLAPSED_WIDTH = 68;
  const EXPANDED_WIDTH = 280;
  const SECONDARY_SIDEBAR_WIDTH = 268;

  const toggleDarkMode = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  const mainSidebar = (
    <aside
      style={{
        width: isCollapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH,
      }}
      className={cx(
        "group flex h-full max-h-full flex-col justify-between overflow-y-auto bg-primary transition-all duration-200 ease-in-out",
        !isCollapsed && "border-r border-secondary"
      )}
    >
      {/* Header with Logo */}
      <div className="flex flex-col">
        <div className={cx("flex items-center justify-between px-4 py-5", isCollapsed && "justify-center px-3")}>
          {isCollapsed ? (
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600">
              <span className="text-lg font-bold text-white">J</span>
            </div>
          ) : (
            <Link href="/dashboard" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600">
                <span className="text-lg font-bold text-white">J</span>
              </div>
              <span className="text-lg font-semibold text-primary">JenniferAI</span>
            </Link>
          )}
        </div>

        {/* Navigation Items */}
        {isCollapsed ? (
          <ul className="flex flex-col gap-0.5 px-3">
            {items.map((item) => (
              <li key={item.label}>
                <NavItemButton
                  size="md"
                  current={currentItem?.href === item.href || activeUrl?.startsWith(item.href || "")}
                  href={item.href}
                  label={item.label || ""}
                  icon={item.icon}
                  onClick={() => setCurrentItem(item)}
                />
              </li>
            ))}
          </ul>
        ) : (
          <NavList activeUrl={activeUrl} items={items} />
        )}
      </div>

      {/* Footer */}
      <div className={cx("flex flex-col gap-3 px-3 py-4", !isCollapsed && "px-4")}>
        {/* Dark Mode Toggle */}
        <button
          onClick={toggleDarkMode}
          className={cx(
            "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-tertiary transition-colors hover:bg-primary_hover hover:text-secondary",
            isCollapsed && "justify-center px-2"
          )}
        >
          {theme === "dark" ? (
            <Sun className="h-5 w-5" />
          ) : (
            <Moon01 className="h-5 w-5" />
          )}
          {!isCollapsed && <span>{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>}
        </button>

        {/* Footer Items */}
        {footerItems.length > 0 && (
          <ul className="flex flex-col gap-0.5">
            {footerItems.map((item) =>
              isCollapsed ? (
                <li key={item.label}>
                  <NavItemButton
                    size="md"
                    current={activeUrl === item.href}
                    label={item.label || ""}
                    href={item.href}
                    icon={item.icon}
                  />
                </li>
              ) : (
                <li key={item.label} className="py-0.5">
                  <NavItemBase
                    badge={item.badge}
                    icon={item.icon}
                    href={item.href}
                    type="link"
                    current={item.href === activeUrl}
                  >
                    {item.label}
                  </NavItemBase>
                </li>
              )
            )}
          </ul>
        )}

        {/* User Account */}
        {isCollapsed ? (
          <AriaDialogTrigger>
            <AriaButton
              className={({ isPressed, isFocused }) =>
                cx(
                  "group relative mx-auto inline-flex rounded-full",
                  (isPressed || isFocused) && "outline-2 outline-offset-2 outline-focus-ring"
                )
              }
            >
              <Avatar status="online" initials={userInitials} size="md" alt={userDisplayName} />
            </AriaButton>
            <AriaPopover
              placement="right bottom"
              offset={8}
              crossOffset={6}
              className={({ isEntering, isExiting }) =>
                cx(
                  "will-change-transform",
                  isEntering &&
                    "duration-300 ease-out animate-in fade-in placement-right:slide-in-from-left-2",
                  isExiting &&
                    "duration-150 ease-in animate-out fade-out placement-right:slide-out-to-left-2"
                )
              }
            >
              <NavAccountMenu />
            </AriaPopover>
          </AriaDialogTrigger>
        ) : (
          <div className="relative flex items-center gap-3 rounded-xl p-3 pr-10 ring-1 ring-secondary ring-inset">
            <AvatarLabelGroup
              size="md"
              src={profile?.avatar_url}
              initials={userInitials}
              title={userDisplayName}
              subtitle={userEmail}
              status="online"
            />
            <div className="absolute top-1/2 right-1.5 -translate-y-1/2">
              <button
                type="button"
                onClick={handleSignOut}
                className="flex cursor-pointer items-center justify-center rounded-md p-1.5 text-fg-quaternary transition duration-100 ease-linear hover:bg-primary_hover hover:text-fg-quaternary_hover"
                title="Sign out"
              >
                <LogOut01 className="size-4 shrink-0" />
              </button>
            </div>
          </div>
        )}
      </div>

    </aside>
  );

  // Secondary sidebar for collapsed state with subitems
  const secondarySidebar = (
    <AnimatePresence initial={false}>
      {isCollapsed && isHovering && currentItem?.items && currentItem.items.length > 0 && (
        <motion.div
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: SECONDARY_SIDEBAR_WIDTH, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ type: "spring", damping: 26, stiffness: 220, bounce: 0 }}
          className="h-full overflow-hidden border-r border-secondary bg-primary"
        >
          <div style={{ width: SECONDARY_SIDEBAR_WIDTH }} className="flex h-full flex-col px-4 pt-6">
            <h3 className="text-sm font-semibold text-brand-secondary">{currentItem.label}</h3>
            <ul className="py-2">
              {currentItem.items.map((item) => (
                <li key={item.label} className="py-0.5">
                  <NavItemBase
                    current={activeUrl === item.href}
                    href={item.href}
                    icon={item.icon}
                    badge={item.badge}
                    type="link"
                  >
                    {item.label}
                  </NavItemBase>
                </li>
              ))}
            </ul>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <div
        className="relative z-40 hidden lg:fixed lg:inset-y-0 lg:left-0 lg:flex"
        onPointerEnter={() => setIsHovering(true)}
        onPointerLeave={() => setIsHovering(false)}
      >
        {mainSidebar}
        {secondarySidebar}
      </div>

      {/* Collapse Toggle Button - outside sidebar container for independent z-index */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        style={{
          left: isCollapsed ? `calc(${COLLAPSED_WIDTH}px - 12px)` : `calc(${EXPANDED_WIDTH}px - 12px)`,
        }}
        className={cx(
          "fixed top-7 z-[60] flex h-6 w-6 items-center justify-center rounded-full border border-secondary bg-primary shadow-sm transition-all duration-200 hover:bg-primary_hover",
          "hidden lg:flex"
        )}
      >
        {isCollapsed ? (
          <ChevronRight className="h-4 w-4 text-fg-quaternary" />
        ) : (
          <ChevronLeft className="h-4 w-4 text-fg-quaternary" />
        )}
      </button>

      {/* Placeholder for fixed sidebar */}
      <div
        style={{
          paddingLeft: isCollapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH,
        }}
        className="invisible hidden transition-all duration-200 lg:sticky lg:top-0 lg:bottom-0 lg:left-0 lg:block"
      />

      {/* Mobile navigation */}
      <MobileNavigationHeader>
        <aside className="flex h-full w-full flex-col justify-between overflow-y-auto bg-primary pt-4">
          <div className="px-4">
            <Link href="/dashboard" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600">
                <span className="text-lg font-bold text-white">J</span>
              </div>
              <span className="text-lg font-semibold text-primary">JenniferAI</span>
            </Link>
          </div>

          <NavList items={items} />

          <div className="mt-auto flex flex-col gap-5 px-2 py-4">
            {/* Dark Mode Toggle */}
            <button
              onClick={toggleDarkMode}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-tertiary transition-colors hover:bg-primary_hover hover:text-secondary"
            >
              {theme === "dark" ? (
                <Sun className="h-5 w-5" />
              ) : (
                <Moon01 className="h-5 w-5" />
              )}
              <span>{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>
            </button>

            <div className="flex flex-col gap-2">
              <NavItemBase type="link" href="/support" icon={LifeBuoy01}>
                Support
              </NavItemBase>
            </div>

            <div className="relative flex items-center gap-3 border-t border-secondary pt-6 pr-8 pl-2">
              <AvatarLabelGroup
                status="online"
                size="md"
                src={profile?.avatar_url}
                initials={userInitials}
                title={userDisplayName}
                subtitle={userEmail}
              />

              <div className="absolute top-1/2 right-0 -translate-y-1/2">
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="flex items-center justify-center rounded-md p-1.5 text-fg-quaternary hover:bg-primary_hover hover:text-fg-quaternary_hover transition-colors"
                  title="Sign out"
                >
                  <LogOut01 className="size-5" />
                </button>
              </div>
            </div>
          </div>
        </aside>
      </MobileNavigationHeader>
    </>
  );
};
