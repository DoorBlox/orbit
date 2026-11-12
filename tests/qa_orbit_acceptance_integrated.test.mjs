import test from 'node:test';
import assert from 'node:assert/strict';
import { createSyncController } from '../src/cloud/sync.js';
import { createPrivateMedia } from '../src/cloud/media.js';
import {
  createPortableArchive, inspectPortableArchive, rehydratePortableArchive,
  collectMediaReferenceUsage
} from '../src/cloud/portable-backup.js';
import { classifyPrivateGalleryItems } from '../src/cloud/owner-tools.js';
import { validateBackup, persistBackup, RESTORE_RECOVERY_KEY } from '../src/backup.js';
import { STORAGE_KEYS } from '../src/storage.js';
import { publicSnapshot } from '../src/bootstrap.js';

// Cross-feature synthetic acceptance: no hosted account, Storage object, or real user data.
const SOURCE = '11111111-1111-4111-8111-111111111111';
const TARGET = '22222222-2222-4222-8222-222222222222';
const ATTACHED = SOURCE + '/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.png';
const DETACHED = SOURCE + '/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb.png';
const sanitizeHtml = html => html;
const png = marker => new Blob([Uint8Array.from([
  137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, marker
])], { type: 'image/png' });
const bytes = async blob => [...new Uint8Array(await blob.arrayBuffer())];

function workspace() {
  const canvas = {
    type: 'excalidraw', version: 2,
    appState: { viewBackgroundColor: '#f9edda' },
    elements: [{ id: 'image_1', type: 'image', fileId: 'file_1',
      x: -140, y: 260, width: 180, height: 110 }],
    files: { file_1: { path: ATTACHED, mimeType: 'image/png' } }
  };
  return {
    format: 'orbit-backup', version: 6,
    profile: { displayName: 'Synthetic private space' },
    branches: [
      { id: 'inbox', parentId: 'root', label: 'Unsorted' },
      { id: 'research', parentId: 'root', label: 'Research' }
    ],
    tasks: [{ id: 'task_1', title: 'Synthetic task',
      projectId: 'research', description: 'Never a public task' }],
    milestones: [{ id: 'milestone_1', title: 'Synthetic milestone', date: '2026-11-12' }],
    journalEntries: [{ id: 'page_1', title: 'Synthetic journal', date: '2026-11-12',
      html: '<p>Private synthetic journal text</p>',
      createdAt: '2026-11-12T00:00:00.000Z' }],
    preferences: { colorMode: 'deadline' },
    extensions: {
      notes: [{ id: 'sticky_1', title: 'Synthetic sticky', text: 'Draft',
        x: -80, y: 45, width: 320, height: 250, color: 'mint',
        imagePath: ATTACHED, scene: structuredClone(canvas) }],
      journalImages: { page_1: ATTACHED },
      journalScenes: { page_1: structuredClone(canvas) },
      taskLinks: {},
      projects: { research: {
        description: 'Private project brief', status: 'active',
        links: [{ label: 'Synthetic reference', url: 'https://example.invalid/brief' }],
        goal: 'Check integrity',
        milestones: [{ id: 'phase_1', title: 'Restore media',
          targetDate: '2026-11-15', done: false }]
      } },
      appearance: { theme: 'graphite', motion: 'off', ambient: false }
    }
  };
}

function casRepository(initial = workspace()) {
  let revision = 0;
  let saved = structuredClone(initial);
  let writes = 0;
  return {
    async loadOwnerSnapshot() {
      return { revision, snapshot: structuredClone(saved) };
    },
    async saveSnapshot(snapshot, expectedRevision) {
      if (expectedRevision !== revision)
        throw Object.assign(Error('Synthetic revision conflict'), { code: 'CONFLICT' });
      saved = structuredClone(snapshot);
      writes++;
      return { revision: ++revision };
    },
    inspect() { return { revision, writes, snapshot: structuredClone(saved) }; }
  };
}

function controller(repository, options = {}) {
  return createSyncController({
    repository, initialRevision: 0, debounceMs: 60000, pollMs: 0,
    eventTarget: null, visibilityTarget: null, ...options
  });
}

function fakePrivateStorage() {
  const session = { owner: SOURCE };
  const stored = new Map([[ATTACHED, png(1)], [DETACHED, png(2)]]);
  const calls = { downloads: [], uploads: [] };
  const bucket = {
    async download(path) {
      calls.downloads.push(path);
      if (!path.startsWith(session.owner + '/') || !stored.has(path))
        return { data: null, error: Error('Synthetic Storage RLS denial') };
      return { data: stored.get(path), error: null };
    },
    async upload(path, blob, options) {
      calls.uploads.push(path);
      assert.equal(options.upsert, false, 'Restores must create new private objects');
      if (!path.startsWith(session.owner + '/') || stored.has(path))
        return { data: null, error: Error('Synthetic Storage RLS denial') };
      stored.set(path, new Blob([blob], { type: blob.type }));
      return { data: { path }, error: null };
    },
    async list(prefix, { limit, offset }) {
      if (prefix !== session.owner)
        return { data: null, error: Error('Synthetic Storage RLS denial') };
      const data = [...stored].filter(([path]) => path.startsWith(prefix + '/'))
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(offset, offset + limit)
        .map(([path, blob]) => ({
          id: path, name: path.slice(prefix.length + 1),
          metadata: { size: blob.size }, created_at: '2026-11-12T00:00:00Z'
        }));
      return { data, error: null };
    }
  };
  const client = {
    auth: { getUser: async () => ({ data: { user: { id: session.owner } }, error: null }) },
    storage: { from(name) {
      assert.equal(name, 'orbit-private-media');
      return bucket;
    } }
  };
  return { session, stored, calls, client };
}

class MemoryStorage {
  data = new Map();
  getItem(key) { return this.data.has(key) ? this.data.get(key) : null; }
  setItem(key, value) { this.data.set(key, String(value)); }
  removeItem(key) { this.data.delete(key); }
}

test('W6: offline draft -> CAS ACK -> clean reload -> private portable restore keeps all feature data', async () => {
  const repository = casRepository();
  let online = false;
  const device = controller(repository, { isOnline: () => online });
  const edited = workspace();
  edited.tasks[0].title = 'Offline task change';
  edited.journalEntries[0].html = '<p>Offline journal change</p>';
  edited.extensions.notes[0].text = 'Offline sticky change';
  edited.extensions.projects.research.description = 'Offline project change';
  device.queue(edited);
  assert.equal((await device.flush()).ok, false);
  assert.equal(repository.inspect().writes, 0);
  assert.equal(device.getPendingSnapshot().extensions.projects.research.description,
    'Offline project change', 'Pending private project must survive network loss');
  online = true;
  assert.equal((await device.retry()).ok, true);
  assert.equal(repository.inspect().revision, 1);
  device.dispose();

  let reopened;
  const reload = controller(repository, {
    isOnline: () => true, onSnapshot: next => { reopened = next; }
  });
  assert.equal((await reload.refresh()).changed, true);
  assert.equal(reopened.tasks[0].title, 'Offline task change');
  assert.equal(reopened.journalEntries[0].html, '<p>Offline journal change</p>');
  assert.equal(reopened.extensions.notes[0].text, 'Offline sticky change');
  assert.equal(reopened.extensions.projects.research.description, 'Offline project change');
  reload.dispose();

  const storage = fakePrivateStorage();
  const sourceMedia = createPrivateMedia(storage.client, { ownerId: SOURCE });
  const archive = await createPortableArchive(reopened, {
    ownerId: SOURCE, download: path => sourceMedia.download(path),
    libraryPaths: [DETACHED], sanitizeHtml
  });
  assert.equal(archive.manifest.assetCount, 2, 'Shared media is not downloaded four times');
  assert.deepEqual(archive.manifest.libraryOnlyPaths, [DETACHED]);
  assert.equal(storage.calls.downloads.length, 2);
  const reviewed = await inspectPortableArchive(JSON.stringify(archive), { sanitizeHtml });
  sourceMedia.dispose();

  storage.session.owner = TARGET;
  const targetMedia = createPrivateMedia(storage.client, { ownerId: TARGET });
  try {
    const restored = await rehydratePortableArchive(reviewed, {
      ownerId: TARGET, upload: file => targetMedia.upload(file)
    });
    const attachedPath = restored.extensions.notes[0].imagePath;
    assert.ok(attachedPath.startsWith(TARGET + '/'));
    assert.equal(restored.extensions.notes[0].scene.files.file_1.path, attachedPath);
    assert.equal(restored.extensions.journalImages.page_1, attachedPath);
    assert.equal(restored.extensions.journalScenes.page_1.files.file_1.path, attachedPath);
    assert.equal(restored.extensions.journalScenes.page_1.elements[0].x, -140);
    assert.equal(restored.tasks[0].title, 'Offline task change');
    assert.equal(restored.journalEntries[0].html, '<p>Offline journal change</p>');
    assert.equal(restored.extensions.notes[0].text, 'Offline sticky change');
    assert.equal(restored.extensions.projects.research.description, 'Offline project change');
    assert.equal(restored.extensions.projects.research.milestones[0].id, 'phase_1');
    assert.equal(JSON.stringify(restored).includes(SOURCE), false,
      'No source-owner private media paths may remain in the restored snapshot');

    assert.deepEqual(await bytes(await targetMedia.download(attachedPath)), await bytes(png(1)));
    const inventory = await targetMedia.listOwnMedia();
    assert.equal(inventory.items.length, 2);
    const usage = collectMediaReferenceUsage(restored, { ownerId: TARGET });
    const gallery = classifyPrivateGalleryItems(inventory.items, usage, TARGET);
    assert.equal(gallery.filter(item => item.detached).length, 1);
    const detached = gallery.find(item => item.detached);
    assert.deepEqual(await bytes(await targetMedia.download(detached.path)), await bytes(png(2)));
    await assert.rejects(targetMedia.download(ATTACHED), /another space|invalid/i);
    assert.deepEqual(await bytes(storage.stored.get(ATTACHED)), await bytes(png(1)),
      'Restoring into B must never mutate A media bytes');

    const cleaned = validateBackup(restored, { sanitizeHtml });
    const local = new MemoryStorage();
    assert.equal(persistBackup(cleaned, local).ok, true);
    assert.equal(local.getItem(RESTORE_RECOVERY_KEY), null);
    assert.equal(JSON.parse(local.getItem(STORAGE_KEYS.journal))[0].html,
      '<p>Offline journal change</p>');
    assert.equal(JSON.parse(local.getItem(STORAGE_KEYS.extensions))
      .projects.research.description, 'Offline project change');
    assert.deepEqual(publicSnapshot([]).tasks, [],
      'Anonymous visitor is not given private workspace tasks by default');

    const formerOwner = createPrivateMedia(storage.client, { ownerId: SOURCE });
    await assert.rejects(formerOwner.download(ATTACHED), /expired|sign in/i);
    formerOwner.dispose();
  } finally {
    targetMedia.dispose();
  }
});

test('W6: two-device CAS conflict retains a private recoverable archive before deliberate discard', async () => {
  const repository = casRepository();
  let secondOnline = false;
  const first = controller(repository, { isOnline: () => true });
  const second = controller(repository, { isOnline: () => secondOnline });
  try {
    const offline = workspace();
    offline.tasks[0].title = 'Second-device unsent task';
    offline.extensions.projects.research.description = 'Second-device unsent project';
    second.queue(offline);
    assert.equal((await second.flush()).ok, false);
    const newer = workspace();
    newer.tasks[0].title = 'First-device cloud commit';
    first.queue(newer);
    assert.equal((await first.flush()).ok, true);

    secondOnline = true;
    assert.equal((await second.retry()).ok, false);
    assert.equal(second.getState().state, 'conflict');
    assert.equal(repository.inspect().snapshot.tasks[0].title, 'First-device cloud commit');
    assert.equal(second.getPendingSnapshot().tasks[0].title,
      'Second-device unsent task', 'Conflict must preserve unsent private draft');

    const storage = fakePrivateStorage();
    const media = createPrivateMedia(storage.client, { ownerId: SOURCE });
    try {
      const archive = await createPortableArchive(second.getPendingSnapshot(), {
        ownerId: SOURCE, download: path => media.download(path), sanitizeHtml
      });
      const reviewed = await inspectPortableArchive(JSON.stringify(archive), { sanitizeHtml });
      assert.equal(reviewed.snapshot.tasks[0].title, 'Second-device unsent task');
      assert.equal(reviewed.snapshot.extensions.projects.research.description,
        'Second-device unsent project');
      assert.equal(reviewed.files.length, 1);
      assert.equal(repository.inspect().revision, 1,
        'Reviewing a recovery archive must not overwrite the other device');
    } finally {
      media.dispose();
    }
  } finally {
    first.dispose();
    second.dispose();
  }
});
