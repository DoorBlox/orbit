import test from 'node:test';
import assert from 'node:assert/strict';
import {clampNavigatorPercent} from '../src/board.js';

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
