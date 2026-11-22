import test from 'node:test';
import assert from 'node:assert/strict';
import { layoutTimelineAnnotations } from '../src/widgets.js';

const intersects=(a,b,padding=0)=>{
  const aLeft=a.x-a.width/2,aRight=a.x+a.width/2;
  const bLeft=b.x-b.width/2,bRight=b.x+b.width/2;
  return aLeft < bRight+padding && bLeft < aRight+padding &&
    a.top < b.bottom+padding && b.top < a.bottom+padding;
};

test('#224: sparse journal stays near its own date, not the deepest far-away milestone',()=>{
  const milestones=Object.freeze(Array.from({length:5},(_,i)=>Object.freeze({
    id:'milestone-'+i,x:100,width:120,
  })));
  const journals=Object.freeze([
    Object.freeze({id:'local',x:100,width:116}),
    Object.freeze({id:'far',x:1100,width:116}),
  ]);
  const result=layoutTimelineAnnotations(milestones,journals);
  assert.equal(result.milestones.length,5);
  assert.ok(result.journals.find(j=>j.id==='far').top<=218,
    'Remote milestone stacks must not shift every journal down');
  assert.ok(result.journals.find(j=>j.id==='local').top>
    result.journals.find(j=>j.id==='far').top,
    'Only the nearby journal must dodge the occupied milestone stack');
  assert.deepEqual(milestones.map(m=>Object.keys(m)),Array.from({length:5},()=>['id','x','width']),
    'Layout must never mutate source milestones');
});

test('#224: densely packed milestones get separate rows without horizontal collisions',()=>{
  const markers=Array.from({length:12},(_,i)=>({id:String(i),x:215+(i%3)*2,width:155}));
  const result=layoutTimelineAnnotations(markers,[]);
  for(let i=0;i<result.milestones.length;i++)
    for(let j=0;j<i;j++)
      assert.ok(!intersects(result.milestones[i],result.milestones[j],7),
        'Milestone labels must not hide one another');
  assert.ok(result.requiredHeight>350,'Dense events must be vertically scrollable, not clipped');
});

test('#224: journal dates stack only when horizontally overlapping, at sparse and dense zoom',()=>{
  for(const pxPerDay of [1.5,5.3,30]){
    const journal=Array.from({length:7},(_,i)=>({
      id:String(i),x:300+i*pxPerDay,width:116,
    }));
    const result=layoutTimelineAnnotations([],journal);
    for(let i=0;i<result.journals.length;i++)
      for(let j=0;j<i;j++)
        assert.ok(!intersects(result.journals[i],result.journals[j],7),
          'Overlapping journal labels at '+pxPerDay+'px/day');
    assert.equal(result.journals[0].top,result.milestones.length?NaN:213);
  }
});

test('#224: milestones and journal labels never overlap locally',()=>{
  const milestone=Array.from({length:5},(_,i)=>({id:'m'+i,x:500+i*6,width:150}));
  const journal=Array.from({length:8},(_,i)=>({id:'j'+i,x:490+i*5,width:116}));
  const result=layoutTimelineAnnotations(milestone,journal);
  for(const page of result.journals)
    for(const event of result.milestones)
      assert.ok(!intersects(page,event,7),'Journal is covering a milestone at '+page.x);
  for(let i=0;i<result.journals.length;i++)
    for(let j=0;j<i;j++)
      assert.ok(!intersects(result.journals[i],result.journals[j],7));
});

test('#224: empty timeline retains compact scroll area and source coordinates',()=>{
  assert.equal(layoutTimelineAnnotations([],[]).requiredHeight,350);
  const entries=Object.freeze([Object.freeze({id:'x',x:123,width:80})]);
  const result=layoutTimelineAnnotations(entries,[]);
  assert.equal(entries[0].x,123);
  assert.equal(result.milestones[0].x,123);
});
