'use client';

import { toast } from 'sonner';
import type { NotificationColor } from '@/components/application/notifications';

interface NotifyOptions {
  title: string;
  description?: string;
  duration?: number;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
}

function showNotification(color: NotificationColor, options: NotifyOptions) {
  const { title, description, duration = 5000 } = options;
  
  const toastOptions: Parameters<typeof toast>[1] = {
    duration,
    className: getToastClassName(color),
  };

  switch (color) {
    case 'success':
      return toast.success(title, { ...toastOptions, description });
    case 'error':
      return toast.error(title, { ...toastOptions, description, duration: 7000 });
    case 'warning':
      return toast.warning(title, { ...toastOptions, description });
    default:
      return toast(title, { ...toastOptions, description });
  }
}

function getToastClassName(color: NotificationColor): string {
  const baseClass = 'group toast';
  switch (color) {
    case 'success':
      return `${baseClass} group-[.toaster]:bg-success-primary/10 group-[.toaster]:text-success-primary group-[.toaster]:border-success-primary/20`;
    case 'error':
      return `${baseClass} group-[.toaster]:bg-error-primary/10 group-[.toaster]:text-error-primary group-[.toaster]:border-error-primary/20`;
    case 'warning':
      return `${baseClass} group-[.toaster]:bg-warning-primary/10 group-[.toaster]:text-warning-primary group-[.toaster]:border-warning-primary/20`;
    case 'brand':
      return `${baseClass} group-[.toaster]:bg-brand-50 group-[.toaster]:text-brand-700 group-[.toaster]:border-brand-200`;
    default:
      return baseClass;
  }
}

export const notify = {
  success: (title: string, description?: string) => 
    showNotification('success', { title, description }),
  
  error: (title: string, description?: string) => 
    showNotification('error', { title, description, duration: 7000 }),
  
  warning: (title: string, description?: string) => 
    showNotification('warning', { title, description }),
  
  info: (title: string, description?: string) => 
    showNotification('brand', { title, description }),
  
  custom: (color: NotificationColor, options: NotifyOptions) => 
    showNotification(color, options),

  promise: <T,>(
    promise: Promise<T>,
    options: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((error: Error) => string);
    }
  ) => {
    return toast.promise(promise, {
      loading: options.loading,
      success: (data) => typeof options.success === 'function' ? options.success(data) : options.success,
      error: (err) => typeof options.error === 'function' ? options.error(err) : options.error,
    });
  },

  dismiss: (id?: string | number) => toast.dismiss(id),
  
  dismissAll: () => toast.dismiss(),
};

export const authNotifications = {
  loginSuccess: () => notify.success('Welcome back!', 'You have successfully logged in.'),
  
  loginError: (message?: string) => 
    notify.error('Login failed', message || 'Please check your credentials and try again.'),
  
  signupSuccess: () => 
    notify.success('Account created!', 'Please check your email to verify your account.'),
  
  signupError: (message?: string) => 
    notify.error('Signup failed', message || 'There was a problem creating your account.'),
  
  emailExists: () => 
    notify.error('Email already exists', 'An account with this email already exists. Try logging in instead.'),
  
  invalidCredentials: () => 
    notify.error('Invalid credentials', 'The email or password you entered is incorrect.'),
  
  passwordTooWeak: () => 
    notify.error('Password too weak', 'Please use at least 8 characters with a mix of letters and numbers.'),
  
  sessionExpired: () => 
    notify.warning('Session expired', 'Please log in again to continue.'),
  
  logoutSuccess: () => 
    notify.success('Logged out', 'You have been successfully logged out.'),
};

export const dataNotifications = {
  saveSuccess: (item?: string) => 
    notify.success('Saved successfully', item ? `${item} has been saved.` : 'Your changes have been saved.'),
  
  saveError: (item?: string) => 
    notify.error('Save failed', item ? `Failed to save ${item}. Please try again.` : 'Failed to save. Please try again.'),
  
  deleteSuccess: (item?: string) => 
    notify.success('Deleted', item ? `${item} has been deleted.` : 'Item has been deleted.'),
  
  deleteError: (item?: string) => 
    notify.error('Delete failed', item ? `Failed to delete ${item}.` : 'Failed to delete. Please try again.'),
  
  uploadSuccess: (filename?: string) => 
    notify.success('Upload complete', filename ? `${filename} has been uploaded.` : 'File uploaded successfully.'),
  
  uploadError: (message?: string) => 
    notify.error('Upload failed', message || 'There was a problem uploading your file.'),
  
  loadError: (item?: string) => 
    notify.error('Failed to load', item ? `Could not load ${item}.` : 'Could not load data. Please refresh the page.'),
  
  networkError: () => 
    notify.error('Network error', 'Please check your internet connection and try again.'),
  
  validationError: (message: string) => 
    notify.error('Validation error', message),
};

export const teamNotifications = {
  inviteSent: (email: string) => 
    notify.success('Invitation sent', `An invitation has been sent to ${email}.`),
  
  inviteError: (message?: string) => 
    notify.error('Invitation failed', message || 'Could not send the invitation. Please try again.'),
  
  memberRemoved: (name: string) => 
    notify.success('Member removed', `${name} has been removed from the team.`),
  
  roleUpdated: (name: string, role: string) => 
    notify.success('Role updated', `${name} is now a ${role}.`),
};
