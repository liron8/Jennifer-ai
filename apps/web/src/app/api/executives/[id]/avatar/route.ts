/**
 * Executive Avatar Upload API Route
 * POST /api/executives/[id]/avatar - Upload executive avatar
 */

import type { NextRequest } from 'next/server';
import { withAuth, type AuthContext } from '@/lib/api/middleware';
import {
  successResponse,
  notFoundResponse,
  internalErrorResponse,
} from '@/lib/api/utils';
import { createClient } from '@/lib/supabase/server';

interface RouteParams {
  params: Promise<{ id: string }>;
}

async function handlePost(
  request: NextRequest,
  context: AuthContext,
  { params }: RouteParams
) {
  const { id } = await params;

  try {
    const formData = await request.formData();
    const file = formData.get('avatar') as File | null;

    if (!file) {
      return internalErrorResponse('No file provided');
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return internalErrorResponse('Invalid file type. Allowed: JPEG, PNG, GIF, WebP');
    }

    if (file.size > 5 * 1024 * 1024) {
      return internalErrorResponse('File too large. Maximum size is 5MB');
    }

    const supabase = await createClient();

    // Verify executive belongs to this org
    const { data: existing } = await supabase
      .from('executive_profiles')
      .select('id')
      .eq('id', id)
      .eq('org_id', context.user.org_id)
      .single();

    if (!existing) {
      return notFoundResponse('Executive');
    }

    const ext = file.name.split('.').pop() || 'jpg';
    const fileName = `executives/${id}/avatar.${ext}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      console.error('Error uploading executive avatar:', uploadError);
      // Fallback to base64 data URL if bucket doesn't exist
      if (uploadError.message?.includes('not found') || uploadError.message?.includes('Bucket')) {
        const base64 = Buffer.from(arrayBuffer).toString('base64');
        const dataUrl = `data:${file.type};base64,${base64}`;

        const { error: updateError } = await supabase
          .from('executive_profiles')
          .update({ avatar_url: dataUrl, updated_at: new Date().toISOString() })
          .eq('id', id)
          .eq('org_id', context.user.org_id);

        if (updateError) return internalErrorResponse(updateError.message);
        return successResponse({ data: { avatar_url: dataUrl } });
      }
      return internalErrorResponse(uploadError.message);
    }

    const { data: urlData } = supabase.storage
      .from('avatars')
      .getPublicUrl(fileName);

    const avatarUrl = urlData.publicUrl;

    const { error: updateError } = await supabase
      .from('executive_profiles')
      .update({ avatar_url: avatarUrl, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('org_id', context.user.org_id);

    if (updateError) return internalErrorResponse(updateError.message);

    return successResponse({ data: { avatar_url: avatarUrl } });
  } catch (error) {
    console.error('Unexpected error:', error);
    return internalErrorResponse();
  }
}

export async function POST(request: NextRequest, routeParams: RouteParams) {
  return withAuth((req, ctx) => handlePost(req, ctx, routeParams))(request);
}
