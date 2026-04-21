/**
 * Next.js Instrumentation
 * Runs once when the server starts — used for one-time initialization.
 * See: https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

export async function register() {
  // Only register on the server (not edge runtime)
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { registerAIEventHandlers } = await import('@jeniferai/ai');
    registerAIEventHandlers();
    console.log('[Instrumentation] AI event handlers registered');
  }
}
