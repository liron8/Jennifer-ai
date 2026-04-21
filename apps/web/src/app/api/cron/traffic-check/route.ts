/**
 * Cron: Traffic Check
 * Schedule: Every 30 minutes (configured in vercel.json)
 * Checks real-time traffic for upcoming in-person meetings.
 */

import { NextResponse } from 'next/server';
import { runTrafficCheck } from '@jeniferai/ai';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await runTrafficCheck();
    return NextResponse.json({
      success: true,
      ...result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Cron] Traffic check failed:', error);
    return NextResponse.json(
      { error: 'Traffic check failed' },
      { status: 500 }
    );
  }
}
