import test from 'node:test';
import assert from 'node:assert/strict';
import {parseTaskChecklist,normalizeTaskChecklist,taskChecklistLines} from '../src/model.js';
test('task checklist supports checked and unchecked lines without touching task SQL rows',()=>{
  const items=parseTaskChecklist('- [x] Research\n- [ ] Write\nPresent');
  assert.deepEqual(items,[{text:'Research',done:true},{text:'Write',done:false},{text:'Present',done:false}]);
  assert.equal(taskChecklistLines(items),'- [x] Research\n- [ ] Write\n- [ ] Present');
  assert.deepEqual(normalizeTaskChecklist(items),items);
});
test('invalid checklists cannot pollute private workspace extensions',()=>{
  assert.throws(()=>parseTaskChecklist('a\n'.repeat(32)),/30/);
  assert.throws(()=>normalizeTaskChecklist([{text:'',done:true}]),/Invalid/);
  assert.throws(()=>normalizeTaskChecklist([{text:'safe',done:'false'}]),/Invalid/);
});
