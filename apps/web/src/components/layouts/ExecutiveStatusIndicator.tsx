'use client';

import { useState } from 'react';
import { ChevronDown, Circle } from 'lucide-react';

type ExecutiveStatus = 'available' | 'busy' | 'traveling' | 'offline';

interface Executive {
  id: string;
  name: string;
  status: ExecutiveStatus;
  location?: string;
}

const statusConfig: Record<ExecutiveStatus, { label: string; color: string }> = {
  available: { label: 'Available', color: 'bg-green-500' },
  busy: { label: 'In Meeting', color: 'bg-yellow-500' },
  traveling: { label: 'Traveling', color: 'bg-blue-500' },
  offline: { label: 'Offline', color: 'bg-gray-400' },
};

export function ExecutiveStatusIndicator() {
  const [isOpen, setIsOpen] = useState(false);

  // TODO: Get executives from context/API
  const executives: Executive[] = [
    { id: '1', name: 'John Smith', status: 'available', location: 'Office' },
    { id: '2', name: 'Sarah Johnson', status: 'busy', location: 'Conference Room A' },
  ];

  const primaryExecutive = executives[0];

  if (!primaryExecutive) {
    return null;
  }

  const status = statusConfig[primaryExecutive.status];

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center gap-3 rounded-lg px-3 py-2 hover:bg-muted transition-colors"
      >
        {/* Avatar */}
        <div className="relative">
          <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-sm font-medium text-primary">
            {primaryExecutive.name.split(' ').map(n => n[0]).join('')}
          </div>
          <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-card ${status.color}`} />
        </div>

        {/* Info */}
        <div className="flex-1 text-left">
          <p className="text-sm font-medium truncate">{primaryExecutive.name}</p>
          <div className="flex items-center gap-1.5">
            <Circle className={`w-2 h-2 fill-current ${status.color.replace('bg-', 'text-')}`} />
            <span className="text-xs text-muted-foreground">{status.label}</span>
          </div>
        </div>

        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute bottom-full left-0 right-0 z-50 mb-2 rounded-lg border bg-card shadow-lg">
            <div className="p-2">
              <p className="px-2 py-1.5 text-xs font-medium text-muted-foreground uppercase">
                Your Executives
              </p>
              {executives.map((exec) => {
                const execStatus = statusConfig[exec.status];
                return (
                  <button
                    key={exec.id}
                    className="flex w-full items-center gap-3 rounded-lg px-2 py-2 hover:bg-muted transition-colors"
                    onClick={() => setIsOpen(false)}
                  >
                    <div className="relative">
                      <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-xs font-medium text-primary">
                        {exec.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-card ${execStatus.color}`} />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-sm font-medium">{exec.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {execStatus.label}
                        {exec.location && ` • ${exec.location}`}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
