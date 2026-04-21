/**
 * Cron: Daily Brief
 * Schedule: 6 AM daily (configured in vercel.json)
 * Generates comprehensive daily briefings for all active executives.
 */

import { NextResponse } from 'next/server';
import { runDailyBriefs } from '@jeniferai/ai';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  // Verify cron secret to prevent unauthorized access
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await runDailyBriefs();
    return NextResponse.json({
      success: true,
      ...result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Cron] Daily brief failed:', error);
    return NextResponse.json(
      { error: 'Daily brief generation failed' },
      { status: 500 }
    );
  }
}
