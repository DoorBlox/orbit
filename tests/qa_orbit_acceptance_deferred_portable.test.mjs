import test from 'node:test';
import assert from 'node:assert/strict';
import { createSyncController } from '../src/cloud/sync.js';
import {
  createPortableArchive, inspectPortableArchive, rehydratePortableArchive
} from '../src/cloud/portable-backup.js';

// Synthetic cross-feature acceptance only. There are no hosted accounts,
// Supabase calls, actual user files, public deployments, or paid services.
const SOURCE='11111111-1111-4111-8111-111111111111';
const TARGET='22222222-2222-4222-8222-222222222222';
const ATTACHED=SOURCE+'/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.png';
const DETACHED=SOURCE+'/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb.png';
const TARGET_ATTACHED=TARGET+'/cccccccc-cccc-4ccc-8ccc-cccccccccccc.png';
const TARGET_DETACHED=TARGET+'/dddddddd-dddd-4ddd-8ddd-dddddddddddd.png';
const bytes=marker=>new Blob([Uint8Array.from([
  137,80,78,71,13,10,26,10,0,0,0,marker
])],{type:'image/png'});
const snapshot=epoch=>{
  const scene={type:'excalidraw',version:2,
    appState:{viewBackgroundColor:'#f9edda'},
    elements:[{id:'shape_1',type:'image',fileId:'file_1',x:epoch,y:32,
      width:180,height:120}],
    files:{file_1:{path:ATTACHED,mimeType:'image/png'}}};
  return {
    format:'orbit-backup',version:6,
    profile:{displayName:'W6 synthetic owner'},
    branches:[
      {id:'inbox',parentId:'root',label:'Unsorted'},
      {id:'research',parentId:'root',label:'Research'}
    ],
    tasks:[{id:'task_1',projectId:'research',title:'Task '+epoch}],
    milestones:[{id:'global_1',title:'Global '+epoch,date:'2026-11-13'}],
    journalEntries:[{id:'page_1',date:'2026-11-13',
      title:'Journal '+epoch,html:'<p>Journal '+epoch+'</p>',
      createdAt:'2026-11-13T00:00:00Z'}],
    spatialLayout:{},
    preferences:{colorMode:'deadline'},
    extensions:{
      notes:[{id:'note_1',title:'Synthetic sticky',text:'Sticky '+epoch,
        x:40,y:70,width:320,height:250,color:'mint',
        imagePath:ATTACHED,scene:structuredClone(scene)}],
      journalImages:{page_1:ATTACHED},
      journalScenes:{page_1:structuredClone(scene)},
      taskLinks:{},
      projects:{research:{
        description:'Project '+epoch,status:'active',goal:'Goal '+epoch,
        links:[{label:'Synthetic reference',url:'https://example.invalid/brief'}],
        milestones:[{id:'phase_1',title:'Phase '+epoch,
          targetDate:'2026-11-20',done:false}]
      }}
    }
  };
};
function assertEpoch(value,epoch){
  assert.equal(value.tasks[0].title,'Task '+epoch);
  assert.equal(value.journalEntries[0].title,'Journal '+epoch);
  assert.equal(value.journalEntries[0].html,'<p>Journal '+epoch+'</p>');
  assert.equal(value.extensions.notes[0].text,'Sticky '+epoch);
  assert.equal(value.extensions.projects.research.description,'Project '+epoch);
  assert.equal(value.extensions.projects.research.milestones[0].title,'Phase '+epoch);
  assert.equal(value.extensions.notes[0].scene.elements[0].x,epoch);
  assert.equal(value.extensions.journalScenes.page_1.elements[0].x,epoch);
  assert.equal(value.extensions.notes[0].imagePath,
    value.extensions.journalImages.page_1);
  assert.equal(value.extensions.journalScenes.page_1.files.file_1.path,
    value.extensions.notes[0].imagePath);
}
const make=(repository,options={})=>createSyncController({
  repository,initialRevision:0,pollMs:0,debounceMs:60000,
  eventTarget:null,visibilityTarget:null,...options
});
const sanitizeHtml=html=>html;

test('W6: deferred multi-feature storm -> failed CAS -> complete portable recovery -> newer retry',async()=>{
  const attempts=[];
  let confirmed=snapshot(0),revision=0,captures=0;
  const repository={
    async saveSnapshot(value,expectedRevision){
      attempts.push({snapshot:structuredClone(value),revision:expectedRevision});
      if(attempts.length===1)
        throw Object.assign(Error('synthetic transient outage'),{code:'NETWORK'});
      if(expectedRevision!==revision)
        throw Object.assign(Error('synthetic CAS conflict'),{code:'CONFLICT'});
      confirmed=structuredClone(value);
      return {revision:++revision};
    },
    async loadOwnerSnapshot(){
      return {revision,snapshot:structuredClone(confirmed)};
    }
  };
  const c=make(repository);
  let live=snapshot(0);
  try{
    for(let epoch=1;epoch<=120;epoch++){
      live=snapshot(epoch);
      assert.equal(c.queueDeferredOwned(()=>{captures++;return structuredClone(live);}),true);
    }
    assert.equal(captures,0,'Rapid typing must not clone an entire multi-feature workspace each time');
    assert.equal(c.getState().hasPending,true);
    assert.equal((await c.flush()).ok,false,'Transient network failure must not claim cloud ACK');
    assert.equal(captures,1);
    assert.equal(revision,0,'Cloud source must remain unchanged while offline');
    assertEpoch(attempts[0].snapshot,120);
    assert.equal(attempts[0].revision,0);
    const recoverable=c.getPendingSnapshot();
    assertEpoch(recoverable,120);

    // A mutable UI view must not rewrite a failed/acknowledgment-pending draft.
    live.tasks[0].title='Unqueued transient rendering change';
    live.extensions.notes[0].text='Unqueued transient rendering change';
    assertEpoch(c.getPendingSnapshot(),120);
    assert.equal(captures,1);

    const files=new Map([[ATTACHED,bytes(4)],[DETACHED,bytes(8)]]);
    const downloads=[];
    const archive=await createPortableArchive(recoverable,{
      ownerId:SOURCE,sanitizeHtml,libraryPaths:[DETACHED],
      async download(path){
        downloads.push(path);
        assert.equal(path.split('/')[0],SOURCE);
        assert.ok(files.has(path));
        return files.get(path);
      }
    });
    assert.equal(archive.manifest.assetCount,2);
    assert.deepEqual(archive.manifest.libraryOnlyPaths,[DETACHED]);
    assert.deepEqual(downloads.sort(),[ATTACHED,DETACHED].sort(),
      'Shared Journal/Sticky/Excalidraw references must deduplicate download work');
    const reviewed=await inspectPortableArchive(JSON.stringify(archive),{sanitizeHtml});
    assertEpoch(reviewed.snapshot,120);
    assert.equal(reviewed.files.length,2);

    // A new legitimate edit supersedes the failed draft; the exported artifact
    // remains its own recoverable, immutable copy of the earlier offline state.
    live=snapshot(121);
    assert.equal(c.queueDeferredOwned(()=>{captures++;return structuredClone(live);}),true);
    assert.equal((await c.retry()).ok,true);
    assert.equal(captures,2);
    assert.equal(revision,1);
    assert.equal(c.getState().hasPending,false);
    assertEpoch(confirmed,121);
    assert.deepEqual(attempts.map(a=>a.revision),[0,0]);
    assertEpoch(attempts[1].snapshot,121);
    assertEpoch(reviewed.snapshot,120);

    const storage=new Map(), uploaded=[];
    const targets=[TARGET_ATTACHED,TARGET_DETACHED];
    const restored=await rehydratePortableArchive(reviewed,{
      ownerId:TARGET,
      async upload(blob){
        const path=targets[uploaded.length];
        assert.ok(path,'Unexpected private image upload');
        uploaded.push(path);
        storage.set(path,new Blob([blob],{type:blob.type}));
        return path;
      }
    });
    assert.equal(uploaded.length,2);
    assertEpoch(restored,120);
    assert.ok(restored.extensions.notes[0].imagePath.startsWith(TARGET+'/'));
    assert.equal(JSON.stringify(restored).includes(SOURCE),false,
      'Restored private workspace must not include another owner media path');
    assert.deepEqual([...new Uint8Array(await storage.get(TARGET_ATTACHED).arrayBuffer())],
      [...new Uint8Array(await files.get(ATTACHED).arrayBuffer())]);
    assert.deepEqual([...new Uint8Array(await storage.get(TARGET_DETACHED).arrayBuffer())],
      [...new Uint8Array(await files.get(DETACHED).arrayBuffer())]);

    let reopened;
    const next=make(repository,{onSnapshot:value=>{reopened=value;}});
    try{
      assert.equal((await next.refresh()).changed,true);
      assertEpoch(reopened,121,'Newer cloud ACK, not the recovery export, owns the current state');
    }finally{next.dispose();}
  }finally{c.dispose();}
});

test('W6: reentrant deferred export cannot mix old Task with newer Journal/Sticky/Project',async()=>{
  const writes=[];
  const repository={
    async saveSnapshot(value,revision){
      writes.push({snapshot:structuredClone(value),revision});
      return {revision:revision+1};
    },
    async loadOwnerSnapshot(){throw Error('Unexpected full remote read');}
  };
  const c=make(repository);
  let firstCaptures=0,latestCaptures=0;
  try{
    c.queueDeferredOwned(()=>{
      firstCaptures++;
      // A synchronous editor commit can trigger a second queued update while
      // snapshotting. The recovery export must represent ONE coherent epoch.
      c.queueDeferredOwned(()=>{latestCaptures++;return snapshot(2);});
      return snapshot(1);
    });
    const exportCopy=c.getPendingSnapshot();
    assertEpoch(exportCopy,2);
    exportCopy.tasks[0].title='Tampered external recovery copy';
    assertEpoch(c.getPendingSnapshot(),2);
    assert.equal(firstCaptures,1);
    assert.equal(latestCaptures,1);
    assert.equal((await c.flush()).ok,true);
    assert.equal(writes.length,1);
    assert.equal(writes[0].revision,0);
    assertEpoch(writes[0].snapshot,2);
  }finally{c.dispose();}
});
