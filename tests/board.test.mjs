import test from 'node:test';
import assert from 'node:assert/strict';
import {clampNavigatorPercent,navigatorWorldPoint,navigatorGrabOffset} from '../src/board.js';

test('navigator center marker stays inside map for extreme camera positions and zoom',()=>{
  for(const size of [75,96,180,300]){
    const margin=(31/2+2)/size*100;
    for(const value of [-1000,-20,0,10,50,90,100,110,2000]){
      const clamped=clampNavigatorPercent(value,size);
      assert.ok(clamped>=margin-0.001&&clamped<=100-margin+0.001);
    }
  }
  assert.equal(clampNavigatorPercent(50,180),50);
});

test('dragging the minimap maps pointer ratios to actual world coordinates safely',()=>{
  const bounds={x0:-200,x1:1800,y0:100,y1:900};
  assert.deepEqual(navigatorWorldPoint(.5,.5,bounds),{x:800,y:500});
  assert.deepEqual(navigatorWorldPoint(-10,99,bounds),{x:-200,y:900});
});

test('TOUCH-01 dragging from inside cursor retains finger offset; tapping elsewhere travels directly',()=>{
  const center={x:95,y:37},size={width:31,height:31};
  assert.deepEqual(navigatorGrabOffset({x:101,y:43},center,size),{x:6,y:6});
  assert.deepEqual(navigatorGrabOffset({x:95,y:37},center,size),{x:0,y:0});
  assert.deepEqual(navigatorGrabOffset({x:145,y:85},center,size),{x:0,y:0});
  assert.deepEqual(navigatorGrabOffset({x:78,y:37},center,size),{x:-17,y:0});
  assert.deepEqual(navigatorGrabOffset({x:77,y:37},center,size),{x:0,y:0});
  assert.deepEqual(navigatorGrabOffset({x:0,y:0},center,{width:0,height:0}),{x:0,y:0});
});
