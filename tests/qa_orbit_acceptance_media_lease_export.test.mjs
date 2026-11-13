import test from 'node:test';
import assert from 'node:assert/strict';
import { createPrivateMedia } from '../src/cloud/media.js';
import { createPortableArchive } from '../src/cloud/portable-backup.js';

// W6: synthetic cross-feature acceptance for owner changes during *portable*
// backup while a previously obtained private image Blob lease is still active.
// This never calls hosted Storage/Auth, uses no actual owner data, and does not
// alter W2's media-session implementation.
const OWNER = '11111111-1111-4111-8111-111111111111';
const OTHER = '22222222-2222-4222-8222-222222222222';
const ATTACHED = OWNER + '/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.png';
const DETACHED = OWNER + '/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb.png';
const PROVIDER_DETAIL = 'SECRET_SYNTHETIC_STORAGE_PROVIDER_DETAIL';
const image = finalByte => new Blob([Uint8Array.from([
  137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, finalByte
])], { type: 'image/png' });

function privateWorkspace() {
  const scene = {
    type: 'excalidraw', version: 2,
    appState: { viewBackgroundColor: '#f9edda' },
    elements: [{ id: 'image_1', type: 'image', fileId: 'file_1',
      x: -80, y: 60, width: 180, height: 110 }],
    files: { file_1: { path: ATTACHED, mimeType: 'image/png' } }
  };
  return {
    format: 'orbit-backup', version: 6,
    profile: { displayName: 'Synthetic source account' },
    branches: [
      { id: 'inbox', parentId: 'root', label: 'Unsorted' },
      { id: 'research', parentId: 'root', label: 'Research' }
    ],
    tasks: [{ id: 'task_1', projectId: 'research',
      title: 'PRIVATE SYNTHETIC TASK' }],
    journalEntries: [{ id: 'page_1', title: 'PRIVATE SYNTHETIC JOURNAL',
      date: '2026-11-13', html: '<p>Only dummy content</p>',
      createdAt: '2026-11-13T00:00:00Z' }],
    milestones: [],
    preferences: { colorMode: 'deadline' },
    extensions: {
      notes: [{ id: 'note_1', title: 'PRIVATE SYNTHETIC STICKY',
        text: 'Only dummy sticky content', color: 'mint',
        x: 10, y: 30, width: 320, height: 250,
        imagePath: ATTACHED, scene: structuredClone(scene) }],
      journalImages: { page_1: ATTACHED },
      journalScenes: { page_1: structuredClone(scene) },
      projects: { research: {
        description: 'PRIVATE SYNTHETIC PROJECT',
        status: 'active', links: []
      } },
      taskLinks: {}
    }
  };
}

for (const failedPath of [ATTACHED, DETACHED]) {
  for (const mode of ['rejected-promise', 'structured-error']) {
    test('W6: portable ' + mode + ' at ' +
      (failedPath === ATTACHED ? 'shared reference' : 'detached library') +
      ' revokes active private preview on account switch', async () => {
      const originalCreate = URL.createObjectURL;
      const originalRevoke = URL.revokeObjectURL;
      const privateBlobUrl = 'blob:synthetic-owner-private-preview';
      const revoked = [];
      let currentOwner = OWNER, stage = 'preview', failedCalls = 0, uploads = 0;
      const sourceBytes = new Map([
        [ATTACHED, image(1)], [DETACHED, image(2)]
      ]);
      const original = privateWorkspace();
      const pristine = structuredClone(original);
      let media, lease;
      URL.createObjectURL = () => privateBlobUrl;
      URL.revokeObjectURL = url => { revoked.push(url); };

      const client = {
        auth: { getUser: async () => ({
          data: { user: { id: currentOwner } }, error: null
        }) },
        storage: { from(name) {
          assert.equal(name, 'orbit-private-media');
          return {
            async download(path) {
              if (stage === 'export' && path === failedPath) {
                failedCalls++;
                // The original A request may terminate as an SDK rejection
                // or {error}; either must invalidate A's visible Blob lease.
                currentOwner = OTHER;
                if (mode === 'rejected-promise') throw Error(PROVIDER_DETAIL);
                return { data: null, error: { message: PROVIDER_DETAIL } };
              }
              if (!path.startsWith(OWNER + '/') || !sourceBytes.has(path))
                return { data: null, error: Error('Synthetic owner refusal') };
              return { data: sourceBytes.get(path), error: null };
            },
            async upload() {
              uploads++;
              throw Error('Export must never upload private media');
            }
          };
        } }
      };

      try {
        media = createPrivateMedia(client, { ownerId: OWNER });
        lease = await media.acquirePreview(ATTACHED);
        assert.equal(lease.url, privateBlobUrl);
        assert.deepEqual(revoked, [], 'Active preview must still be visible before sign-out');
        stage = 'export';

        await assert.rejects(
          createPortableArchive(original, {
            ownerId: OWNER,
            libraryPaths: [DETACHED],
            sanitizeHtml: html => html,
            download: path => media.download(path)
          }),
          error => {
            assert.match(error.message, /media session expired|sign in again/i,
              'A failed Storage response must not hide the account switch');
            assert.doesNotMatch(error.message, /SECRET_SYNTHETIC_STORAGE_PROVIDER_DETAIL/);
            return true;
          },
          'A partial export must never be returned to a newly signed-in account'
        );
        assert.equal(failedCalls, 1, 'The selected private asset failure must be exercised');
        assert.equal(uploads, 0);
        assert.deepEqual(revoked, [privateBlobUrl],
          'Existing private Blob URL must be revoked before the failure escapes');
        assert.deepEqual(original, pristine,
          'Export rejection must not mutate Task, Journal, Sticky, Project or canvas metadata');

        // A stale media instance must not revive private previews just because
        // the original owner subsequently signs back in on this browser.
        currentOwner = OWNER;
        await assert.rejects(media.acquirePreview(ATTACHED),
          /media session expired|sign in again/i);
        lease.release();
        assert.deepEqual(revoked, [privateBlobUrl],
          'Releasing an already-invalid lease must not revoke the same URL twice');
        assert.equal(sourceBytes.size, 2,
          'No originally private source images may be removed by failed export');
      } finally {
        lease?.release();
        media?.dispose();
        URL.createObjectURL = originalCreate;
        URL.revokeObjectURL = originalRevoke;
      }
    });
  }
}
