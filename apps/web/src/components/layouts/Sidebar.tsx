'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronDown, ChevronRight } from 'lucide-react';
import * as Icons from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { cn } from '@/lib/utils';
import { sidebarNavigation, type NavItem } from '@/config/navigation';
import { ExecutiveStatusIndicator } from './ExecutiveStatusIndicator';

export function Sidebar() {
  const pathname = usePathname();
  const [expandedItems, setExpandedItems] = useState<string[]>(['scheduling', 'tasks']);

  const toggleExpanded = (id: string) => {
    setExpandedItems((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // Separate main nav and bottom nav (settings)
  const mainNav = sidebarNavigation.filter((item) => item.position !== 'bottom');
  const bottomNav = sidebarNavigation.filter((item) => item.position === 'bottom');

  return (
    <aside className="flex h-full flex-col bg-card border-r">
      {/* Logo */}
      <div className="flex h-16 items-center px-6 border-b">
        <Link href="/dashboard" className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-lg">J</span>
          </div>
          <span className="font-semibold text-lg">JeniferAI</span>
        </Link>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        <ul className="space-y-1">
          {mainNav.map((item) => (
            <SidebarNavItem
              key={item.id}
              item={item}
              pathname={pathname}
              isExpanded={expandedItems.includes(item.id)}
              onToggle={() => toggleExpanded(item.id)}
            />
          ))}
        </ul>
      </nav>

      {/* Executive Status Indicator */}
      <div className="px-4 py-3 border-t">
        <ExecutiveStatusIndicator />
      </div>

      {/* Bottom Navigation (Settings) */}
      <div className="border-t py-4 px-3">
        <ul className="space-y-1">
          {bottomNav.map((item) => (
            <SidebarNavItem
              key={item.id}
              item={item}
              pathname={pathname}
              isExpanded={expandedItems.includes(item.id)}
              onToggle={() => toggleExpanded(item.id)}
            />
          ))}
        </ul>
      </div>
    </aside>
  );
}

interface SidebarNavItemProps {
  item: NavItem;
  pathname: string;
  isExpanded: boolean;
  onToggle: () => void;
}

function SidebarNavItem({ item, pathname, isExpanded, onToggle }: SidebarNavItemProps) {
  const Icon = (Icons as unknown as Record<string, LucideIcon>)[item.icon];
  const isActive = pathname === item.path || pathname?.startsWith(item.path + '/');
  const hasChildren = item.children && item.children.length > 0;

  if (hasChildren) {
    return (
      <li>
        <button
          onClick={onToggle}
          className={cn(
            'flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors',
            isActive
              ? 'bg-primary/10 text-primary'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          )}
        >
          <div className="flex items-center gap-3">
            {Icon && <Icon className="h-5 w-5" />}
            <span>{item.label}</span>
            {item.badge && (
              <span className="ml-auto rounded bg-primary/10 px-1.5 py-0.5 text-xs font-medium text-primary">
                {item.badge}
              </span>
            )}
          </div>
          {isExpanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </button>

        {isExpanded && (
          <ul className="mt-1 space-y-1 pl-4">
            {item.children!.map((child) => {
              const ChildIcon = (Icons as unknown as Record<string, LucideIcon>)[child.icon];
              const isChildActive = pathname === child.path;

              return (
                <li key={child.path}>
                  <Link
                    href={child.path}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                      isChildActive
                        ? 'bg-primary/10 text-primary font-medium'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                  >
                    {ChildIcon && <ChildIcon className="h-4 w-4" />}
                    <span>{child.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </li>
    );
  }

  return (
    <li>
      <Link
        href={item.path}
        className={cn(
          'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
          isActive
            ? 'bg-primary/10 text-primary'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
        )}
      >
        {Icon && <Icon className="h-5 w-5" />}
        <span>{item.label}</span>
        {item.badge && (
          <span className="ml-auto rounded bg-primary/10 px-1.5 py-0.5 text-xs font-medium text-primary">
            {item.badge}
          </span>
        )}
      </Link>
    </li>
  );
}
