import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyScene } from '../src/scene.js';
import { createEmbeddedInitialData, captureEmbeddedScene, embeddedEditorOptions, embeddedEditorTheme } from '../src/excalidraw-adapter.js';

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
  assert.throws(()=>createEmbeddedInitialData(source),/scene|files|drawing/i);
  assert.throws(()=>captureEmbeddedScene(Array.from({length:401},(_,i)=>({
    ...rectangle(),id:'shape_'+i})),{},{}),/drawing|scene|large/i);
  assert.throws(()=>captureEmbeddedScene([{...pen(),id:'duplicate'},{...rectangle(),id:'duplicate'}],{},{}),/duplicate/i);
});

test('EX-00: Excalidraw is constrained to local, image-free, explicit-save editing',()=>{
  assert.equal(embeddedEditorOptions.tools.image,false);
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
