/** Future integration contract: this does not initialize the cloud or authenticate a user. */
export function resolveCloudConfig({ url, publishableKey } = {}) {
  if (!url || !publishableKey) throw new Error('Cloud disabled: both URL and publishable key are required.');
  const parsed=new URL(String(url));
  if (parsed.protocol !== 'https:' && !(parsed.protocol === 'http:' && ['127.0.0.1','localhost'].includes(parsed.hostname))) {
    throw new Error('Cloud URL must be HTTPS outside local development.');
  }
  if (!String(publishableKey).trim()) throw new Error('Missing publishable key.');
  return { url:parsed.origin, publishableKey:String(publishableKey).trim(),
    auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true} };
}
// Future Codex milestone: import { createClient } from '@supabase/supabase-js',
// inject a build-generated public config, then call createClient(...).
// NEVER accept a secret/service-role key in a browser configuration.
