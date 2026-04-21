/**
 * AI Generate API Route
 * POST /api/ai/generate — Generate content (briefs, emails, summaries)
 */

import type { NextRequest } from 'next/server';
import { withAuth, type AuthContext } from '@/lib/api/middleware';
import {
  successResponse,
  internalErrorResponse,
  validateBody,
} from '@/lib/api/utils';
import { z } from 'zod';
import { generateMeetingBrief, analyzeForInsights } from '@jeniferai/ai';

const generateRequestSchema = z.object({
  type: z.enum(['meeting_brief', 'email_draft', 'daily_summary', 'weekly_summary', 'analysis']),
  input: z.record(z.unknown()),
  executiveId: z.string().uuid().optional(),
});

async function handlePost(request: NextRequest, context: AuthContext) {
  const { data: body, error: validationError } = await validateBody(
    request,
    generateRequestSchema
  );

  if (validationError) {
    return validationError;
  }

  try {
    const chatOptions = {
      userId: context.user.id,
      orgId: context.user.org_id,
      executiveId: body.executiveId,
      timezone: context.user.timezone,
    };

    let content: string;

    switch (body.type) {
      case 'meeting_brief': {
        const meetingId = body.input.meetingId as string;
        if (!meetingId) {
          return internalErrorResponse('meetingId is required for meeting brief generation');
        }
        content = await generateMeetingBrief(meetingId, chatOptions);
        break;
      }
      case 'analysis': {
        content = await analyzeForInsights(body.input, chatOptions);
        break;
      }
      default: {
        // For daily/weekly summaries and email drafts, route through analysis with type context
        content = await analyzeForInsights(
          { ...body.input, requestType: body.type },
          chatOptions
        );
        break;
      }
    }

    return successResponse({
      data: {
        type: body.type,
        content,
        metadata: {
          generatedAt: new Date().toISOString(),
        },
      },
    });
  } catch (error) {
    console.error('AI generate error:', error);
    return internalErrorResponse('Failed to generate content');
  }
}

export const POST = withAuth(handlePost);
