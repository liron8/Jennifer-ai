/**
 * Organization Logo Upload API Route
 * POST /api/settings/organization/logo - Upload organization logo
 */

import type { NextRequest } from 'next/server';
import { withAdmin, type AuthContext } from '@/lib/api/middleware';
import {
  successResponse,
  internalErrorResponse,
} from '@/lib/api/utils';
import { createClient } from '@/lib/supabase/server';

async function handlePost(request: NextRequest, context: AuthContext) {
  try {
    const formData = await request.formData();
    const file = formData.get('logo') as File | null;

    if (!file) {
      return internalErrorResponse('No file provided');
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      return internalErrorResponse('Invalid file type. Allowed: JPEG, PNG, GIF, WebP, SVG');
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return internalErrorResponse('File too large. Maximum size is 5MB');
    }

    const supabase = await createClient();

    // Generate unique filename
    const ext = file.name.split('.').pop() || 'png';
    const fileName = `${context.user.org_id}/logo.${ext}`;

    // Upload to Supabase Storage
    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    const { error: uploadError } = await supabase.storage
      .from('logos')
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      console.error('Error uploading logo:', uploadError);
      // If bucket doesn't exist, store as data URL fallback
      if (uploadError.message?.includes('not found') || uploadError.message?.includes('Bucket')) {
        const base64 = Buffer.from(arrayBuffer).toString('base64');
        const dataUrl = `data:${file.type};base64,${base64}`;

        const { error: updateError } = await supabase
          .from('organizations')
          .update({
            logo_url: dataUrl,
            updated_at: new Date().toISOString(),
          })
          .eq('id', context.user.org_id);

        if (updateError) {
          console.error('Error updating logo_url:', updateError);
          return internalErrorResponse(updateError.message);
        }

        return successResponse({ data: { logo_url: dataUrl } });
      }
      return internalErrorResponse(uploadError.message);
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('logos')
      .getPublicUrl(fileName);

    const logoUrl = urlData.publicUrl;

    // Update organization with new logo URL
    const { error: updateError } = await supabase
      .from('organizations')
      .update({
        logo_url: logoUrl,
        updated_at: new Date().toISOString(),
      })
      .eq('id', context.user.org_id);

    if (updateError) {
      console.error('Error updating logo_url:', updateError);
      return internalErrorResponse(updateError.message);
    }

    return successResponse({ data: { logo_url: logoUrl } });
  } catch (error) {
    console.error('Unexpected error:', error);
    return internalErrorResponse();
  }
}

export const POST = withAdmin(handlePost);
