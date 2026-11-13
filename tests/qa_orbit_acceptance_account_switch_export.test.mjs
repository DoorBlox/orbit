import test from 'node:test';
import assert from 'node:assert/strict';
import { createPrivateMedia } from '../src/cloud/media.js';
import {
  createPortableArchive, inspectPortableArchive, rehydratePortableArchive
} from '../src/cloud/portable-backup.js';

// W6 acceptance: private backup must fail CLOSED when the signed-in owner
// changes while shared/detached media is being downloaded. No hosted services,
// real credentials, actual user files, or owner-private content are used.
const A = '11111111-1111-4111-8111-111111111111';
const B = '22222222-2222-4222-8222-222222222222';
const ATTACHED = A + '/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.png';
const DETACHED = A + '/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb.png';
const png = marker => new Blob([Uint8Array.from([
  137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, marker
])], { type: 'image/png' });
const blobBytes = async blob => [...new Uint8Array(await blob.arrayBuffer())];
const sanitizeHtml = html => html;

function richPrivateSnapshot() {
  const scene = {
    type: 'excalidraw', version: 2,
    appState: { viewBackgroundColor: '#f9edda' },
    elements: [{ id: 'image_1', type: 'image', fileId: 'file_1',
      x: -120, y: 260, width: 180, height: 100 }],
    files: { file_1: { path: ATTACHED, mimeType: 'image/png' } }
  };
  return {
    format: 'orbit-backup', version: 6,
    profile: { displayName: 'A synthetic workspace' },
    branches: [{ id: 'inbox', parentId: 'root', label: 'Unsorted' },
      { id: 'research', parentId: 'root', label: 'Research' }],
    tasks: [{ id: 'task_1', projectId: 'research',
      title: 'A PRIVATE SYNTHETIC TASK' }],
    milestones: [],
    journalEntries: [{ id: 'page_1', title: 'A PRIVATE SYNTHETIC JOURNAL',
      date: '2026-11-13', html: '<p>Dummy text only</p>',
      createdAt: '2026-11-13T00:00:00Z' }],
    preferences: { colorMode: 'deadline' },
    extensions: {
      notes: [{ id: 'sticky_1', title: 'A PRIVATE SYNTHETIC STICKY',
        text: 'Dummy sticky text', x: 10, y: 20,
        width: 300, height: 240, color: 'mint',
        imagePath: ATTACHED, scene: structuredClone(scene) }],
      journalImages: { page_1: ATTACHED },
      journalScenes: { page_1: structuredClone(scene) },
      taskLinks: {},
      projects: { research: { description: 'A PRIVATE SYNTHETIC PROJECT',
        status: 'active', links: [] } }
    }
  };
}

function gatedStorage(pauseAt) {
  const session = { owner: A };
  const stored = new Map([[ATTACHED, png(1)], [DETACHED, png(2)]]);
  let downloads = 0, uploads = 0, resume, notifyStarted;
  const started = new Promise(resolve => { notifyStarted = resolve; });
  const gate = new Promise(resolve => { resume = resolve; });
  const bucket = {
    async download(path) {
      ++downloads;
      if (downloads === pauseAt) {
        notifyStarted(path);
        await gate;
      }
      if (!path.startsWith(session.owner + '/') || !stored.has(path))
        return { data: null, error: Error('Synthetic Storage owner refusal') };
      return { data: stored.get(path), error: null };
    },
    async upload(path, file, options) {
      ++uploads;
      assert.equal(options.upsert, false, 'Restore never overwrites private files');
      if (!path.startsWith(session.owner + '/') || stored.has(path))
        return { data: null, error: Error('Synthetic Storage owner refusal') };
      stored.set(path, new Blob([file], { type: file.type }));
      return { data: { path }, error: null };
    }
  };
  const client = {
    auth: { getUser: async () => ({
      data: { user: { id: session.owner } }, error: null
    }) },
    storage: { from(name) {
      assert.equal(name, 'orbit-private-media');
      return bucket;
    } }
  };
  return { session, stored, client, started,
    resume: () => resume(), getDownloads: () => downloads,
    getUploads: () => uploads };
}

for (const pauseAt of [1, 2]) {
  test('W6: switching A to B during private portable asset ' + pauseAt +
    ' rejects incomplete export and permits only explicit new-owner restore', async () => {
    const storage = gatedStorage(pauseAt);
    const original = richPrivateSnapshot();
    const pristine = structuredClone(original);
    const source = createPrivateMedia(storage.client, { ownerId: A });
    try {
      const inFlight = createPortableArchive(original, {
        ownerId: A, sanitizeHtml, libraryPaths: [DETACHED],
        download: path => source.download(path)
      });
      const pausedPath = await storage.started;
      assert.ok([ATTACHED, DETACHED].includes(pausedPath));
      storage.session.owner = B;
      storage.resume();
      await assert.rejects(inFlight, /expired|sign in again/i,
        'No incomplete JSON archive may be returned to a switched account');
      assert.equal(storage.getUploads(), 0,
        'Export must never upload or mutate a different owner account');
      assert.deepEqual(original, pristine, 'Failed export leaves all features intact');
      assert.deepEqual(await blobBytes(storage.stored.get(ATTACHED)),
        await blobBytes(png(1)), 'A attachment byte integrity');
      assert.deepEqual(await blobBytes(storage.stored.get(DETACHED)),
        await blobBytes(png(2)), 'A detached byte integrity');
      assert.equal([...storage.stored.keys()].filter(x => x.startsWith(B + '/')).length, 0,
        'No B media should be invented by a failed A export');

      // The now-expired A media session is not reusable after a brief switch
      // back; only a fresh authenticated A session can retry the complete export.
      storage.session.owner = A;
      await assert.rejects(source.download(ATTACHED), /expired|sign in again/i);
      const freshSource = createPrivateMedia(storage.client, { ownerId: A });
      let reviewed;
      try {
        const archive = await createPortableArchive(original, {
          ownerId: A, sanitizeHtml, libraryPaths: [DETACHED],
          download: path => freshSource.download(path)
        });
        assert.equal(archive.manifest.assetCount, 2);
        assert.deepEqual(archive.manifest.libraryOnlyPaths, [DETACHED]);
        assert.deepEqual(archive.assets.map(asset => asset.path),
          [ATTACHED, DETACHED], 'Shared scene references must download only once');
        reviewed = await inspectPortableArchive(JSON.stringify(archive), { sanitizeHtml });
        assert.deepEqual(reviewed.snapshot, pristine);
      } finally {
        freshSource.dispose();
      }

      // Explicit B-account restore is a separate authenticated action.
      storage.session.owner = B;
      const target = createPrivateMedia(storage.client, { ownerId: B });
      try {
        const restored = await rehydratePortableArchive(reviewed, {
          ownerId: B, upload: file => target.upload(file)
        });
        const targetPath = restored.extensions.notes[0].imagePath;
        assert.ok(targetPath.startsWith(B + '/'));
        assert.equal(restored.extensions.journalImages.page_1, targetPath);
        assert.equal(restored.extensions.notes[0].scene.files.file_1.path, targetPath);
        assert.equal(restored.extensions.journalScenes.page_1.files.file_1.path, targetPath);
        assert.equal(restored.extensions.projects.research.description,
          'A PRIVATE SYNTHETIC PROJECT');
        assert.equal(restored.tasks[0].title, 'A PRIVATE SYNTHETIC TASK');
        assert.equal(restored.journalEntries[0].title, 'A PRIVATE SYNTHETIC JOURNAL');
        assert.equal(JSON.stringify(restored).includes(A), false,
          'No source-owner private media path may persist after restore');
        assert.deepEqual(await blobBytes(await target.download(targetPath)),
          await blobBytes(png(1)));
        await assert.rejects(target.download(ATTACHED), /another space|invalid/i);
        assert.equal(storage.getUploads(), 2);
        assert.equal([...storage.stored.keys()].filter(x => x.startsWith(A + '/')).length, 2);
      } finally {
        target.dispose();
      }
    } finally {
      storage.resume();
      source.dispose();
    }
  });
}
