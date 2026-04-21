/**
 * Auth Layout
 * Simple wrapper for authentication pages - the page handles its own layout
 */

import type { ReactNode } from 'react';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
