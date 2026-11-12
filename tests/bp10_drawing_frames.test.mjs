import test from 'node:test';
import assert from 'node:assert/strict';
import {createFrameCoalescer,pointerSamples} from '../src/scene.js';

function fakeFrames(){
  let next=0;
  const pending=new Map();
  return {
    requestFrame(fn){const id=++next;pending.set(id,fn);return id;},
    cancelFrame(id){pending.delete(id);},
    paint(){const callbacks=[...pending.values()];pending.clear();for(const callback of callbacks)callback();},
    size(){return pending.size;}
  };
}

for(const refreshRate of [60,120])test(`BP-10: one paint per ${refreshRate}Hz display frame while every point survives`,()=>{
  const frames=fakeFrames(),points=[],renders=[];
  const painter=createFrameCoalescer(()=>renders.push([...points]),frames);
  for(let i=0;i<150;i++){points.push(i);painter.request();}
  assert.equal(frames.size(),1);
  assert.equal(renders.length,0);
  frames.paint();
  assert.equal(renders.length,1);
  assert.deepEqual(renders[0],points);

  // A second frame at either refresh rate sees all new samples, not just the last.
  for(let i=150;i<275;i++){points.push(i);painter.request();}
  assert.equal(frames.size(),1);
  frames.paint();
  assert.equal(renders.length,2);
  assert.deepEqual(renders[1],points);
  painter.dispose();
});

test('BP-10: pointer release flushes the final samples and cancels stale paint',()=>{
  const frames=fakeFrames(),samples=[],draws=[];
  const painter=createFrameCoalescer(()=>draws.push([...samples]),frames);
  samples.push(1,2);painter.request();
  samples.push(3,4,5);painter.request();
  painter.flush();
  assert.deepEqual(draws,[[1,2,3,4,5]]);
  assert.equal(frames.size(),0);
  frames.paint();
  assert.equal(draws.length,1,'An old frame must not overwrite the final stroke');
  painter.dispose();
  painter.request();
  painter.flush();
  assert.equal(frames.size(),0);
  assert.equal(draws.length,1,'Disposed notes cannot repaint');
});

test('BP-10: unmount and editor handoff cancel unsent frames',()=>{
  const frames=fakeFrames();let paints=0;
  const painter=createFrameCoalescer(()=>paints++,frames);
  painter.request();
  painter.cancel();
  assert.equal(frames.size(),0);
  painter.request();
  painter.dispose();
  frames.paint();
  assert.equal(paints,0);
});

test('BP-10: coalesced stylus samples are all retained and legacy events still work',()=>{
  const a={clientX:1,clientY:2},b={clientX:3,clientY:4};
  assert.deepEqual(pointerSamples({getCoalescedEvents:()=>[a,b]}),[a,b]);
  assert.deepEqual(pointerSamples({getCoalescedEvents:()=>[]}).length,1);
  const basic={clientX:7,clientY:8};
  assert.deepEqual(pointerSamples(basic),[basic]);
});
