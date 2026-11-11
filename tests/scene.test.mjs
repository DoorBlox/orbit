import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyScene,normalizeScene,normalizeExtensions,scenePreviewBounds} from '../src/scene.js';

const note=(extra={})=>({id:'note_one',title:'A note',text:'Private text',x:1500,y:1500,
  width:310,height:270,color:'sand',...extra});
test('empty Excalidraw scene and private note/scene data roundtrip',()=>{
  const scene=emptyScene();scene.elements.push({id:'pen_1',type:'freedraw',x:2,y:3,width:30,height:14,
    points:[[0,0],[30,14]],strokeColor:'#785C45'});
  const extensions=normalizeExtensions({notes:[note({scene})],
    taskLinks:{task_1:[{label:'Paper',url:'https://example.org/article'}]},journalScenes:{journal_1:scene}});
  assert.equal(extensions.notes[0].scene.elements[0].points.length,2);
  assert.equal(extensions.journalScenes.journal_1.type,'excalidraw');
  assert.equal(extensions.taskLinks.task_1[0].url,'https://example.org/article');
});
test('drawing scenes reject oversized embedded binary payloads, malformed geometry and unsupported types',()=>{
  for(const bad of [
    {...emptyScene(),files:{private_image:{dataURL:'data:image/png;base64,test'}}},
    {...emptyScene(),type:'something-else'},
    {...emptyScene(),elements:[{id:'x',type:'line',x:0,y:0,width:0,height:0,points:[[0,Infinity]]}]},
    {...emptyScene(),elements:Array.from({length:401},(_,i)=>({id:'item'+i,type:'rectangle',x:0,y:0,width:2,height:2}))}
  ])assert.throws(()=>normalizeScene(bad));
});
test('extensions reject invalid note IDs, oversize text and malicious task references',()=>{
  for(const invalid of [
    {notes:[note(),note()]},
    {notes:[note({id:'__proto__'})],taskLinks:{}},
    {notes:[note({text:'X'.repeat(6001)})]},
    {taskLinks:{task_1:[{label:'Danger',url:'javascript:alert(1)'}]}},
    {taskLinks:{task_1:[{label:'Credentials',url:'https://user:password@example.com/private'}]}},
    {journalScenes:{bad: {...emptyScene(),files:{file:{}}}}}
  ])assert.throws(()=>normalizeExtensions(invalid));
  assert.deepEqual(normalizeExtensions({}),{notes:[],taskLinks:{},taskChecklists:{},journalScenes:{},journalImages:{},spatialWidgets:{},projects:{},appearance:{theme:'parchment',motion:'system',ambient:false}});
});

test('workspace appearance is normalized, persisted and protected against unsupported values',()=>{
  const original=normalizeExtensions({appearance:{theme:'garden',motion:'off'}});
  assert.deepEqual(original.appearance,{theme:'garden',motion:'off',ambient:false});
  assert.deepEqual(normalizeExtensions(original).appearance,original.appearance);
  for(const appearance of [{theme:'javascript:alert(1)'},{motion:'endless'}, {ambient:'yes'},'dark'])
    assert.throws(()=>normalizeExtensions({appearance}),/Invalid workspace appearance/);
});

test('ten curated themes retain their exact ID and optional ambient animation',()=>{
  for(const theme of ['parchment','garden','frost','celestial','ember','tidepool','sundown','sakura','graphite','linen']){
    const actual=normalizeExtensions({appearance:{theme,ambient:true,motion:'system'}});
    assert.deepEqual(actual.appearance,{theme,ambient:true,motion:'system'});
  }
});

test('account-scoped task checklists survive extension normalization without SQL schema changes',()=>{
  const checklist=[{text:'Collect notes',done:true},{text:'Write summary',done:false}];
  const result=normalizeExtensions({taskChecklists:{task_1:checklist}});
  assert.deepEqual(result.taskChecklists.task_1,checklist);
  assert.deepEqual(normalizeExtensions(result).taskChecklists.task_1,checklist);
  for(const invalid of [[{text:'oops',done:'yes'}],Array.from({length:31},()=>({text:'Too many',done:false}))]){
    assert.throws(()=>normalizeExtensions({taskChecklists:{task_1:invalid}}));
  }
});


test('SP-01B private optional layout survives extension normalization without leaking into legacy window positions',()=>{
  const raw={spatialWidgets:{projects:{x:2460,y:330,width:440,height:290,hidden:true}}};
  const first=normalizeExtensions(raw);
  assert.deepEqual(first.spatialWidgets,raw.spatialWidgets);
  assert.deepEqual(normalizeExtensions(first).spatialWidgets,first.spatialWidgets);
  assert.throws(()=>normalizeExtensions({spatialWidgets:{journal:{x:0,y:0}}}),/widget/i);
});


test('PJ-01 project metadata remains private and normalized inside account extensions',()=>{
  const privateMetadata={research:{description:'Private research notes',status:'active',
    links:[{label:'Lab',url:'https://example.org/lab'}]}};
  const actual=normalizeExtensions({projects:privateMetadata});
  assert.deepEqual(actual.projects,privateMetadata);
  assert.deepEqual(normalizeExtensions(actual).projects,actual.projects);
  assert.throws(()=>normalizeExtensions({projects:{research:{visibility:'public'}}}),/project/i);
});

test('BP-06 drawing preview fits positive, negative and distant Excalidraw elements',()=>{
  const scene=emptyScene();
  scene.elements=[
    {id:'a',type:'rectangle',x:-2450,y:1200,width:40,height:30},
    {id:'b',type:'freedraw',x:100,y:-1800,width:0,height:0,points:[[-200,-30],[340,260]]},
    {id:'c',type:'text',x:5100,y:2650,width:120,height:120,fontSize:40,text:'Canvas notes'},
    {id:'z',type:'rectangle',x:9000,y:8000,width:400,height:300,isDeleted:true},
  ];
  const bounds=scenePreviewBounds(scene);
  assert.ok(bounds.x<=-2450&&bounds.y<=-1830);
  assert.ok(bounds.x+bounds.width>=5220&&bounds.y+bounds.height>=2770);
  assert.ok(bounds.x+bounds.width<9000,'deleted objects never expand visible canvas');
  const copy=structuredClone(scene);
  scenePreviewBounds(scene);
  assert.deepEqual(scene,copy,'view fitting never mutates private scene data');
});
test('BP-06 preview stays sensible for empty/dot/vertical drawings',()=>{
  assert.deepEqual(scenePreviewBounds(null),{x:0,y:0,width:800,height:460});
  const s=emptyScene();s.elements=[{id:'dot',type:'freedraw',x:1,y:2,width:0,height:0,points:[[0,0]]}];
  const box=scenePreviewBounds(s);
  assert.ok(box.width>=180&&box.height>=132);
  assert.ok(box.x<=1&&box.y<=2);
  s.elements=[{id:'v',type:'line',x:4,y:5,width:0,height:0,points:[[0,0],[0,-700]]}];
  assert.ok(scenePreviewBounds(s).y<=-695);
});

test('BP-06 Sticky Write/Canvas view mode is optional, reversible and never erases hidden content',()=>{
  const scene=emptyScene();
  scene.elements=[{id:'box',type:'rectangle',x:-400,y:900,width:120,height:80}];
  const imagePath='11111111-1111-4111-8111-111111111111/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.png';
  const initial=note({text:'Private **writing**',scene,imagePath});
  const old=normalizeExtensions({notes:[initial]}).notes[0];
  assert.equal(Object.hasOwn(old,'mode'),false,'old notes remain Write by default');
  const canvas=normalizeExtensions({notes:[{...old,mode:'canvas'}]}).notes[0];
  assert.equal(canvas.mode,'canvas');
  assert.equal(canvas.text,old.text,'switching into canvas never clears writing');
  assert.deepEqual(canvas.scene,old.scene,'scene preserved without rendering crop');
  assert.equal(canvas.imagePath,old.imagePath,'original private attachment is preserved');
  const back=normalizeExtensions({notes:[{...canvas,mode:'write'}]}).notes[0];
  assert.equal(Object.hasOwn(back,'mode'),false,'Write is the legacy-compatible default');
  assert.equal(back.text,old.text);
  assert.deepEqual(back.scene,old.scene);
  assert.equal(back.imagePath,old.imagePath);
  assert.throws(()=>normalizeExtensions({notes:[note({mode:'<script>alert(1)</script>'})]}),/sticky/i);
  assert.throws(()=>normalizeExtensions({notes:[note({mode:{value:'canvas'}})]}),/sticky/i);
});

test('BP-13 Journal Write/Canvas view modes remain private, reversible and portable',()=>{
  const scene=emptyScene();scene.elements=[{id:'text_1',type:'text',x:90,y:-100,width:110,height:35,text:'Canvas note'}];
  const plain=normalizeExtensions({journalScenes:{journal_1:scene}});
  assert.equal(Object.hasOwn(plain,'journalModes'),false,'legacy journals remain Write without schema churn');
  const canvas=normalizeExtensions({...plain,journalModes:{journal_1:'canvas'}});
  assert.deepEqual(canvas.journalModes,{journal_1:'canvas'});
  assert.deepEqual(canvas.journalScenes.journal_1,plain.journalScenes.journal_1);
  assert.deepEqual(normalizeExtensions(canvas),canvas);
  const writing=structuredClone(canvas);delete writing.journalModes.journal_1;
  const roundtrip=normalizeExtensions(writing);
  assert.equal(Object.hasOwn(roundtrip,'journalModes'),false);
  assert.deepEqual(roundtrip.journalScenes,plain.journalScenes,'switching to Write cannot erase canvas');
  assert.throws(()=>normalizeExtensions({journalModes:{journal_1:'script'}}),/journal/i);
  assert.throws(()=>normalizeExtensions({journalModes:{__proto__:'canvas',good:'invalid'}}),/journal/i);
});
