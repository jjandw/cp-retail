import { createClient } from '@supabase/supabase-js';
import type { Session } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL?.trim();
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();

export const supabase = url && publishableKey ? createClient(url, publishableKey) : null;
export const cloudEnabled = Boolean(supabase);

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
