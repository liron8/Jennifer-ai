/**
 * Single Executive API Routes
 * GET /api/executives/[id] - Get executive
 * PATCH /api/executives/[id] - Update executive
 * DELETE /api/executives/[id] - Deactivate executive
 */

import type { NextRequest } from 'next/server';
import { withAuth, type AuthContext } from '@/lib/api/middleware';
import {
  successResponse,
  notFoundResponse,
  internalErrorResponse,
  validateBody,
} from '@/lib/api/utils';
import { updateExecutiveSchema } from '@/lib/api/schemas';
import { createClient } from '@/lib/supabase/server';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// ---------------------------------------------------------------------------
// Religion → Holiday mapping for auto-sync
// Returns approximate fixed dates for major holidays per religion.
// Holidays with lunar/variable dates use common approximations.
// ---------------------------------------------------------------------------
interface ReligiousHoliday {
  name: string;
  /** Returns YYYY-MM-DD for the given year */
  getDate: (year: number) => string;
}

function getReligiousHolidays(religion: string): ReligiousHoliday[] {
  const r = religion.toLowerCase().trim();

  const pad = (n: number) => String(n).padStart(2, '0');
  const fmt = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`;

  if (r.includes('christian') || r.includes('catholic') || r.includes('protestant')) {
    return [
      { name: 'Christmas Day', getDate: (y) => fmt(y, 12, 25) },
      { name: 'Good Friday (approx)', getDate: (y) => fmt(y, 3, 29) },
      { name: 'Easter Sunday (approx)', getDate: (y) => fmt(y, 3, 31) },
      { name: 'Ash Wednesday (approx)', getDate: (y) => fmt(y, 2, 14) },
    ];
  }

  if (r.includes('jewish') || r.includes('judaism')) {
    return [
      { name: 'Rosh Hashanah (approx)', getDate: (y) => fmt(y, 9, 16) },
      { name: 'Yom Kippur (approx)', getDate: (y) => fmt(y, 9, 25) },
      { name: 'Hanukkah begins (approx)', getDate: (y) => fmt(y, 12, 7) },
      { name: 'Passover begins (approx)', getDate: (y) => fmt(y, 4, 6) },
    ];
  }

  if (r.includes('muslim') || r.includes('islam')) {
    return [
      { name: 'Eid al-Fitr (approx)', getDate: (y) => fmt(y, 4, 10) },
      { name: 'Eid al-Adha (approx)', getDate: (y) => fmt(y, 6, 17) },
      { name: 'Ramadan begins (approx)', getDate: (y) => fmt(y, 3, 11) },
    ];
  }

  if (r.includes('hindu')) {
    return [
      { name: 'Diwali (approx)', getDate: (y) => fmt(y, 10, 24) },
      { name: 'Holi (approx)', getDate: (y) => fmt(y, 3, 14) },
      { name: 'Navratri begins (approx)', getDate: (y) => fmt(y, 10, 3) },
    ];
  }

  if (r.includes('buddhist') || r.includes('buddhism')) {
    return [
      { name: 'Vesak / Buddha Day (approx)', getDate: (y) => fmt(y, 5, 12) },
      { name: 'Bodhi Day', getDate: (y) => fmt(y, 12, 8) },
    ];
  }

  if (r.includes('sikh')) {
    return [
      { name: 'Vaisakhi', getDate: (y) => fmt(y, 4, 14) },
      { name: 'Guru Nanak Jayanti (approx)', getDate: (y) => fmt(y, 11, 15) },
    ];
  }

  return [];
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
      .from('executive_profiles')
      .select('*')
      .eq('id', id)
      .eq('org_id', context.user.org_id)
      .single();

    if (error || !data) {
      return notFoundResponse('Executive');
    }

    // Fetch related sub-entities in parallel
    const [directReportsResult, familyMembersResult, membershipsResult] = await Promise.all([
      supabase
        .from('direct_reports')
        .select('*')
        .eq('executive_id', id)
        .eq('org_id', context.user.org_id)
        .order('full_name'),
      supabase
        .from('family_members')
        .select('*')
        .eq('executive_id', id)
        .eq('org_id', context.user.org_id)
        .order('full_name'),
      supabase
        .from('memberships')
        .select('*')
        .eq('executive_id', id)
        .eq('org_id', context.user.org_id)
        .order('category', { ascending: true }),
    ]);

    return successResponse({
      data: {
        ...data,
        direct_reports: directReportsResult.data || [],
        family_members: familyMembersResult.data || [],
        memberships: membershipsResult.data || [],
      },
    });
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
    updateExecutiveSchema
  );

  if (validationError) {
    return validationError;
  }

  try {
    const supabase = await createClient();

    const { data: existing } = await supabase
      .from('executive_profiles')
      .select('id')
      .eq('id', id)
      .eq('org_id', context.user.org_id)
      .single();

    if (!existing) {
      return notFoundResponse('Executive');
    }

    // Map schema fields to actual DB columns
    const { phones, main_office_location, office_address, home_address, ...rest } = body;
    const updatePayload: Record<string, unknown> = {
      ...rest,
      updated_at: new Date().toISOString(),
    };
    if (phones !== undefined) {
      const primaryPhone = phones?.find((p: { is_primary?: boolean }) => p.is_primary) || phones?.[0];
      updatePayload.phone = primaryPhone?.number || null;
    }
    if (main_office_location !== undefined) {
      updatePayload.office_location = main_office_location;
    }
    if (office_address !== undefined) {
      updatePayload.office_address = office_address ? JSON.stringify(office_address) : null;
    }
    if (home_address !== undefined) {
      updatePayload.home_address = home_address
        ? (typeof home_address === 'string' ? home_address : JSON.stringify(home_address))
        : null;
    }

    const { data, error } = await supabase
      .from('executive_profiles')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating executive:', error);
      return internalErrorResponse(error.message);
    }

    // Sync religion → holiday key_dates when religion field changes
    if (body.religion !== undefined) {
      try {
        // Remove previous religion-synced holidays for this executive
        await supabase
          .from('key_dates')
          .delete()
          .eq('executive_id', id)
          .eq('category', 'holidays')
          .contains('tags', ['religion-sync'])
          .eq('org_id', context.user.org_id);

        // Insert new holidays if religion is set (narrow: z.preprocess widens inferred type)
        if (
          body.religion === 'Christian' ||
          body.religion === 'Hindu' ||
          body.religion === 'Jewish' ||
          body.religion === 'Muslim'
        ) {
          const holidays = getReligiousHolidays(body.religion);
          if (holidays.length > 0) {
            const year = new Date().getFullYear();
            const holidayRows = holidays.map((h) => ({
              org_id: context.user.org_id,
              executive_id: id,
              title: h.name,
              date: h.getDate(year),
              category: 'holidays' as const,
              is_recurring: true,
              recurrence_rule: 'FREQ=YEARLY',
              reminder_days: [7, 1],
              tags: ['religion-sync'],
            }));
            await supabase.from('key_dates').insert(holidayRows);
          }
        }
      } catch (syncErr) {
        console.error('Religion holiday sync failed:', syncErr);
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

    // Soft delete by deactivating
    const { error } = await supabase
      .from('executive_profiles')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('org_id', context.user.org_id);

    if (error) {
      console.error('Error deactivating executive:', error);
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
