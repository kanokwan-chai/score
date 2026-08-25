// src/instrumentation.ts
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { ensureDbSynced } = await import('./lib/db');
    await ensureDbSynced();
  }
}
