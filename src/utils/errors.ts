// Supabase errors are plain objects (message/details/hint/code), not Error instances.
export function extractError(err: unknown, fallback = 'Something went wrong'): string {
  if (err instanceof Error) return err.message;
  if (err && typeof err === 'object') {
    const e = err as { message?: string; details?: string; hint?: string; code?: string };
    const parts = [e.message, e.details, e.hint, e.code ? `(${e.code})` : ''].filter(Boolean);
    if (parts.length) return parts.join(' — ');
    try { return JSON.stringify(err); } catch { /* ignore */ }
  }
  return fallback;
}
