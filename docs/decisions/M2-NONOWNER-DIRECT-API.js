// Paste this entire expression into DevTools on the exact protected preview,
// AFTER signing in as the existing temporary NONOWNER. No credential copying.
// Only GET/HEAD and two read-only RPC calls are made. No mutation RPCs are called.
// Share only the returned summary; never share Network headers, HARs or sessions.
(async () => {
  const expectedOrigin = 'https://orbit-cuknyrum7-doorbloxs-projects.vercel.app';
  const expectedApi = 'https://ixfgavgtwuzdgucjriec.supabase.co';
  const owner = '20daa320-348a-4991-a844-f27569dbc2b3';
  const blocked = reason => ({ verdict: 'BLOCKED', reason });
  if (location.origin !== expectedOrigin) return blocked('Wrong preview origin');
  try {
    const { runtimeConfig: config } = await import('/src/runtime-config.js');
    if (config?.supabaseUrl !== expectedApi || config.publicRelease !== false) {
      return blocked('Unexpected runtime project or public-release setting');
    }
    // Match src/cloud/client.js's existing sessionStorage key. Reading locally
    // avoids SDK getSession(), which can refresh an expired session over HTTP.
    const session = JSON.parse(sessionStorage.getItem('orbit.cloud.auth') || 'null');
    const token = session?.access_token;
    if (typeof token !== 'string' || !token) {
      return blocked('Sign in with the existing nonowner account first');
    }
    if (!Number.isFinite(session.expires_at) || session.expires_at * 1000 <= Date.now()) {
      return blocked('Existing session expired; this test will not refresh it');
    }
    // Credentials remain inside this invocation and are sent only to the pinned
    // development Supabase origin. Never include them in the returned summary.
    const headers = { apikey: config.publishableKey, Authorization: `Bearer ${token}` };
    const request = (path, options = {}) => fetch(expectedApi + path, {
      ...options, headers: { ...headers, ...options.headers },
      credentials: 'omit', redirect: 'error', cache: 'no-store',
      signal: AbortSignal.timeout(20000),
    });
    const identityResponse = await request('/auth/v1/user');
    if (!identityResponse.ok) return blocked('Live Auth identity verification failed');
    const user = await identityResponse.json();
    if (typeof user.id !== 'string' || !user.id || user.id === owner || user.is_anonymous === true) {
      return blocked('An authenticated nonowner account is required; owner/anonymous session refused');
    }
    const checks = [];
    const codeOf = body => typeof body?.code === 'string' && /^[A-Z0-9]{5,12}$/.test(body.code)
      ? body.code : null;
    for (const rpc of ['orbit_owner_access', 'load_owner_snapshot']) {
      const response = await request('/rest/v1/rpc/' + rpc, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}',
      });
      const body = await response.json().catch(() => null);
      const code = codeOf(body);
      const passed = rpc === 'orbit_owner_access'
        ? response.ok && body === false
        : response.status === 403 && code === '42501';
      checks.push({ check: rpc, passed, status: response.status, code });
      // Do not expose a snapshot body if an unexpected authorization leak occurs.
    }
    const columns = {
      profiles: 'user_id', branches: 'id', tasks: 'id', journal_entries: 'id',
      milestones: 'id', widget_layouts: 'widget_key', preferences: 'owner_id',
      published_content: 'id',
    };
    for (const [table, column] of Object.entries(columns)) {
      const response = await request(`/rest/v1/${table}?select=${column}`, {
        method: 'HEAD', headers: { Prefer: 'count=exact' },
      });
      const range = response.headers.get('Content-Range');
      const total = range?.match(/\/(\d+)$/)?.[1];
      const empty = response.ok && total === '0';
      // A HEAD 403 supplies no SQLSTATE. Confirm a grant-denial response with
      // a GET of a single identifier at most; discard any unexpected row body.
      let grantDenied = false, code = null;
      if (response.status === 403) {
        const denial = await request(`/rest/v1/${table}?select=${column}&limit=1`);
        const body = await denial.json().catch(() => null);
        code = codeOf(body);
        grantDenied = denial.status === 403 && code === '42501';
      }
      checks.push({ check: table, passed: empty || grantDenied,
        status: response.status, code, rowCount: total === undefined ? null : Number(total) });
    }
    return {
      verdict: checks.every(c => c.passed) ? 'PASS' : 'NOT_PASS',
      timestamp: new Date().toISOString(), authenticatedNonowner: true,
      transport: 'direct fetch to live Auth and PostgREST; no UI authorization gate',
      scope: 'read isolation and owner/snapshot RPC denial only; no CRUD mutation claim',
      checks,
    };
  } catch {
    // Do not stringify exceptions or SDK responses that may contain request data.
    return blocked('Request failed, timed out, or runtime was unavailable; no denial verdict established');
  }
})();
