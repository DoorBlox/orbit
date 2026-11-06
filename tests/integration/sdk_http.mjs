import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';
import { createCloudRepository } from '../../src/cloud/repository.js';
import { createSyncController } from '../../src/cloud/sync.js';

let input='';for await (const chunk of process.stdin)input+=chunk;
const config=JSON.parse(input);
const client=()=>createClient(config.base,config.anon,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
const owner=client(),other=client(),anonymous=client(),second=client();
const authenticate=async(instance,session)=>{
 const result=await instance.auth.setSession({access_token:session.access_token,refresh_token:session.refresh_token});
 assert.equal(result.error,null,'Real SDK session validation failed');
};
await authenticate(owner,config.owner);await authenticate(second,config.owner);await authenticate(other,config.other);
const options={sanitizeHtml:value=>value}; // Only known-safe synthetic HTML is supplied here; browser sanitizer has separate adversarial tests.
const repo=createCloudRepository(owner,{...options,ownerId:config.owner.user.id});
const otherRepo=createCloudRepository(other,{...options,ownerId:config.other.user.id});
const publicRepo=createCloudRepository(anonymous,options);
const fresh=await repo.loadOwnerSnapshot();assert.equal(fresh.revision,0);assert.deepEqual(fresh.snapshot.tasks,[]);
await assert.rejects(otherRepo.loadOwnerSnapshot(),error=>error.code==='FORBIDDEN');
for(const instance of [anonymous,other]){
 const result=await instance.from('tasks').select('id,title');
 assert.ok(result.error||result.data.length===0,'Nonowner gained private task access');
}
console.log('PASS actual Auth-issued owner/nonowner/anon identity and private REST denial');
const snapshot={branches:[{id:'inbox',parentId:'root',label:'Unsorted'},{id:'just-because',parentId:'root',label:'Just Because'}],
 tasks:[{id:'http-task',projectId:'inbox',title:'Real HTTP saved task',urgency:2,status:'ready',dueDate:'2026-11-02'}],
 journalEntries:[{id:'http-page',date:'2026-11-01',title:'Synthetic private journal',html:'<p>Synthetic private HTTP journal.</p>'}],
 milestones:[{id:'http-mark',title:'Synthetic marker',date:'2026-11-02'}],spatialLayout:{journal:{x:930,y:1780,width:446,height:800}},
 preferences:{colorMode:'urgency',timezone:'Asia/Jakarta'},profile:{displayName:'Synthetic integration owner'}};
const saved=await repo.saveSnapshot(snapshot,0);
const loaded=await repo.loadOwnerSnapshot();assert.equal(loaded.revision,saved.revision);
assert.equal(loaded.snapshot.tasks[0].title,snapshot.tasks[0].title);
assert.equal(loaded.snapshot.journalEntries[0].html,snapshot.journalEntries[0].html);
assert.equal(loaded.snapshot.milestones[0].title,snapshot.milestones[0].title);
assert.equal(loaded.snapshot.spatialLayout.journal.width,446);assert.equal(loaded.snapshot.preferences.colorMode,'urgency');
assert.equal(loaded.snapshot.profile.displayName,snapshot.profile.displayName);
const direct=await fetch(config.base+'/rest/v1/rpc/save_owner_snapshot',{method:'POST',headers:{'Content-Type':'application/json',apikey:config.anon,Authorization:'Bearer '+config.owner.access_token},body:JSON.stringify({p_snapshot:loaded.snapshot,p_expected_revision:0})});
assert.equal(direct.status,409);assert.equal((await direct.json()).code,'PT409');
const staleRaw=await owner.rpc('save_owner_snapshot',{p_snapshot:loaded.snapshot,p_expected_revision:0});
assert.equal(staleRaw.error?.code,'PT409');assert.equal(staleRaw.status,409);
await assert.rejects(repo.saveSnapshot(snapshot,0),error=>error.code==='CONFLICT');
const forged=await owner.from('tasks').insert({owner_id:config.other.user.id,id:'forged',project_id:'inbox',title:'forged'});
assert.ok(forged.error,'Forged owner row was accepted');
for(const instance of [anonymous,other])for(const table of ['profiles','branches','tasks','journal_entries','milestones','widget_layouts','preferences']){
 const denied=await instance.from(table).select('*');
 assert.ok(denied.error||denied.data.length===0,'Private table exposed after owner data exists: '+table);
}
console.log('PASS all model entities persist over actual PostgREST RPC; stale CAS and forged owner rejected');
const repo2=createCloudRepository(second,{...options,ownerId:config.owner.user.id});
const base=await repo2.loadOwnerSnapshot();
const a=createSyncController({repository:repo,initialRevision:base.revision,pollMs:0,eventTarget:null,debounceMs:10000});
const b=createSyncController({repository:repo2,initialRevision:base.revision,pollMs:0,eventTarget:null,debounceMs:10000});
try{
 const one=structuredClone(base.snapshot),two=structuredClone(base.snapshot);
 one.tasks.push({id:'http-session-a',projectId:'inbox',title:'From session A'});two.tasks.push({id:'http-session-b',projectId:'inbox',title:'From session B'});
 a.queue(one);b.queue(two);const results=await Promise.all([a.flush(),b.flush()]);
 assert.equal(results.filter(result=>result.ok).length,1,'Expected one concurrent successful commit');
 assert.equal([a,b].filter(controller=>controller.getState().state==='conflict').length,1);
 const conflict=[a,b].find(controller=>controller.getState().state==='conflict');assert.ok(conflict.getPendingSnapshot());
 await conflict.discardPendingAndReload();assert.equal(conflict.getState().state,'saved');
}finally{a.dispose();b.dispose();}
console.log('PASS actual two-session SDK sync CAS: one commit, one retained conflict draft, explicit reload');
const publication=await repo.publishContent({kind:'task',sourceId:'http-task',expectedTitle:'Real HTTP saved task',excerpt:'Explicit synthetic public excerpt',publicationDate:'2026-11-01'});
assert.equal(publication.title,'Real HTTP saved task');assert.equal(publication.source_id,undefined);
assert.deepEqual(await publicRepo.loadPublicContent(),[],'Public gate must remain false by default');
await assert.rejects(otherRepo.publishContent({kind:'task',sourceId:'http-task',expectedTitle:'Real HTTP saved task'}),error=>error.code==='FORBIDDEN');
console.log('PASS actual explicit publication projection; default public gate and nonowner publish denied');
// Clients use memory-only sessions and no refresh timer; process exit clears them.
// Keep the real Auth session active for the following browser restore check.
