import { resolveCloudConfig } from './client-config.js';

/** Load the SDK only in explicitly configured cloud mode. No auth credentials in localStorage. */
export async function createCloudClient(config, { storage = globalThis.sessionStorage } = {}) {
  const publicConfig = resolveCloudConfig({ url: config?.supabaseUrl, publishableKey: config?.publishableKey });
  if (!storage?.getItem || !storage?.setItem || !storage?.removeItem) throw Error('Session storage is required for sign-in.');
  if (/^sb_secret_/i.test(publicConfig.publishableKey)) throw Error('A public browser key is required.');
  const { createClient } = await import('@supabase/supabase-js');
  return createClient(publicConfig.url, publicConfig.publishableKey, {
    auth: { flowType: 'pkce', autoRefreshToken: true, persistSession: true,
      detectSessionInUrl: true, storage, storageKey: 'orbit.cloud.auth' },
  });
}
