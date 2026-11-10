import { createClient } from '@supabase/supabase-js';
import type { Session } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL?.trim();
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();

export const supabase = url && publishableKey ? createClient(url, publishableKey) : null;
export const cloudEnabled = Boolean(supabase);
export const advisorEnabled = cloudEnabled && import.meta.env.VITE_ENABLE_ADVISOR === 'true';

const wakingReviews = new Set<string>();

export async function wakeAdvisorReview(recordId: string) {
  if (!advisorEnabled || !supabase || wakingReviews.has(recordId)) return;
  wakingReviews.add(recordId);
  try {
    await supabase.functions.invoke('advisor', { body: { recordId } });
  } catch {
    // The screen checks the saved row and can wake the same request again.
  } finally {
    wakingReviews.delete(recordId);
  }
}

let authState: { session?: Session | null; recovery: boolean } = { recovery: false };
const authListeners = new Set<() => void>();

supabase?.auth.onAuthStateChange((event, session) => {
  const sameUser = authState.session?.user.id === session?.user.id;
  authState = {
    session,
    recovery: event === 'PASSWORD_RECOVERY' || (event !== 'SIGNED_OUT' && sameUser && authState.recovery),
  };
  for (const listener of authListeners) listener();
});

export const getAuthState = () => authState;
export function subscribeAuth(listener: () => void) {
  authListeners.add(listener);
  return () => { authListeners.delete(listener); };
}
