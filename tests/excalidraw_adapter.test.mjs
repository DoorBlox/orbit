import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyScene } from '../src/scene.js';
import { createEmbeddedInitialData, captureEmbeddedScene, loadEmbeddedFiles,
  captureEmbeddedSceneWithMedia, embeddedEditorOptions, embeddedEditorTheme } from '../src/excalidraw-adapter.js';

const pen=()=>({id:'orbit_pen_1',type:'freedraw',x:2,y:3,width:30,height:14,points:[[0,0],[30,14]],
  strokeColor:'#785C45',backgroundColor:'transparent',angle:0});
const rectangle=()=>({id:'orbit_rect_1',type:'rectangle',x:40,y:50,width:120,height:60,
  strokeColor:'#123456',backgroundColor:'transparent'});

test('EX-00: legacy ORBIT drawing opens as true Excalidraw initialData without mutation',()=>{
  const scene=emptyScene();scene.elements=[pen(),rectangle()];
  scene.appState={viewBackgroundColor:'#f9edda'};
  const original=structuredClone(scene);
  const data=createEmbeddedInitialData(scene);
  assert.equal(data.elements.length,2);
  assert.deepEqual(data.files,{});
  assert.equal(data.appState.viewBackgroundColor,'#f9edda');
  assert.deepEqual(scene,original);
  data.elements[0].x=999;
  assert.equal(scene.elements[0].x,2);
});

test('EX-00: new workspace gets a neutral, empty scene; no app or account is mounted',()=>{
  const initial=createEmbeddedInitialData(null);
  assert.deepEqual(initial.elements,[]);
  assert.deepEqual(initial.files,{});
  assert.equal(initial.appState.viewBackgroundColor,'#f9edda');
  assert.equal(embeddedEditorTheme('graphite'),'dark');
  assert.equal(embeddedEditorTheme('garden'),'dark');
  assert.equal(embeddedEditorTheme('linen'),'light');
  assert.equal(embeddedEditorTheme('unrecognized'),'light');
});

test('EX-00: save converts official onChange signature into stable bounded v2 scene',()=>{
  const transientAppState={viewBackgroundColor:'#ffeecc',collaborators:new Map([['private',{email:'a@private.test'}]]),
    selectedElementIds:{orbit_pen_1:true},openMenu:'hidden',viewModeEnabled:false};
  const original=[pen(),rectangle(),{...rectangle(),id:'deleted_1',isDeleted:true}];
  const result=captureEmbeddedScene(original,transientAppState,{});
  assert.equal(result.type,'excalidraw');
  assert.equal(result.version,2);
  assert.equal(result.source,'https://orbit.starscene.com/');
  assert.equal(result.elements.length,2);
  assert.equal(result.appState.viewBackgroundColor,'#ffeecc');
  assert.deepEqual(result.files,{});
  assert.equal(JSON.stringify(result).includes('private.test'),false);
  assert.equal(JSON.stringify(result).includes('selectedElementIds'),false);
});

test('EX-00: a saved scene is directly compatible with current sticky/journal validator',()=>{
  const scene=captureEmbeddedScene([rectangle(),pen()],{viewBackgroundColor:'#fffaee'},{});
  const reread=createEmbeddedInitialData(scene);
  assert.deepEqual(reread.elements,scene.elements);
  assert.deepEqual(reread.appState,scene.appState);
});

test('EX-00: deny image bytes, image elements, remote frames, links with credentials, and unsafe URLs',()=>{
  const errors=[
    [[pen()],{}, {secret:{dataURL:'data:image/png;base64,...'}}],
    [[{...pen(),type:'image'}],{},{}],
    [[{...pen(),type:'embeddable'}],{},{}],
    [[{...pen(),type:'iframe'}],{},{}],
    [[{...rectangle(),link:'javascript:alert(1)'}],{},{}],
    [[{...rectangle(),link:'https://alice:secret@host.test/'}],{},{}],
    [[{...pen(),id:'__proto__'}],{},{}],
    [[{...pen(),x:Infinity}],{},{}],
  ];
  for(const [elements,appState,files] of errors)
    assert.throws(()=>captureEmbeddedScene(elements,appState,files),undefined,JSON.stringify([elements,appState]));
});

test('EX-00: malicious or oversize scene import fails before changing the existing drawing',()=>{
  const source=emptyScene();
  source.files={someImage:{dataURL:'data:image/png;base64,AA=='}};
  assert.throws(()=>createEmbeddedInitialData(source),/scene|files|drawing|image/i);
  assert.throws(()=>captureEmbeddedScene(Array.from({length:401},(_,i)=>({
    ...rectangle(),id:'shape_'+i})),{},{}),/drawing|scene|large/i);
  assert.throws(()=>captureEmbeddedScene([{...pen(),id:'duplicate'},{...rectangle(),id:'duplicate'}],{},{}),/duplicate/i);
});

test('EX-02: Excalidraw supports private images while disabling remote scene publishing',()=>{
  assert.equal(embeddedEditorOptions.tools.image,true);
  assert.equal(embeddedEditorOptions.canvasActions.loadScene,false);
  assert.equal(embeddedEditorOptions.canvasActions.saveToActiveFile,false);
  assert.equal(embeddedEditorOptions.canvasActions.export,false);
  assert.equal(embeddedEditorOptions.canvasActions.changeViewBackgroundColor,true);
  assert.equal(embeddedEditorOptions.canvasActions.clearCanvas,true);
});

test('EX-01: a legacy native pen click is retained as a tiny visible point, not erased',()=>{
  const legacy=emptyScene();
  legacy.elements=[{...pen(),x:32,y:44,width:0,height:0,points:[[0,0]],pressures:[]}];
  const unchanged=structuredClone(legacy);
  const initial=createEmbeddedInitialData(legacy);
  assert.equal(initial.elements.length,1);
  assert.equal(initial.elements[0].id,'orbit_pen_1');
  assert.equal(initial.elements[0].width,4);
  assert.equal(initial.elements[0].height,4);
  assert.deepEqual(initial.elements[0].points,[[0,0],[4,4]]);
  assert.deepEqual(initial.elements[0].pressures,[0.5,0.5]);
  assert.deepEqual(legacy,unchanged,'Original private scene must be immutable until explicit Save');
});

const OWNER='11111111-1111-4111-8111-111111111111';
const OTHER='22222222-2222-4222-8222-222222222222';
const PATH=OWNER+'/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.png';
const PNG=new Blob([Uint8Array.from([137,80,78,71,13,10,26,10,0,0,0,0])],{type:'image/png'});
const fileData=async()=>({id:'file_1',mimeType:'image/png',
  dataURL:'data:image/png;base64,'+btoa(String.fromCharCode(...new Uint8Array(await PNG.arrayBuffer()))),
  created:Date.now()});
const image=()=>({id:'image_1',type:'image',x:-450,y:90,width:320,height:180,fileId:'file_1',
  strokeColor:'#785C45',backgroundColor:'transparent',angle:0});

test('EX-02 private image placed freely in Excalidraw saves only owner-scoped file reference',async()=>{
  let uploads=0;
  const file=await fileData();
  const media={ownerId:OWNER,upload:async blob=>{
    uploads++;assert.equal(blob.type,'image/png');assert.equal(blob.size,12);return PATH;
  },download:async path=>{assert.equal(path,PATH);return PNG;}};
  const saved=await captureEmbeddedSceneWithMedia([image(),pen()],{viewBackgroundColor:'#eeddcc'},
    {file_1:file},{media,originalScene:null});
  assert.equal(uploads,1);
  assert.equal(saved.elements.length,2);
  assert.deepEqual(saved.files,{file_1:{path:PATH,mimeType:'image/png'}});
  assert.equal(saved.elements[0].status,'saved','image becomes durable only after confirmed Storage upload');
  assert.equal(JSON.stringify(saved).includes('data:image/'),false);
  const initial=createEmbeddedInitialData(saved);
  assert.equal(initial.elements[0].fileId,'file_1');
  const restored=await loadEmbeddedFiles(saved,{media});
  assert.equal(restored.file_1.mimeType,'image/png');
  assert.equal(restored.file_1.dataURL,file.dataURL);
  const unchanged=structuredClone(saved);
  const edit=await captureEmbeddedSceneWithMedia([{...image(),x:850,y:-690}],{},restored,
    {media,originalScene:saved});
  assert.equal(uploads,1,'repositioning existing images never reuploads private files');
  assert.equal(edit.elements[0].x,850);
  assert.equal(edit.elements[0].status,'saved','reloaded/repositioned image stays durable');
  assert.deepEqual(edit.files,saved.files);
  assert.deepEqual(saved,unchanged,'editor opens and saves clones; source snapshot never mutates');
});

test('EX-02 image save failure leaves prior scene intact and prevents foreign image references',async()=>{
  const existing=emptyScene();existing.elements=[rectangle()];
  const file=await fileData();
  let uploaded=0;
  const media={ownerId:OWNER,upload:async()=>{uploaded++;throw Error('offline');}};
  await assert.rejects(captureEmbeddedSceneWithMedia([image()],{}, {file_1:file},
    {media,originalScene:existing}),/offline/);
  assert.equal(uploaded,1);
  assert.deepEqual(existing.elements,[rectangle()]);
  const foreignScene=emptyScene();
  foreignScene.elements=[image()];
  foreignScene.files={file_1:{path:OTHER+'/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.png',mimeType:'image/png'}};
  await assert.rejects(captureEmbeddedSceneWithMedia([image()],{}, {file_1:file},
    {media:{ownerId:OWNER,upload:async()=>{throw Error('must not upload');}},originalScene:foreignScene}),
    /another account/i,'existing image IDs must never bypass owner isolation');
  await assert.rejects(captureEmbeddedSceneWithMedia([image()],{}, {file_1:file},
    {media:{ownerId:OWNER,upload:async()=>OTHER+'/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.png'}}),
    /wrong account|path/i);
  for(const files of [{}, {file_1:{...file,mimeType:'image/svg+xml'}},
    {file_1:{...file,dataURL:'javascript:alert(1)'}},
    {file_1:{...file,dataURL:'data:image/png;base64,AAAA'}}]){
    await assert.rejects(captureEmbeddedSceneWithMedia([image()],{}, files,{media,originalScene:null}));
  }
  await assert.rejects(loadEmbeddedFiles({...emptyScene(),elements:[image()],
    files:{file_1:{path:PATH,mimeType:'image/png'}}},
  {media:{ownerId:OTHER,download:async()=>PNG}}),/another account/i);
});

test('EX-02 deleted image references are pruned without deleting storage objects',async()=>{
  const original=emptyScene();
  original.elements=[image()];
  original.files={file_1:{path:PATH,mimeType:'image/png'}};
  const saved=await captureEmbeddedSceneWithMedia([{...image(),isDeleted:true},rectangle()],{}, {},
    {media:null,originalScene:original});
  assert.deepEqual(saved.files,{});
  assert.equal(saved.elements.length,1);
  assert.deepEqual(original.files,{file_1:{path:PATH,mimeType:'image/png'}},
    'deleting an image from canvas must not delete Storage blobs');
});
