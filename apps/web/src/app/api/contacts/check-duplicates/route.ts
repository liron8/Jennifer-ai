/**
 * Check Duplicate Contacts API
 * POST /api/contacts/check-duplicates
 * Returns which emails already exist in the org's contact directory
 */

import type { NextRequest } from 'next/server';
import { withAuth, type AuthContext } from '@/lib/api/middleware';
import {
  successResponse,
  internalErrorResponse,
  validationErrorResponse,
  parseZodError,
  validateBody,
} from '@/lib/api/utils';
import { checkDuplicatesSchema } from '@/lib/api/schemas';
import { createClient } from '@/lib/supabase/server';

async function handlePost(request: NextRequest, context: AuthContext) {
  const { data: body, error: validationError } = await validateBody(
    request,
    checkDuplicatesSchema,
  );

  if (validationError) {
    return validationError;
  }

  try {
    const supabase = await createClient();

    // Lowercase all emails for case-insensitive matching
    const normalizedEmails = body.emails.map((e) => e.toLowerCase());

    const { data, error } = await supabase
      .from('contacts')
      .select('email')
      .eq('org_id', context.user.org_id)
      .is('deleted_at', null)
      .in('email', normalizedEmails);

    if (error) {
      console.error('Error checking duplicates:', error);
      return internalErrorResponse(error.message);
    }

    const existingEmails = (data || []).map((c: { email: string }) => c.email.toLowerCase());

    return successResponse({ existing_emails: existingEmails });
  } catch (error) {
    console.error('Unexpected error:', error);
    return internalErrorResponse();
  }
}

export const POST = withAuth(handlePost);
