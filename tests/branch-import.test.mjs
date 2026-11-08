import test from 'node:test';
import assert from 'node:assert/strict';
import {importBranchesCsv,exportBranchesCsv,parseCsv} from '../src/csv.js';

const existing=[
  {id:'inbox',parentId:'root',label:'Unsorted'},
  {id:'just-because',parentId:'root',label:'Just Because',color:'#8B86CF'},
];
const first={id:'club',parentId:'root',label:'School club',color:'#6597E6'};
const nested={id:'meeting',parentId:'club',label:'Meeting prep'};

test('branch CSV export/import preserves stable IDs, nesting and optional colors',()=>{
  const exported=exportBranchesCsv([first,nested]);
  assert.match(exported,/id,parent_id,label,color/);
  const imported=importBranchesCsv(exported,existing);
  assert.deepEqual(imported,{branches:[first,nested],omitted:0});
  assert.deepEqual(importBranchesCsv(exported,[...existing,first,nested]),{branches:[],omitted:2});
});
test('CSV imports child before parent and can refer to existing branches',()=>{
  const raw='id,parent_id,label\nmeeting,club,Meeting prep\nclub,root,School club\nunder-inbox,inbox,Use existing\n';
  const result=importBranchesCsv(raw,existing);
  assert.deepEqual(result.branches.map(b=>b.id),['meeting','club','under-inbox']);
});
test('validates entire branch file before any branch is returned',()=>{
  const samples=[
    'id,parent_id,label\ncycle-a,cycle-b,A\ncycle-b,cycle-a,B\n',
    'id,parent_id,label\norphan,missing,Orphan\n',
    'id,parent_id,label\nclub,root,A\nclub,root,B\n',
    'id,parent_id,label\nroot,root,Bad\n',
    'id,parent_id,label\n__proto__,root,Bad\n',
    'id,parent_id,label\nclub,root,\n',
    'id,parent_id,label,color\nclub,root,A,red\n',
    'id,parent_id,label\ninbox,root,Different title\n',
    'id,parent_id,label\nclub,root,A,unexpected-column\n',
    'id,id,parent_id,label\nclub,club,root,A\n',
  ];
  for(const raw of samples)assert.throws(()=>importBranchesCsv(raw,existing),raw.slice(0,60));
});
test('branch CSV protects formula-like labels in spreadsheet exports',()=>{
  const text=exportBranchesCsv([{id:'safe',parentId:'root',label:'=HYPERLINK("unsafe")'}]);
  assert.ok(parseCsv(text)[1][2].startsWith("'="));
});
test('refuses oversized branch import even when every row would be valid',()=>{
  const large='id,parent_id,label\n'+Array.from({length:4001},(_,i)=>`item-${i},root,Label`).join('\n');
  assert.throws(()=>importBranchesCsv(large,existing),/limit/i);
});
