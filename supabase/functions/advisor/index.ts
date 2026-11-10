import { createClient } from 'npm:@supabase/supabase-js@2.119.0';
import { createAdvisorHandler } from './handler.mjs';

const url = Deno.env.get('SUPABASE_URL');
const secretKeys = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') || '{}');
const serviceKey = secretKeys.default || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const admin = url && serviceKey ? createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
}) : null;

const store = admin && {
  async authenticate(token: string) {
    const { data, error } = await admin.auth.getUser(token);
    const user = data.user;
    return !error && user?.email_confirmed_at && !user.is_anonymous ? user.id : null;
  },
  async get(id: string, owner: string) {
    const { data, error } = await admin.from('ai_requests')
      .select('id,owner_id,context,fingerprint,request_status').eq('id', id).eq('owner_id', owner).maybeSingle();
    if (error) throw error;
    return data;
  },
  async claim(id: string, owner: string) {
    const { data, error } = await admin.rpc('claim_advisor_review', { p_request_id: id, p_owner_id: owner });
    if (error) throw error;
    return data === true;
  },
  async update(row: { id: string; owner_id: string }, from: string, fields: Record<string, unknown>) {
    const { error } = await admin.from('ai_requests').update(fields)
      .eq('id', row.id).eq('owner_id', row.owner_id).eq('request_status', from);
    if (error) throw error;
  },
};

Deno.serve(createAdvisorHandler({
  store,
  apiKey: Deno.env.get('DEEPSEEK_KEY'),
  allowedOrigins: (Deno.env.get('ADVISOR_ALLOWED_ORIGINS') || '').split(',').map(value => value.trim()).filter(Boolean),
  waitUntil: (work: Promise<void>) => EdgeRuntime.waitUntil(work),
}));
