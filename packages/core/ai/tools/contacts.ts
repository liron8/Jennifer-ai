/**
 * Contact Tools
 * AI tools for contact and relationship management — wired to real Supabase data
 */

import { z } from 'zod';
import { registerTool, type ToolResult } from './index';

const searchContactsParams = z.object({
  query: z.string().min(1).describe('Search term for name, company, or email'),
  category: z.enum(['vip', 'client', 'vendor', 'partner', 'personal', 'colleague', 'other', 'all']).default('all'),
  executiveId: z.string().uuid().optional(),
  limit: z.number().min(1).max(20).default(5),
});

const getContactDetailsParams = z.object({
  contactId: z.string().uuid(),
});

const getContactHistoryParams = z.object({
  contactId: z.string().uuid(),
  includeEmails: z.boolean().default(false),
  includeMeetings: z.boolean().default(true),
  limit: z.number().min(1).max(20).default(10),
});

registerTool({
  name: 'search_contacts',
  description: 'Search for contacts by name, company, or email. Useful for finding attendee information.',
  parameters: searchContactsParams,
  execute: async (params, context): Promise<ToolResult> => {
    const validated = searchContactsParams.parse(params);
    const { supabase, orgId } = context;
    const execId = validated.executiveId || context.executiveId;

    const searchTerm = `%${validated.query}%`;

    let query = supabase
      .from('contacts')
      .select('id, full_name, email, phone, company, title, category, relationship_notes, relationship_strength, last_contacted_at, tags')
      .eq('org_id', orgId)
      .is('deleted_at', null)
      .or(`full_name.ilike.${searchTerm},email.ilike.${searchTerm},company.ilike.${searchTerm}`)
      .limit(validated.limit);

    if (validated.category !== 'all') {
      query = query.eq('category', validated.category);
    }
    if (execId) {
      query = query.eq('executive_id', execId);
    }

    const { data, error } = await query;
    if (error) return { success: false, error: error.message };

    return {
      success: true,
      data: { contacts: data || [], count: data?.length || 0 },
    };
  },
});

registerTool({
  name: 'get_contact_details',
  description: 'Get full details of a contact including preferences and notes.',
  parameters: getContactDetailsParams,
  execute: async (params, context): Promise<ToolResult> => {
    const validated = getContactDetailsParams.parse(params);
    const { supabase, orgId } = context;

    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .eq('id', validated.contactId)
      .eq('org_id', orgId)
      .single();

    if (error) return { success: false, error: error.message };

    return {
      success: true,
      data: { contact: data },
    };
  },
});

registerTool({
  name: 'get_contact_history',
  description: 'Get interaction history with a contact including past meetings and communications.',
  parameters: getContactHistoryParams,
  execute: async (params, context): Promise<ToolResult> => {
    const validated = getContactHistoryParams.parse(params);
    const { supabase, orgId } = context;

    // First get the contact's email for meeting lookup
    const { data: contact } = await supabase
      .from('contacts')
      .select('email, full_name')
      .eq('id', validated.contactId)
      .eq('org_id', orgId)
      .single();

    if (!contact) return { success: false, error: 'Contact not found' };

    const results: Record<string, unknown> = { contact_name: contact.full_name };

    // Get meetings where this contact's email appears in attendees
    if (validated.includeMeetings && contact.email) {
      const { data: meetings } = await supabase
        .from('meetings')
        .select('id, title, start_time, end_time, status, description')
        .eq('org_id', orgId)
        .is('deleted_at', null)
        .contains('attendees', JSON.stringify([{ email: contact.email }]))
        .order('start_time', { ascending: false })
        .limit(validated.limit);

      results.meetings = meetings || [];
      results.meeting_count = (meetings || []).length;
    }

    // Get tasks related to this contact
    const { data: tasks } = await supabase
      .from('tasks')
      .select('id, title, status, due_date')
      .eq('org_id', orgId)
      .eq('related_contact_id', validated.contactId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(5);

    results.related_tasks = tasks || [];

    return {
      success: true,
      data: results,
    };
  },
});

export { searchContactsParams, getContactDetailsParams, getContactHistoryParams };
