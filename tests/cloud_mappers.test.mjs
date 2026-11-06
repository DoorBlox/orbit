import test from 'node:test';
import assert from 'node:assert/strict';
import { toBranchRow, fromBranchRow, toTaskRow, fromTaskRow, toMilestoneRow, fromMilestoneRow,
 toJournalRow, fromJournalRow, toLayoutRows, fromLayoutRows, toPreferencesRow, fromPreferencesRow
} from '../src/cloud/mappers.js';
import {resolveCloudConfig} from '../src/cloud/client-config.js';
const owner='11111111-1111-4111-8111-111111111111';
test('preserves V6 root branch and existing string IDs',()=>{
 const b={id:'inbox',parentId:'root',label:'Unsorted'};
 assert.deepEqual(fromBranchRow(toBranchRow(b,owner)),b);
});
test('task fields survive adapter with null date, parent and status',()=>{
 const t={id:'demo-xyz',projectId:'inbox',title:'Read article',urgency:3,status:'waiting',criteria:'Check DOI',description:'',resourceUrl:'https://example.org/doi',effortMinutes:45};
 const row=toTaskRow(t,owner);
 assert.equal(row.owner_id,owner);assert.equal(row.due_date,null);assert.equal(row.project_id,'inbox');
 const result=fromTaskRow(row);assert.equal(result.id,t.id);assert.equal(result.status,t.status);assert.equal(result.criteria,t.criteria);
});
test('milestone and journal date mapping retains values',()=>{
 assert.deepEqual(fromMilestoneRow(toMilestoneRow({id:'m1',date:'2026-12-01',title:'Finish'},owner)),{id:'m1',date:'2026-12-01',title:'Finish'});
 const j={id:'j1',date:'2026-11-01',title:'Day',html:'<p>Hi</p>',createdAt:'2026-11-01T00:00:00Z',updatedAt:'2026-11-01T00:00:00Z'};
 assert.deepEqual(fromJournalRow(toJournalRow(j,owner)),j);
});
test('widget sizes and color mode survive mapping',()=>{
 const layout={timeline:{x:45,y:12,width:1200,height:540},journal:{x:20,y:30}};
 assert.deepEqual(fromLayoutRows(toLayoutRows(layout,owner)),layout);
 assert.deepEqual(fromPreferencesRow(toPreferencesRow({colorMode:'urgency'},owner)),{colorMode:'urgency'});
});
test('no secret or untrusted host accepted in public client config',()=>{
 assert.throws(()=>resolveCloudConfig({url:'javascript:alert(1)',publishableKey:'pk'}));
 assert.throws(()=>resolveCloudConfig({url:'http://example.com',publishableKey:'pk'}));
 assert.deepEqual(resolveCloudConfig({url:'https://example.supabase.co',publishableKey:'sb_publishable_demo'}).url,'https://example.supabase.co');
});
