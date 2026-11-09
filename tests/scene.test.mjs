import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyScene,normalizeScene,normalizeExtensions} from '../src/scene.js';

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
  assert.deepEqual(normalizeExtensions({}),{notes:[],taskLinks:{},journalScenes:{},journalImages:{},appearance:{theme:'parchment',motion:'system',ambient:false}});
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
