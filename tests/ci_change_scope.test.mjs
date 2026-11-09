import test from 'node:test';
import assert from 'node:assert/strict';
import {isDocumentationOnly,chooseCheckScope} from '../scripts/ci-change-scope.mjs';

test('only nonempty Markdown or MDX diffs qualify',()=>{
  assert.equal(isDocumentationOnly(['README.md','docs/CURRENT_STATE.md','plans/x.mdx']),true);
  for(const files of [[],null,undefined,['README.md','src/app.js'],
    ['README.md','.github/workflows/quality.yml'],['docs/guide.md','scripts/ci-change-scope.mjs'],
    ['docs/guide.md','supabase/migrations/2026.sql'],['README.md\0src/x.js'],['README.MD']])
    assert.equal(isDocumentationOnly(files),false,JSON.stringify(files));
});

test('manual dispatch, unknown base or code change forces full suite',()=>{
  const input={eventName:'pull_request',knownBase:true,changedPaths:['README.md']};
  assert.equal(chooseCheckScope(input),'docs');
  assert.equal(chooseCheckScope({...input,knownBase:false}),'full');
  assert.equal(chooseCheckScope({...input,eventName:'workflow_dispatch'}),'full');
  assert.equal(chooseCheckScope({...input,eventName:'push'}),'full');
  assert.equal(chooseCheckScope({...input,changedPaths:[]}),'full');
  assert.equal(chooseCheckScope({...input,changedPaths:['README.md','package-lock.json']}),'full');
});
