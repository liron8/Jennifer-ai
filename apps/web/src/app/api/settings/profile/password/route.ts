/**
 * Password Change API Route
 * POST /api/settings/profile/password - Change user password
 */

import type { NextRequest } from 'next/server';
import { withAuth, type AuthContext } from '@/lib/api/middleware';
import { successResponse, internalErrorResponse, validateBody } from '@/lib/api/utils';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

const passwordSchema = z.object({
  current_password: z.string().min(1, 'Current password is required'),
  new_password: z.string().min(8, 'Password must be at least 8 characters'),
});

async function handlePost(request: NextRequest, context: AuthContext) {
  const { data: body, error: validationError } = await validateBody(request, passwordSchema);
  if (validationError) return validationError;

  try {
    const supabase = await createClient();

    // Supabase updateUser updates the password for the currently authenticated user
    const { error } = await supabase.auth.updateUser({
      password: body.new_password,
    });

    if (error) {
      console.error('Error changing password:', error);
      return internalErrorResponse(error.message);
    }

    return successResponse({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Unexpected error:', error);
    return internalErrorResponse();
  }
}

export async function POST(request: NextRequest) {
  return withAuth(handlePost)(request);
}
