/**
 * Cron: Key Date Scanner
 * Schedule: Midnight daily (configured in vercel.json)
 * Scans for upcoming key dates and creates proactive reminders.
 */

import { NextResponse } from 'next/server';
import { runKeyDateScan } from '@jeniferai/ai';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await runKeyDateScan();
    return NextResponse.json({
      success: true,
      ...result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Cron] Key date scan failed:', error);
    return NextResponse.json(
      { error: 'Key date scan failed' },
      { status: 500 }
    );
  }
}
