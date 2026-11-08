import test from 'node:test';
import assert from 'node:assert/strict';
import {cleanTask,normalizeTaskLinks,parseTaskLinks,validateHttpUrl} from '../src/model.js';
test('task references accept up to twelve labeled links with stable normalization',()=>{
  const list=parseTaskLinks('Research | https://example.com/research\nhttps://example.org/notes');
  assert.equal(list.length,2);
  assert.deepEqual(cleanTask({title:'Read paper',links:list}).links,list);
  assert.equal(list[0].label,'Research');
  assert.equal(list[1].label,'example.org');
});
test('task references reject executable links, credentials and oversize lists',()=>{
  for(const url of ['javascript:alert(1)','data:text/html,test','https://user:secret@example.com/']){
    assert.equal(validateHttpUrl(url),'');
    assert.throws(()=>normalizeTaskLinks([{label:'Unsafe',url}]));
  }
  assert.throws(()=>parseTaskLinks(Array.from({length:13},()=> 'https://example.com/').join('\n')));
  assert.throws(()=>normalizeTaskLinks([{label:'x',url:42}]));
});
