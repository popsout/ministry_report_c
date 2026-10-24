import type { Entry } from './domain';
import { createClient } from '@supabase/supabase-js';
export const projectUrl = import.meta.env.VITE_SUPABASE_URL;
export const publicKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
export const configured = !!(projectUrl && publicKey && !projectUrl.includes('your-project'));
export const previewMode = import.meta.env.VITE_PREVIEW_MODE === 'true' || new URLSearchParams(window.location.search).get('preview') === '1';
export const cloudEnabled = window.location.protocol !== 'file:' && !new URLSearchParams(window.location.search).has('device') && (import.meta.env.VITE_ENABLE_CLOUD === 'true' || new URLSearchParams(window.location.search).get('cloud') === '1');
export const supabase = configured && cloudEnabled && !previewMode ? createClient(projectUrl, publicKey, { auth: { flowType: 'pkce' } }) : null;

// PostgREST defaults to at most 1,000 rows. Read every page for lifetime totals.
export async function fetchEntries() {
  const entries: Entry[] = [];
  for (let offset = 0; ; offset += 1000) {
    const result = await supabase!.from('service_entries').select('*')
      .order('service_date', { ascending: false }).order('id')
      .range(offset, offset + 999);
    if (result.error) return { data: null, error: result.error };
    entries.push(...result.data as Entry[]);
    if (result.data.length < 1000) return { data: entries, error: null };
  }
}
