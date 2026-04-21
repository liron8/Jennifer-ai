'use client';

import { type ReactNode } from 'react';
import { X, CheckCircle, AlertCircle, AlertTriangle, InfoCircle } from '@untitledui/icons';
import { Button } from '@/components/base/buttons/button';
import { cx } from '@/utils/cx';

export type NotificationColor = 'brand' | 'success' | 'error' | 'warning' | 'gray';

export interface IconNotificationProps {
  title: string;
  description?: string;
  color?: NotificationColor;
  icon?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
  onClose?: () => void;
}

const colorStyles: Record<NotificationColor, { bg: string; icon: string; iconBg: string }> = {
  brand: {
    bg: 'bg-primary border border-secondary shadow-lg',
    icon: 'text-brand-600',
    iconBg: 'bg-brand-100',
  },
  success: {
    bg: 'bg-primary border border-secondary shadow-lg',
    icon: 'text-success-primary',
    iconBg: 'bg-success-primary/10',
  },
  error: {
    bg: 'bg-primary border border-secondary shadow-lg',
    icon: 'text-error-primary',
    iconBg: 'bg-error-primary/10',
  },
  warning: {
    bg: 'bg-primary border border-secondary shadow-lg',
    icon: 'text-warning-primary',
    iconBg: 'bg-warning-primary/10',
  },
  gray: {
    bg: 'bg-primary border border-secondary shadow-lg',
    icon: 'text-tertiary',
    iconBg: 'bg-secondary',
  },
};

const defaultIcons: Record<NotificationColor, ReactNode> = {
  brand: <InfoCircle className="h-5 w-5" />,
  success: <CheckCircle className="h-5 w-5" />,
  error: <AlertCircle className="h-5 w-5" />,
  warning: <AlertTriangle className="h-5 w-5" />,
  gray: <InfoCircle className="h-5 w-5" />,
};

export function IconNotification({
  title,
  description,
  color = 'gray',
  icon,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  onClose,
}: IconNotificationProps) {
  const styles = colorStyles[color];
  const displayIcon = icon ?? defaultIcons[color];

  return (
    <div className={cx('rounded-xl p-4 w-full max-w-sm', styles.bg)}>
      <div className="flex gap-3">
        <div className={cx('flex h-10 w-10 shrink-0 items-center justify-center rounded-full', styles.iconBg)}>
          <span className={styles.icon}>{displayIcon}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-primary truncate">{title}</p>
              {description && (
                <p className="mt-1 text-sm text-tertiary line-clamp-2">{description}</p>
              )}
            </div>
            {onClose && (
              <button
                onClick={onClose}
                className="shrink-0 p-1 text-quaternary hover:text-tertiary transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          {(confirmLabel || cancelLabel) && (
            <div className="mt-3 flex gap-3">
              {cancelLabel && (
                <Button onClick={onCancel} color="tertiary" size="sm">
                  {cancelLabel}
                </Button>
              )}
              {confirmLabel && (
                <Button onClick={onConfirm} color="link-color" size="sm">
                  {confirmLabel}
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
