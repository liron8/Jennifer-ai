/**
 * Avatar Upload API Route
 * POST /api/settings/profile/avatar - Upload user avatar
 */

import type { NextRequest } from 'next/server';
import { withAuth, type AuthContext } from '@/lib/api/middleware';
import {
  successResponse,
  internalErrorResponse,
} from '@/lib/api/utils';
import { createClient } from '@/lib/supabase/server';

async function handlePost(request: NextRequest, context: AuthContext) {
  try {
    const formData = await request.formData();
    const file = formData.get('avatar') as File | null;

    if (!file) {
      return internalErrorResponse('No file provided');
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return internalErrorResponse('Invalid file type. Allowed: JPEG, PNG, GIF, WebP');
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return internalErrorResponse('File too large. Maximum size is 5MB');
    }

    const supabase = await createClient();

    // Generate unique filename
    const ext = file.name.split('.').pop() || 'jpg';
    const fileName = `${context.user.id}/avatar.${ext}`;

    // Upload to Supabase Storage
    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      console.error('Error uploading avatar:', uploadError);
      // If bucket doesn't exist, store as data URL fallback
      if (uploadError.message?.includes('not found') || uploadError.message?.includes('Bucket')) {
        // Convert to base64 data URL as fallback
        const base64 = Buffer.from(arrayBuffer).toString('base64');
        const dataUrl = `data:${file.type};base64,${base64}`;

        const { data, error: updateError } = await supabase
          .from('users')
          .update({
            avatar_url: dataUrl,
            updated_at: new Date().toISOString(),
          })
          .eq('id', context.user.id)
          .select()
          .single();

        if (updateError) {
          console.error('Error updating avatar_url:', updateError);
          return internalErrorResponse(updateError.message);
        }

        return successResponse({ data: { avatar_url: dataUrl } });
      }
      return internalErrorResponse(uploadError.message);
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('avatars')
      .getPublicUrl(fileName);

    const avatarUrl = urlData.publicUrl;

    // Update user profile with new avatar URL
    const { error: updateError } = await supabase
      .from('users')
      .update({
        avatar_url: avatarUrl,
        updated_at: new Date().toISOString(),
      })
      .eq('id', context.user.id);

    if (updateError) {
      console.error('Error updating avatar_url:', updateError);
      return internalErrorResponse(updateError.message);
    }

    return successResponse({ data: { avatar_url: avatarUrl } });
  } catch (error) {
    console.error('Unexpected error:', error);
    return internalErrorResponse();
  }
}

export const POST = withAuth(handlePost);
