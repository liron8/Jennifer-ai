/**
 * Cron: Pattern Analysis
 * Schedule: Weekly, Sunday 8 PM (configured in vercel.json)
 * Analyzes historical data to discover scheduling, task, and approval patterns.
 */

import { NextResponse } from 'next/server';
import { runPatternAnalysis } from '@jeniferai/ai';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await runPatternAnalysis();
    return NextResponse.json({
      success: true,
      ...result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Cron] Pattern analysis failed:', error);
    return NextResponse.json(
      { error: 'Pattern analysis failed' },
      { status: 500 }
    );
  }
}
