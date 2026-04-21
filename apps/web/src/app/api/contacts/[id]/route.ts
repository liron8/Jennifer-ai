/**
 * Single Contact API Routes (Pro tier)
 * GET /api/contacts/[id] - Get contact
 * PATCH /api/contacts/[id] - Update contact
 * DELETE /api/contacts/[id] - Delete contact
 */

import type { NextRequest } from 'next/server';
import { withAuth, type AuthContext } from '@/lib/api/middleware';
import {
  successResponse,
  notFoundResponse,
  internalErrorResponse,
  validateBody,
} from '@/lib/api/utils';
import { updateContactSchema } from '@/lib/api/schemas';
import { createClient } from '@/lib/supabase/server';

interface RouteParams {
  params: Promise<{ id: string }>;
}

async function handleGet(
  request: NextRequest,
  context: AuthContext,
  { params }: RouteParams
) {
  const { id } = await params;

  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .eq('id', id)
      .eq('org_id', context.user.org_id)
      .is('deleted_at', null)
      .single();

    if (error || !data) {
      return notFoundResponse('Contact');
    }

    return successResponse({ data });
  } catch (error) {
    console.error('Unexpected error:', error);
    return internalErrorResponse();
  }
}

async function handlePatch(
  request: NextRequest,
  context: AuthContext,
  { params }: RouteParams
) {
  const { id } = await params;

  const { data: body, error: validationError } = await validateBody(
    request,
    updateContactSchema
  );

  if (validationError) {
    return validationError;
  }

  try {
    const supabase = await createClient();

    const { data: existing } = await supabase
      .from('contacts')
      .select('id')
      .eq('id', id)
      .eq('org_id', context.user.org_id)
      .is('deleted_at', null)
      .single();

    if (!existing) {
      return notFoundResponse('Contact');
    }

    // Flatten address object into individual DB columns if present
    const { address, twitter_url, ...rest } = body;
    const updatePayload: Record<string, unknown> = {
      ...rest,
      updated_at: new Date().toISOString(),
    };
    if (address !== undefined) {
      if (address) {
        updatePayload.address_line1 = address.line1;
        updatePayload.address_line2 = address.line2 || null;
        updatePayload.city = address.city;
        updatePayload.state = address.state;
        updatePayload.postal_code = address.postal_code;
        updatePayload.country = address.country;
      } else {
        updatePayload.address_line1 = null;
        updatePayload.address_line2 = null;
        updatePayload.city = null;
        updatePayload.state = null;
        updatePayload.postal_code = null;
        updatePayload.country = null;
      }
    }
    if (twitter_url !== undefined) {
      updatePayload.twitter_handle = twitter_url;
    }

    const { data, error } = await supabase
      .from('contacts')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating contact:', error);
      return internalErrorResponse(error.message);
    }

    // Sync birthday → key_dates when birthday field is in the update payload
    if (body.birthday !== undefined) {
      try {
        // Delete any existing birthday key_date for this contact
        await supabase
          .from('key_dates')
          .delete()
          .eq('related_contact_id', id)
          .eq('category', 'birthdays')
          .eq('org_id', context.user.org_id);

        // Insert new birthday key_date if birthday is set
        if (body.birthday) {
          const contactName = body.full_name || data?.full_name || 'Contact';
          await supabase.from('key_dates').insert({
            org_id: context.user.org_id,
            title: `${contactName}'s Birthday`,
            date: body.birthday,
            category: 'birthdays',
            related_contact_id: id,
            is_recurring: true,
            recurrence_rule: 'FREQ=YEARLY',
            reminder_days: [7, 1],
            tags: [],
          });
        }
      } catch (syncErr) {
        console.error('Birthday sync to key_dates failed:', syncErr);
      }
    }

    return successResponse({ data });
  } catch (error) {
    console.error('Unexpected error:', error);
    return internalErrorResponse();
  }
}

async function handleDelete(
  request: NextRequest,
  context: AuthContext,
  { params }: RouteParams
) {
  const { id } = await params;

  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from('contacts')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .eq('org_id', context.user.org_id);

    if (error) {
      console.error('Error deleting contact:', error);
      return internalErrorResponse(error.message);
    }

    return successResponse({ success: true });
  } catch (error) {
    console.error('Unexpected error:', error);
    return internalErrorResponse();
  }
}

export async function GET(request: NextRequest, routeParams: RouteParams) {
  return withAuth((req, ctx) => handleGet(req, ctx, routeParams))(request);
}

export async function PATCH(request: NextRequest, routeParams: RouteParams) {
  return withAuth((req, ctx) => handlePatch(req, ctx, routeParams))(request);
}

export async function DELETE(request: NextRequest, routeParams: RouteParams) {
  return withAuth((req, ctx) => handleDelete(req, ctx, routeParams))(request);
}
