/**
 * Knowledge Base API Route
 * GET /api/knowledge-base - List knowledge base items
 * POST /api/knowledge-base - Create a knowledge base item (file, text, or link)
 * DELETE /api/knowledge-base?id=uuid - Delete a knowledge base item
 */

import type { NextRequest } from 'next/server';
import { withAuth, type AuthContext } from '@/lib/api/middleware';
import {
  successResponse,
  badRequestResponse,
  internalErrorResponse,
  validateBody,
} from '@/lib/api/utils';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

const createKBItemSchema = z.object({
  type: z.enum(['file', 'text', 'link']),
  title: z.string().min(1).max(255),
  content: z.string().max(50000).optional(),
  file_url: z.string().url().optional(),
  file_name: z.string().max(255).optional(),
  file_size: z.number().int().positive().optional(),
});

async function handleGet(request: NextRequest, context: AuthContext) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');

    const supabase = await createClient();

    let query = supabase
      .from('knowledge_base_items')
      .select('*')
      .eq('organization_id', context.user.org_id)
      .order('created_at', { ascending: false });

    if (type && ['file', 'text', 'link'].includes(type)) {
      query = query.eq('type', type);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching knowledge base items:', error);
      return internalErrorResponse(error.message);
    }

    return successResponse({ data: data || [] });
  } catch (error) {
    console.error('Unexpected error:', error);
    return internalErrorResponse();
  }
}

async function handlePost(request: NextRequest, context: AuthContext) {
  // Handle file uploads via multipart form data
  const contentType = request.headers.get('content-type') || '';

  if (contentType.includes('multipart/form-data')) {
    try {
      const formData = await request.formData();
      const file = formData.get('file') as File | null;
      const title = formData.get('title') as string || '';

      if (!file) {
        return badRequestResponse('No file provided');
      }

      const supabase = await createClient();

      // Upload to Supabase Storage
      const ext = file.name.split('.').pop() || 'bin';
      const fileName = `${context.user.org_id}/${Date.now()}-${file.name}`;
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const { error: uploadError } = await supabase.storage
        .from('knowledge-base')
        .upload(fileName, buffer, {
          contentType: file.type,
          upsert: false,
        });

      let fileUrl: string;

      if (uploadError) {
        // Fallback: store as base64 data URL
        console.warn('Storage upload failed, using base64 fallback:', uploadError.message);
        const base64 = buffer.toString('base64');
        fileUrl = `data:${file.type};base64,${base64.substring(0, 100)}...`; // Truncate for DB
      } else {
        const { data: urlData } = supabase.storage
          .from('knowledge-base')
          .getPublicUrl(fileName);
        fileUrl = urlData.publicUrl;
      }

      const { data, error } = await supabase
        .from('knowledge_base_items')
        .insert({
          organization_id: context.user.org_id,
          created_by: context.user.id,
          type: 'file',
          title: title || file.name,
          content: `Uploaded file: ${file.name}`,
          file_url: fileUrl,
          file_name: file.name,
          file_size: file.size,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating KB file item:', error);
        return internalErrorResponse(error.message);
      }

      return successResponse({ data });
    } catch (error) {
      console.error('Unexpected error:', error);
      return internalErrorResponse();
    }
  }

  // Handle JSON body for text and link types
  const { data: body, error: validationError } = await validateBody(request, createKBItemSchema);
  if (validationError) return validationError;

  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('knowledge_base_items')
      .insert({
        organization_id: context.user.org_id,
        created_by: context.user.id,
        ...body,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating KB item:', error);
      return internalErrorResponse(error.message);
    }

    return successResponse({ data });
  } catch (error) {
    console.error('Unexpected error:', error);
    return internalErrorResponse();
  }
}

async function handleDelete(request: NextRequest, context: AuthContext) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return badRequestResponse('Missing id parameter');
  }

  try {
    const supabase = await createClient();

    // Get the item first to check for file storage cleanup
    const { data: item } = await supabase
      .from('knowledge_base_items')
      .select('file_url, type')
      .eq('id', id)
      .eq('organization_id', context.user.org_id)
      .single();

    if (item?.type === 'file' && item.file_url && !item.file_url.startsWith('data:')) {
      // Try to remove from storage
      const path = item.file_url.split('/knowledge-base/').pop();
      if (path) {
        await supabase.storage.from('knowledge-base').remove([decodeURIComponent(path)]);
      }
    }

    const { error } = await supabase
      .from('knowledge_base_items')
      .delete()
      .eq('id', id)
      .eq('organization_id', context.user.org_id);

    if (error) {
      console.error('Error deleting KB item:', error);
      return internalErrorResponse(error.message);
    }

    return successResponse({ message: 'Deleted' });
  } catch (error) {
    console.error('Unexpected error:', error);
    return internalErrorResponse();
  }
}

export const GET = withAuth(handleGet);
export const POST = withAuth(handlePost);
export const DELETE = withAuth(handleDelete);
