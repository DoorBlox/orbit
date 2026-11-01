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
  if (error?.code === '40001') return new CloudError('CONFLICT');
  if (['PGRST301','PGRST302','PGRST303','401'].includes(String(error?.code)) || error?.status === 401) return new CloudError('AUTH_REQUIRED');
  if (error?.code === '42501' || error?.status === 403) return new CloudError('FORBIDDEN');
  if (['23503','23505','23514','22023','22P02'].includes(error?.code)) return new CloudError('VALIDATION');
  if (error instanceof TypeError || error?.name === 'AuthRetryableFetchError' || error?.status === 0 || error?.code === 'NETWORK') return new CloudError('NETWORK');
  return new CloudError('UNKNOWN');
}
function assertActive(signal) { if (signal?.aborted) throw new CloudError('ABORTED'); }
/** The UI receives only V6 models; provider-specific response details remain here. */
export function createCloudRepository(client, { sanitizeHtml, ownerId } = {}) {
  if (typeof sanitizeHtml !== 'function') throw Error('A journal sanitizer is required.');
  if (!client?.rpc || !client?.auth?.getUser) throw Error('A configured Supabase client is required.');
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
      return { branches:emptyBranches?[]:normalized.branches, tasks:normalized.tasks,
        journalEntries:normalized.journalEntries, milestones:normalized.milestones,
        spatialLayout:normalized.spatialLayout, preferences:{...normalized.preferences,...(timezone?{timezone}:{})},
        ...(input.profile?{profile:{displayName:input.profile.displayName}}:{}) };
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
    async loadOwnerSnapshot({ signal } = {}) {
      await verifyOwner(signal);
      const data = await execute(() => client.rpc('load_owner_snapshot'),signal);
      if (!object(data) || !validRevision(data.revision)) throw new CloudError('INVALID_RESPONSE');
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
