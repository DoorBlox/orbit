import test from 'node:test';
import assert from 'node:assert/strict';
import { canvasSceneSignature } from '../src/inline-canvas.js';

test('BP-07 detects same-length text changes and modified freehand geometry', () => {
  const scene=[{id:'text_1',type:'text',text:'hello',version:1,x:0,y:0,width:90,height:22}];
  const original=canvasSceneSignature(scene,{}, {viewBackgroundColor:'#ffffff'});
  assert.notEqual(canvasSceneSignature([{...scene[0],text:'world'}],{}, {viewBackgroundColor:'#ffffff'}),original);
  assert.notEqual(canvasSceneSignature(scene,{}, {viewBackgroundColor:'#f9edda'}),original);
  const stroke=[{id:'line',type:'freedraw',points:[[0,0],[10,10]],version:1}];
  const prior=canvasSceneSignature(stroke,{},{});
  assert.notEqual(canvasSceneSignature([{...stroke[0],points:[[0,0],[10,11]]}],{},{}),prior);
});

test('BP-07 ignores nonpersistent editor selection state but tracks file references',()=>{
  const elements=[{id:'image_1',type:'image',fileId:'private'}];
  const current=canvasSceneSignature(elements,{private:{mimeType:'image/png',created:123,dataURL:'abc'}},{viewBackgroundColor:'#ffffff',selectedElementIds:{image_1:true}});
  const selectionOnly=canvasSceneSignature(elements,{private:{mimeType:'image/png',created:123,dataURL:'abc'}},{viewBackgroundColor:'#ffffff',selectedElementIds:{}});
  assert.equal(current,selectionOnly);
  assert.notEqual(current,canvasSceneSignature(elements,{}, {viewBackgroundColor:'#ffffff'}));
});
