import test from 'node:test';
import assert from 'node:assert/strict';
import { Journal } from '../src/journal.js';

function syntheticJournal({ persistLocally = false } = {}) {
  const journal = Object.create(Journal.prototype);
  const calls = { commits: 0, words: 0 };
  journal.disposed = false;
  journal.readOnly = false;
  journal.editing = true;
  journal.persistLocally = persistLocally;
  journal.compositionTarget = null;
  journal.saved = true;
  journal.timer = 0;
  journal.saveIndicator = { textContent: 'saved to cloud' };
  journal.title = { value: '', readOnly: false };
  journal.dateInput = { disabled: false };
  journal.editor = { contentEditable: 'true' };
  journal.updateCount = () => { calls.words++; };
  journal.commit = () => { calls.commits++; return true; };
  return { journal, calls };
}

test('BP-11: cloud input during an active editor IME composition must not publish intermediate drafts', () => {
  const { journal, calls } = syntheticJournal();
  journal.compositionTarget = journal.editor;
  journal.queueSave();
  assert.equal(calls.commits, 0, 'Cloud commit must wait until the composition resolves');
  assert.equal(journal.saveIndicator.textContent, 'writing…');
  assert.equal(calls.words, 1, 'Word count may update without publishing the transient text');
  journal.compositionTarget = null;
  journal.queueSave();
  assert.equal(calls.commits, 1, 'The finished edit must publish exactly once');
});

test('BP-11: title and rich-text IME boundaries each flush their completed draft once', () => {
  const { journal, calls } = syntheticJournal();
  journal.beginComposition(journal.title);
  journal.queueSave();
  assert.equal(calls.commits, 0);
  journal.endComposition(journal.title);
  assert.equal(calls.commits, 1);
  journal.beginComposition(journal.editor);
  journal.queueSave();
  assert.equal(calls.commits, 1);
  journal.endComposition(journal.editor);
  assert.equal(calls.commits, 2);
});

test('BP-11: local editing schedules no partial timer but debounces final composition', () => {
  const { journal, calls } = syntheticJournal({ persistLocally: true });
  journal.beginComposition(journal.editor);
  journal.queueSave();
  assert.equal(journal.timer, 0);
  assert.equal(calls.commits, 0);
  journal.endComposition(journal.editor);
  assert.ok(journal.timer, 'Final text must schedule the existing 500ms local save');
  clearTimeout(journal.timer);
});

test('BP-11: a dismissed edit mode cannot leave a stale IME lock on later input', () => {
  const { journal, calls } = syntheticJournal();
  journal.compositionTarget = journal.title;
  journal.setEditing(false);
  assert.equal(journal.compositionTarget, null);
  journal.setEditing(true);
  journal.queueSave();
  assert.equal(calls.commits, 1, 'Editing again should publish ordinary input');
});

test('BP-11: explicit lifecycle flush commits the visible interrupted draft', () => {
  const { journal, calls } = syntheticJournal();
  journal.compositionTarget = journal.editor;
  journal.queueSave();
  assert.equal(calls.commits, 0);
  journal.commit();
  assert.equal(calls.commits, 1, 'Pagehide/visibilitychange may explicitly preserve the visible draft');
});
