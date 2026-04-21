import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import crypto from 'crypto';

const webhookSecret = process.env.SUPABASE_WEBHOOK_SECRET!;

interface WebhookPayload {
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  table: string;
  schema: string;
  record: Record<string, unknown> | null;
  old_record: Record<string, unknown> | null;
}

function verifySignature(payload: string, signature: string): boolean {
  const expectedSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(payload)
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

export async function POST(request: Request) {
  const body = await request.text();
  const headersList = await headers();
  const signature = headersList.get('x-supabase-signature');

  // Verify webhook signature in production
  if (process.env.NODE_ENV === 'production' && webhookSecret) {
    if (!signature || !verifySignature(body, signature)) {
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }
  }

  let payload: WebhookPayload;

  try {
    payload = JSON.parse(body);
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON payload' },
      { status: 400 }
    );
  }

  const { type, table, schema, record, old_record } = payload;

  console.log(`Supabase webhook: ${type} on ${schema}.${table}`);

  // Handle different table events
  switch (table) {
    case 'users': {
      if (type === 'INSERT') {
        // TODO: Send welcome email, create default settings
        console.log('New user created:', record?.id);
      } else if (type === 'UPDATE') {
        // TODO: Handle user profile updates
        console.log('User updated:', record?.id);
      } else if (type === 'DELETE') {
        // TODO: Clean up user data, cancel subscriptions
        console.log('User deleted:', old_record?.id);
      }
      break;
    }

    case 'organizations': {
      if (type === 'INSERT') {
        // TODO: Initialize organization defaults, feature flags
        console.log('New organization created:', record?.id);
      } else if (type === 'UPDATE') {
        // TODO: Handle organization updates
        console.log('Organization updated:', record?.id);
      }
      break;
    }

    case 'executive_profiles': {
      if (type === 'INSERT') {
        // TODO: Set up executive defaults, sync calendars
        console.log('New executive profile created:', record?.id);
      }
      break;
    }

    case 'subscriptions': {
      if (type === 'UPDATE') {
        // TODO: Update feature flags based on tier change
        console.log('Subscription updated:', record?.id);
      }
      break;
    }

    default:
      console.log(`Unhandled table: ${table}`);
  }

  return NextResponse.json({ received: true });
}
