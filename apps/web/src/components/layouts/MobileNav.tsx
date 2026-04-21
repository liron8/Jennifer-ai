'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, ChevronDown, ChevronRight } from 'lucide-react';
import * as Icons from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { cn } from '@/lib/utils';
import { sidebarNavigation, type NavItem } from '@/config/navigation';

export function MobileNav() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  const toggleExpanded = (id: string) => {
    setExpandedItems((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const closeNav = () => setIsOpen(false);

  return (
    <>
      {/* Mobile Header */}
      <header className="sticky top-0 z-50 flex h-16 items-center justify-between border-b bg-background px-4">
        <Link href="/dashboard" className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-lg">J</span>
          </div>
          <span className="font-semibold text-lg">JeniferAI</span>
        </Link>

        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex h-10 w-10 items-center justify-center rounded-lg hover:bg-muted"
        >
          {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </header>

      {/* Mobile Menu Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-40 bg-black/50" onClick={closeNav} />
      )}

      {/* Mobile Menu Drawer */}
      <div
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-72 transform bg-card transition-transform duration-300 ease-in-out',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Header */}
        <div className="flex h-16 items-center justify-between border-b px-4">
          <Link href="/dashboard" className="flex items-center space-x-2" onClick={closeNav}>
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-lg">J</span>
            </div>
            <span className="font-semibold text-lg">JeniferAI</span>
          </Link>
          <button
            onClick={closeNav}
            className="flex h-10 w-10 items-center justify-center rounded-lg hover:bg-muted"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3">
          <ul className="space-y-1">
            {sidebarNavigation.map((item) => (
              <MobileNavItem
                key={item.id}
                item={item}
                pathname={pathname}
                isExpanded={expandedItems.includes(item.id)}
                onToggle={() => toggleExpanded(item.id)}
                onNavigate={closeNav}
              />
            ))}
          </ul>
        </nav>
      </div>
    </>
  );
}

interface MobileNavItemProps {
  item: NavItem;
  pathname: string;
  isExpanded: boolean;
  onToggle: () => void;
  onNavigate: () => void;
}

function MobileNavItem({
  item,
  pathname,
  isExpanded,
  onToggle,
  onNavigate,
}: MobileNavItemProps) {
  const Icon = (Icons as unknown as Record<string, LucideIcon>)[item.icon];
  const isActive = pathname === item.path || pathname?.startsWith(item.path + '/');
  const hasChildren = item.children && item.children.length > 0;

  if (hasChildren) {
    return (
      <li>
        <button
          onClick={onToggle}
          className={cn(
            'flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
            isActive
              ? 'bg-primary/10 text-primary'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          )}
        >
          <div className="flex items-center gap-3">
            {Icon && <Icon className="h-5 w-5" />}
            <span>{item.label}</span>
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
                    onClick={onNavigate}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors',
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
        onClick={onNavigate}
        className={cn(
          'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
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
