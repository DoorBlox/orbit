import test from 'node:test';
import assert from 'node:assert/strict';
import {SpatialBoard} from '../src/board.js';

const element=inert=>({
  inert,classList:{
    values:new Set(),
    add(v){this.values.add(v);},remove(v){this.values.delete(v);},
    toggle(v,on){if(on)this.add(v);else this.remove(v);}
  }
});
test('BP-08 Focus is reversible and never changes spatial positions/sizes',()=>{
  const oldCancel=globalThis.cancelAnimationFrame;
  globalThis.cancelAnimationFrame=()=>{};
  try{
    const board=Object.create(SpatialBoard.prototype);
    const space=element(false),journal=element(false),privateNote=element(true);
    board.widgets=new Map([['space',space],['journal',journal],['projects',privateNote]]);
    board.world={classList:element(false).classList};
    board.pan={x:218.5,y:-34.25};board.scale=.725;board.raf=1;
    const layout={space:{x:80,y:10,width:600},journal:{x:1000,y:40,width:720}};
    board.getLayout=()=>structuredClone(layout);
    board.focus=id=>{assert.equal(id,'journal');board.pan={x:0,y:0};board.scale=1;};
    board.animate=(target,duration)=>{
      assert.equal(duration,0);board.scale=target.scale;board.pan={x:target.x,y:target.y};
    };
    const before=board.getLayout();
    assert.equal(board.enterWidgetFocus('missing'),false);
    assert.equal(board.enterWidgetFocus('journal'),true);
    assert.equal(board.enterWidgetFocus('space'),false);
    assert.equal(space.inert,true);
    assert.equal(journal.inert,false);
    assert.equal(privateNote.inert,true);
    assert.equal(board.exitWidgetFocus(),true);
    assert.deepEqual(board.pan,{x:218.5,y:-34.25});
    assert.equal(board.scale,.725);
    assert.equal(space.inert,false);
    assert.equal(privateNote.inert,true);
    assert.deepEqual(board.getLayout(),before);
    assert.equal(board.exitWidgetFocus(),false);
  }finally{globalThis.cancelAnimationFrame=oldCancel;}
});

test('BP-08 viewport resize preserves the centered world point and saved geometry',()=>{
  const priorCancel=globalThis.cancelAnimationFrame;
  globalThis.cancelAnimationFrame=()=>{};
  try{
    const board=Object.create(SpatialBoard.prototype);
    board.viewport={clientWidth:320,clientHeight:700};
    board.lastViewportSize={w:320,h:700};
    board.pan={x:-108,y:74};board.scale=.8;board.raf=17;
    let renders=0,saves=0;
    board.render=()=>{renders++;};
    board.save=()=>{saves++;};
    const layout={journal:{x:880,y:340,width:720},space:{x:60,y:80,width:660}};
    board.getLayout=()=>structuredClone(layout);
    const center=()=>({
      x:(board.viewport.clientWidth/2-board.pan.x)/board.scale,
      y:(board.viewport.clientHeight/2-board.pan.y)/board.scale
    });
    const before=center();
    board.viewport.clientWidth=844;board.viewport.clientHeight=390;
    board.handleViewportResize();
    assert.deepEqual(center(),before,'landscape should preserve world-space camera center');
    board.viewport.clientWidth=390;board.viewport.clientHeight=844;
    board.handleViewportResize();
    assert.deepEqual(center(),before,'returning portrait should preserve world-space camera center');
    assert.deepEqual(board.getLayout(),layout,'orientation does not rewrite widget geometry');
    assert.equal(board.scale,.8,'camera zoom remains unchanged outside Focus');
    assert.equal(saves,0,'viewport changes must not queue persistent layout writes');
    assert.equal(renders,2,'one immediate redraw per actual viewport change');
  }finally{globalThis.cancelAnimationFrame=priorCancel;}
});

test('BP-08 focused viewport resize reframes target and restores adjusted camera bookmark',()=>{
  const priorCancel=globalThis.cancelAnimationFrame;
  globalThis.cancelAnimationFrame=()=>{};
  try{
    const board=Object.create(SpatialBoard.prototype);
    board.viewport={clientWidth:390,clientHeight:844};
    board.lastViewportSize={w:390,h:844};
    board.pan={x:-240,y:85};board.scale=.75;board.raf=4;
    const journal=element(false),space=element(false);
    board.widgets=new Map([['journal',journal],['space',space]]);
    board.world={classList:element(false).classList};
    const layout={journal:{x:990,y:260,width:720},space:{x:60,y:80,width:620}};
    board.getLayout=()=>structuredClone(layout);
    let saves=0;board.save=()=>{saves++;};
    const before={
      x:(board.viewport.clientWidth/2-board.pan.x)/board.scale,
      y:(board.viewport.clientHeight/2-board.pan.y)/board.scale
    };
    const focusCalls=[];
    board.focus=(id,{initial=false}={})=>{
      focusCalls.push({id,initial});
      board.pan={x:-700,y:-90};board.scale=.9;
    };
    board.animate=(target,duration)=>{
      assert.equal(duration,0);
      board.pan={x:target.x,y:target.y};board.scale=target.scale;
    };
    board.render=()=>{};
    assert.equal(board.enterWidgetFocus('journal'),true);
    assert.equal(space.inert,true);
    board.viewport.clientWidth=844;board.viewport.clientHeight=390;
    board.handleViewportResize();
    assert.deepEqual(focusCalls,[{id:'journal',initial:false},{id:'journal',initial:true}],
      'selected widget must reframe without a new focus mode or delayed animation');
    assert.equal(space.inert,true,'other widgets remain inert through rotation');
    assert.equal(board.exitWidgetFocus(),true);
    assert.deepEqual({
      x:(board.viewport.clientWidth/2-board.pan.x)/board.scale,
      y:(board.viewport.clientHeight/2-board.pan.y)/board.scale
    },before,'Focus exit returns to original world center after rotation');
    assert.equal(journal.inert,false);
    assert.equal(space.inert,false);
    assert.deepEqual(board.getLayout(),layout);
    assert.equal(saves,0);
  }finally{globalThis.cancelAnimationFrame=priorCancel;}
});
