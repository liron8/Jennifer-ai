/**
 * Profile Settings API Route
 * GET /api/settings/profile - Get user profile
 * PATCH /api/settings/profile - Update user profile
 */

import type { NextRequest } from 'next/server';
import { withAuth, type AuthContext } from '@/lib/api/middleware';
import {
  successResponse,
  internalErrorResponse,
  validateBody,
} from '@/lib/api/utils';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import type { Json } from '@jeniferai/core-database/src/database.types';
import { RELIGION_HOLIDAYS, RELIGION_OPTIONS, type Religion } from '@/lib/religion-key-dates';

const religionSchema = z.enum(RELIGION_OPTIONS);

const emergencyContactSchema = z.object({
  name: z.string().min(1).max(255),
  relationship: z.string().max(255).optional(),
  phone: z.string().max(50).optional(),
  email: z.string().email().optional(),
  address: z.string().max(500).optional(),
});

const updateProfileSchema = z.object({
  full_name: z.string().min(1).max(255).optional(),
  avatar_url: z.string().url().optional().nullable(),
  timezone: z.string().optional(),
  job_title: z.string().max(255).optional().nullable(),
  phone: z.string().max(50).optional().nullable(),
  phone_extension: z.string().max(20).optional().nullable(),
  secondary_email: z.string().email().optional().nullable(),
  secondary_phone: z.string().max(50).optional().nullable(),
  additional_office_address: z.string().max(500).optional().nullable(),
  religion: religionSchema.optional().nullable(),
  emergency_contacts: z.array(emergencyContactSchema).max(2).optional(),
  preferences: z.object({
    theme: z.enum(['light', 'dark', 'system']).optional(),
    notifications: z.object({
      email: z.boolean().optional(),
      push: z.boolean().optional(),
      slack: z.boolean().optional(),
    }).optional(),
    default_executive_id: z.string().uuid().optional().nullable(),
  }).optional(),
});

type EmergencyContact = z.infer<typeof emergencyContactSchema>;

function getProfileExtras(preferences: Json | null | undefined): {
  secondary_email: string | null;
  secondary_phone: string | null;
  additional_office_address: string | null;
  religion: Religion | null;
  emergency_contacts: EmergencyContact[];
} {
  const prefs = (preferences || {}) as Record<string, unknown>;
  const profile = (prefs.profile || {}) as Record<string, unknown>;
  const contacts = Array.isArray(profile.emergency_contacts)
    ? (profile.emergency_contacts as EmergencyContact[])
    : [];
  const religion = profile.religion;
  return {
    secondary_email: typeof profile.secondary_email === 'string' ? profile.secondary_email : null,
    secondary_phone: typeof profile.secondary_phone === 'string' ? profile.secondary_phone : null,
    additional_office_address:
      typeof profile.additional_office_address === 'string' ? profile.additional_office_address : null,
    religion: RELIGION_OPTIONS.includes(religion as Religion) ? (religion as Religion) : null,
    emergency_contacts: contacts.slice(0, 2),
  };
}

async function syncEmergencyContactsToContacts(
  userId: string,
  orgId: string,
  emergencyContacts: EmergencyContact[],
) {
  const supabase = await createClient();
  const existing = await supabase
    .from('contacts')
    .select('id, preferences, tags')
    .eq('org_id', orgId)
    .eq('created_by', userId)
    .eq('category', 'personal')
    .is('deleted_at', null);

  if (existing.error) {
    console.error('Failed to fetch contacts for emergency sync:', existing.error);
    return;
  }

  const existingEmergency = (existing.data || []).filter((row) => {
    const prefs = (row.preferences || {}) as Record<string, unknown>;
    return prefs.source === 'profile_emergency_contact' && typeof prefs.emergency_contact_index === 'number';
  });

  for (let index = 0; index < emergencyContacts.length; index += 1) {
    const entry = emergencyContacts[index];
    const matched = existingEmergency.find((row) => {
      const prefs = (row.preferences || {}) as Record<string, unknown>;
      return prefs.emergency_contact_index === index;
    });
    const tags = ['emergency-contact', entry.relationship || 'emergency']
      .filter(Boolean)
      .map((v) => String(v).toLowerCase());
    const payload = {
      full_name: entry.name,
      email: entry.email || null,
      phone: entry.phone || null,
      address_line1: entry.address || null,
      category: 'personal',
      relationship_notes: entry.relationship || null,
      tags,
      preferences: {
        source: 'profile_emergency_contact',
        emergency_contact_index: index,
        relationship: entry.relationship || null,
      },
      updated_at: new Date().toISOString(),
    };

    if (matched) {
      const { error } = await supabase.from('contacts').update(payload).eq('id', matched.id);
      if (error) console.error('Failed updating emergency contact link:', error);
    } else {
      const { error } = await supabase.from('contacts').insert({
        ...payload,
        org_id: orgId,
        created_by: userId,
      });
      if (error) console.error('Failed creating emergency contact link:', error);
    }
  }

  // If an emergency slot was removed, keep the contact but remove emergency metadata/tag.
  const activeIndices = new Set(emergencyContacts.map((_, index) => index));
  for (const row of existingEmergency) {
    const prefs = (row.preferences || {}) as Record<string, unknown>;
    const idx = prefs.emergency_contact_index as number;
    if (!activeIndices.has(idx)) {
      const tags = Array.isArray(row.tags) ? row.tags.filter((t) => t !== 'emergency-contact') : [];
      const nextPrefs = { ...prefs, source: 'profile_contact', emergency_contact_index: null };
      const { error } = await supabase
        .from('contacts')
        .update({ preferences: nextPrefs, tags, updated_at: new Date().toISOString() })
        .eq('id', row.id);
      if (error) console.error('Failed demoting removed emergency contact:', error);
    }
  }
}

async function syncReligionKeyDatesForUser(
  userId: string,
  orgId: string,
  religion: Religion | null,
) {
  if (!religion) return;
  const supabase = await createClient();
  const holidays = RELIGION_HOLIDAYS[religion] || [];
  if (!holidays.length) return;

  const { data: existing, error } = await supabase
    .from('key_dates')
    .select('title, date')
    .eq('org_id', orgId)
    .eq('created_by', userId)
    .eq('category', 'holidays')
    .contains('tags', ['religious']);

  if (error) {
    console.error('Failed loading existing religious key dates:', error);
    return;
  }

  const existingSet = new Set((existing || []).map((row) => `${row.title}|${row.date}`));
  const toInsert = holidays
    .filter((h) => !existingSet.has(`${h.title}|${h.date}`))
    .map((h) => ({
      org_id: orgId,
      created_by: userId,
      title: h.title,
      description: `${religion} holiday`,
      date: h.date,
      category: 'holidays',
      is_recurring: false,
      tags: ['religious', `religion:${religion.toLowerCase()}`],
      related_person: 'Personal',
    }));

  if (!toInsert.length) return;
  const { error: insertError } = await supabase.from('key_dates').insert(toInsert);
  if (insertError) {
    console.error('Failed inserting religion key dates:', insertError);
  }
}

async function handleGet(request: NextRequest, context: AuthContext) {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', context.user.id)
      .single();

    if (error) {
      console.error('Error fetching profile:', error);
      return internalErrorResponse(error.message);
    }

    const extras = getProfileExtras(data?.preferences);
    return successResponse({
      data: {
        ...data,
        ...extras,
      },
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return internalErrorResponse();
  }
}

async function handlePatch(request: NextRequest, context: AuthContext) {
  const { data: body, error: validationError } = await validateBody(
    request,
    updateProfileSchema
  );

  if (validationError) {
    return validationError;
  }

  try {
    const supabase = await createClient();

    const { data: existingUser } = await supabase
      .from('users')
      .select('preferences, org_id')
      .eq('id', context.user.id)
      .single();

    const currentPreferences = ((existingUser?.preferences || {}) as Record<string, unknown>);
    const currentProfilePrefs = ((currentPreferences.profile || {}) as Record<string, unknown>);

    const nextProfilePrefs: Record<string, unknown> = {
      ...currentProfilePrefs,
    };
    if (body.secondary_email !== undefined) nextProfilePrefs.secondary_email = body.secondary_email;
    if (body.secondary_phone !== undefined) nextProfilePrefs.secondary_phone = body.secondary_phone;
    if (body.additional_office_address !== undefined) {
      nextProfilePrefs.additional_office_address = body.additional_office_address;
    }
    if (body.religion !== undefined) nextProfilePrefs.religion = body.religion;
    if (body.emergency_contacts !== undefined) nextProfilePrefs.emergency_contacts = body.emergency_contacts;

    const mergedPreferences = {
      ...currentPreferences,
      profile: nextProfilePrefs,
    };

    const {
      secondary_email: _secondaryEmail,
      secondary_phone: _secondaryPhone,
      additional_office_address: _additionalOfficeAddress,
      religion,
      emergency_contacts,
      ...dbBody
    } = body;

    const { data, error } = await supabase
      .from('users')
      .update({
        ...dbBody,
        preferences: mergedPreferences,
        updated_at: new Date().toISOString(),
      })
      .eq('id', context.user.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating profile:', error);
      return internalErrorResponse(error.message);
    }

    await syncEmergencyContactsToContacts(
      context.user.id,
      context.user.org_id,
      emergency_contacts || ((nextProfilePrefs.emergency_contacts as EmergencyContact[]) || []),
    );
    await syncReligionKeyDatesForUser(
      context.user.id,
      context.user.org_id,
      (religion === undefined ? (nextProfilePrefs.religion as Religion | null) : religion) || null,
    );

    const extras = getProfileExtras(data?.preferences);
    return successResponse({ data: { ...data, ...extras } });
  } catch (error) {
    console.error('Unexpected error:', error);
    return internalErrorResponse();
  }
}

export const GET = withAuth(handleGet);
export const PATCH = withAuth(handlePatch);
