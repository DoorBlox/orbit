import { validateBackup } from '../backup.js';
import { validDateKey } from '../dates.js';

const PUBLIC_COLUMNS = 'id,kind,title,excerpt,published_date,updated_at';
const PUBLIC_KINDS = new Set(['task','journal','milestone','branch']);
const validRevision = value => Number.isSafeInteger(value) && value >= 0;
const object = value => value && typeof value === 'object' && !Array.isArray(value);
const safeSourceId = value => typeof value === 'string' && value.length > 0 && value.length <= 100;
const messages = {
  AUTH_REQUIRED: 'Sign in again to access your private space.',
  FORBIDDEN: 'This account cannot access the private space.',
  CONFLICT: 'Another session saved changes. Keep your draft and review the latest version.',
  NETWORK: 'Cannot reach cloud storage. Your unsaved draft is still in this session.',
  VALIDATION: 'This change contains invalid or unsupported data.',
  INVALID_RESPONSE: 'Cloud storage returned an unexpected response. Your draft is retained.',
  ABORTED: 'The request was cancelled.',
  UNKNOWN: 'Cloud storage could not complete this request. Your draft is retained.',
};
export class CloudError extends Error {
  constructor(code) { super(messages[code] || messages.UNKNOWN); this.name = 'CloudError'; this.code = code; }
}
function cloudError(error) {
  if (error instanceof CloudError) return error;
  if (error?.name === 'AbortError') return new CloudError('ABORTED');
  if (['40001','PT409'].includes(error?.code)) return new CloudError('CONFLICT');
  if (['PGRST301','PGRST302','PGRST303','401'].includes(String(error?.code)) || error?.status === 401) return new CloudError('AUTH_REQUIRED');
  if (error?.code === '42501' || error?.status === 403) return new CloudError('FORBIDDEN');
  if (['23503','23505','23514','22023','22P02'].includes(error?.code)) return new CloudError('VALIDATION');
  if (error instanceof TypeError || error?.name === 'AuthRetryableFetchError' || error?.status === 0 || error?.code === 'NETWORK') return new CloudError('NETWORK');
  return new CloudError('UNKNOWN');
}
function assertActive(signal) { if (signal?.aborted) throw new CloudError('ABORTED'); }
/** Backup normalization already owns detached, validated task objects.
 * Only rehydrate tasks that actually carry a validated extension override.
 * Preserve the entire original array when no overlay exists.
 */
export function hydrateTaskLinks(tasks, overrides = {}) {
  if (!overrides || Object.keys(overrides).length === 0) return tasks;
  return tasks.map(task => overrides[task.id] ? {...task,links:overrides[task.id]} : task);
}

/** The UI receives only V6 models; provider-specific response details remain here. */
export function createCloudRepository(client, { sanitizeHtml, ownerId, conditionalOwnerReads = false } = {}) {
  if (typeof sanitizeHtml !== 'function') throw Error('A journal sanitizer is required.');
  if (!client?.rpc || !client?.auth?.getUser) throw Error('A configured Supabase client is required.');
  if (typeof conditionalOwnerReads !== 'boolean') throw Error('Conditional owner reads must be explicitly enabled with a boolean.');
  // A canonical PostgREST missing-function response permanently selects the safe
  // legacy RPC for this repository instance; never retry a missing probe on polls.
  let conditionalEndpointMissing = false;
  const normalizeSnapshot = input => {
    try {
      if (!object(input) || !Array.isArray(input.branches) || !Array.isArray(input.tasks) ||
          !Array.isArray(input.journalEntries) || !Array.isArray(input.milestones) ||
          !object(input.spatialLayout) || !object(input.preferences)) throw Error();
      // Empty authenticated accounts stay empty. The backup validator otherwise
      // requires inbox to keep legacy imports assignable to a valid branch.
      const emptyBranches = input.branches.length === 0;
      if (emptyBranches && input.tasks.length) throw Error();
      if (input.profile !== undefined && (!object(input.profile) || typeof input.profile.displayName !== 'string' ||
          !input.profile.displayName.trim() || input.profile.displayName.length > 100)) throw Error();
      const timezone = input.preferences.timezone;
      if (timezone !== undefined) {
        if (typeof timezone !== 'string' || !timezone || timezone.length > 80) throw Error();
        new Intl.DateTimeFormat('en',{timeZone:timezone});
      }
      const normalized = validateBackup({ ...input, format:'orbit-backup', version:6,
        branches:emptyBranches?[{id:'inbox',parentId:'root',label:'Unsorted'}]:input.branches }, {sanitizeHtml});
      const links=normalized.extensions?.taskLinks||{};
      return { branches:emptyBranches?[]:normalized.branches,
        tasks:hydrateTaskLinks(normalized.tasks,links),
        journalEntries:normalized.journalEntries, milestones:normalized.milestones,
        spatialLayout:normalized.spatialLayout, preferences:{...normalized.preferences,...(timezone?{timezone}:{})},
        ...(input.profile?{profile:{displayName:input.profile.displayName}}:{}),
        ...(normalized.extensions?{extensions:normalized.extensions}:{}) };
    } catch { throw new CloudError('VALIDATION'); }
  };
  async function verifyOwner(signal) {
    assertActive(signal);
    let response;
    try { response = await client.auth.getUser(); } catch (error) { throw cloudError(error); }
    assertActive(signal);
    if (response.error) { const mapped = cloudError(response.error); throw mapped.code === 'NETWORK' ? mapped : new CloudError('AUTH_REQUIRED'); }
    if (!response.data?.user?.id) throw new CloudError('AUTH_REQUIRED');
    if (ownerId && response.data.user.id !== ownerId) throw new CloudError('FORBIDDEN');
    return response.data.user.id;
  }
  async function execute(buildRequest, signal) {
    assertActive(signal);
    try {
      let request = buildRequest();
      if (signal && typeof request.abortSignal === 'function') request = request.abortSignal(signal);
      const response = await request;
      assertActive(signal);
      if (response.error) throw cloudError(response.error);
      return response.data;
    } catch (error) { throw cloudError(error); }
  }
  // This experimental path is never invoked unless an explicit caller enables
  // conditionalOwnerReads AND supplies a validated known revision. Default
  // Production traffic continues to use load_owner_snapshot verbatim.
  async function probeOwnerRevision(knownRevision, signal) {
    assertActive(signal);
    try {
      let request = client.rpc('load_owner_snapshot_if_changed',{p_known_revision:knownRevision});
      if (signal && typeof request.abortSignal === 'function') request = request.abortSignal(signal);
      const response = await request;
      assertActive(signal);
      // PGRST202 with HTTP 404 means the RPC is missing from PostgREST's schema
      // cache. Other 404s, 401s, 403s and network errors MUST fail closed.
      if (response?.error?.code === 'PGRST202' && response.status === 404) {
        conditionalEndpointMissing = true;
        return {missing:true};
      }
      if (response?.error) throw cloudError(response.error);
      return {missing:false,data:response?.data};
    } catch (error) { throw cloudError(error); }
  }
  function publicProjection(row) {
    if (!object(row) || typeof row.id !== 'string' || !PUBLIC_KINDS.has(row.kind) ||
        typeof row.title !== 'string' || typeof row.excerpt !== 'string' ||
        (row.published_date !== null && !validDateKey(row.published_date)) ||
        typeof row.updated_at !== 'string') throw new CloudError('INVALID_RESPONSE');
    return {id:row.id,kind:row.kind,title:row.title,excerpt:row.excerpt,
      published_date:row.published_date,updated_at:row.updated_at};
  }
  function publicationArgs({ kind, sourceId, excerpt = '', publicationDate = null } = {}) {
    if (!PUBLIC_KINDS.has(kind) || !safeSourceId(sourceId) || typeof excerpt !== 'string' ||
        excerpt.length > 1000 || /[<>]/.test(excerpt) || (publicationDate !== null && !validDateKey(publicationDate))) throw new CloudError('VALIDATION');
    return {p_kind:kind,p_source_id:sourceId,p_excerpt:excerpt,p_publication_date:publicationDate};
  }
  return {
    async loadOwnerSnapshot({ signal, knownRevision } = {}) {
      if (knownRevision !== undefined && !validRevision(knownRevision)) throw new CloudError('VALIDATION');
      const verifiedOwner = await verifyOwner(signal);
      const useConditional = conditionalOwnerReads && knownRevision !== undefined && !conditionalEndpointMissing;
      let data, conditionalResponse = false;
      if (useConditional) {
        const probe = await probeOwnerRevision(knownRevision,signal);
        if (!probe.missing) { data = probe.data; conditionalResponse = true; }
      }
      if (!conditionalResponse) data = await execute(() => client.rpc('load_owner_snapshot'),signal);
      // The optional endpoint introduces a second async identity boundary.
      // Check the owner again before accepting ANY conditional/fallback result.
      if (useConditional && await verifyOwner(signal) !== verifiedOwner) throw new CloudError('FORBIDDEN');
      if (!object(data) || !validRevision(data.revision)) throw new CloudError('INVALID_RESPONSE');
      if (conditionalResponse) {
        if (data.unchanged === true) {
          // An unchanged reply must not contain private data or a different
          // revision. Extra keys fail closed instead of being silently ignored.
          if (data.revision !== knownRevision || Object.keys(data).length !== 2 ||
              !Object.hasOwn(data,'revision') || !Object.hasOwn(data,'unchanged')) {
            throw new CloudError('INVALID_RESPONSE');
          }
          return {revision:data.revision,unchanged:true};
        }
        if ((Object.hasOwn(data,'unchanged') && data.unchanged !== false) ||
            data.revision <= knownRevision) throw new CloudError('INVALID_RESPONSE');
      }
      if (!object(data.snapshot)) throw new CloudError('INVALID_RESPONSE');
      // The unchanged client normalization fast path remains available for
      // legacy full-snapshot responses, including a missing-RPC fallback.
      if (!conditionalResponse && knownRevision === data.revision) return {revision:data.revision,unchanged:true};
      try { return {revision:data.revision,snapshot:normalizeSnapshot(data.snapshot)}; }
      catch { throw new CloudError('INVALID_RESPONSE'); }
    },
    async saveSnapshot(snapshot, expectedRevision, { signal } = {}) {
      if (!validRevision(expectedRevision)) throw new CloudError('VALIDATION');
      const normalized = normalizeSnapshot(snapshot);
      await verifyOwner(signal);
      const data = await execute(() => client.rpc('save_owner_snapshot', {p_snapshot:normalized,p_expected_revision:expectedRevision}),signal);
      if (!object(data) || !validRevision(data.revision) || data.revision <= expectedRevision) throw new CloudError('INVALID_RESPONSE');
      return {revision:data.revision};
    },
    async loadPublicContent({ signal } = {}) {
      assertActive(signal);
      const data = await execute(() => client.from('published_content').select(PUBLIC_COLUMNS).order('updated_at',{ascending:false}),signal);
      if (!Array.isArray(data)) throw new CloudError('INVALID_RESPONSE');
      return data.map(publicProjection);
    },
    async publishContent(input, { signal } = {}) {
      const args = publicationArgs(input);
      if(typeof input?.expectedTitle!=='string'||input.expectedTitle.length>180)throw new CloudError('VALIDATION');
      args.p_expected_title=input.expectedTitle;
      await verifyOwner(signal);
      return publicProjection(await execute(() => client.rpc('publish_content',args),signal));
    },
    async unpublishContent(input, { signal } = {}) {
      const {p_kind,p_source_id} = publicationArgs(input);
      await verifyOwner(signal);
      await execute(() => client.rpc('unpublish_content',{p_kind,p_source_id}),signal);
    },
  };
}
