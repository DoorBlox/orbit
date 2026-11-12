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
