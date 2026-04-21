/**
 * Database Client
 * Supabase client configuration for server and client usage
 */

import { createBrowserClient, createServerClient as createSSRServerClient } from '@supabase/ssr';

import type { Database } from './database.types';

/**
 * Create a Supabase client for browser usage
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

/**
 * Create a Supabase client for server usage (Server Components, Route Handlers)
 */
export function createServerClient(
  cookieStore: {
    get: (name: string) => { value: string } | undefined;
    set: (name: string, value: string, options?: Record<string, unknown>) => void;
    delete: (name: string) => void;
  }
) {
  return createSSRServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: Record<string, unknown>) {
          try {
            cookieStore.set(name, value, options);
          } catch {
            // Handle cookies in Server Components
          }
        },
        remove(name: string, _options: Record<string, unknown>) {
          try {
            cookieStore.delete(name);
          } catch {
            // Handle cookies in Server Components
          }
        },
      },
    }
  );
}

/**
 * Create a Supabase admin client with service role key
 * WARNING: Only use on server-side, never expose to client
 */
export function createAdminClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}
