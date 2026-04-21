/**
 * Insight Tools
 * AI tools for proactive insights and analysis
 */

import { z } from 'zod';
import { registerTool, type ToolResult } from './index';

const getInsightsParams = z.object({
  type: z.enum(['conflict', 'reminder', 'suggestion', 'optimization', 'all']).default('all'),
  executiveId: z.string().uuid().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent', 'all']).default('all'),
  limit: z.number().min(1).max(20).default(5),
});

const analyzeScheduleParams = z.object({
  date: z.string().describe('Date to analyze (YYYY-MM-DD)'),
  executiveId: z.string().uuid().optional(),
  checkConflicts: z.boolean().default(true),
  checkTravelTime: z.boolean().default(true),
  suggestOptimizations: z.boolean().default(true),
});

const getKeyDatesParams = z.object({
  daysAhead: z.number().min(1).max(90).default(30),
  category: z.enum(['birthday', 'anniversary', 'deadline', 'milestone', 'travel', 'financial', 'all']).default('all'),
  executiveId: z.string().uuid().optional(),
});

registerTool({
  name: 'get_insights',
  description: 'Retrieve AI-generated insights and recommendations.',
  parameters: getInsightsParams,
  execute: async (params, context): Promise<ToolResult> => {
    const validated = getInsightsParams.parse(params);
    return {
      success: true,
      data: { message: 'Insights retrieved', params: validated },
    };
  },
});

registerTool({
  name: 'analyze_schedule',
  description: 'Analyze a day schedule for conflicts, travel time issues, and optimization opportunities.',
  parameters: analyzeScheduleParams,
  execute: async (params, context): Promise<ToolResult> => {
    const validated = analyzeScheduleParams.parse(params);
    return {
      success: true,
      data: { 
        message: 'Schedule analyzed', 
        date: validated.date,
        analysis: {
          conflicts: [],
          travelIssues: [],
          suggestions: [],
        },
      },
    };
  },
});

registerTool({
  name: 'get_key_dates',
  description: 'Get upcoming important dates like birthdays, anniversaries, and deadlines.',
  parameters: getKeyDatesParams,
  execute: async (params, context): Promise<ToolResult> => {
    const validated = getKeyDatesParams.parse(params);
    return {
      success: true,
      data: { message: 'Key dates retrieved', params: validated },
    };
  },
});

export { getInsightsParams, analyzeScheduleParams, getKeyDatesParams };
