import test from 'node:test';
import assert from 'node:assert/strict';
import {StickyNotes,formatStickySelection} from '../src/stickies.js';

const createNote=()=>({
  id:'original',title:'Thought',text:'A private thought',x:1000,y:1200,
  width:300,height:270,color:'mint',
  scene:{type:'excalidraw',version:2,elements:[{id:'line_1',type:'freedraw',points:[[0,0],[5,7]]}],appState:{},files:{}},
  imagePath:'11111111-1111-4111-8111-111111111111/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.png'
});
const fake=(notes=[createNote()])=>{
  const trace={renders:0,changes:0,messages:[]};
  const state={notes,readOnly:false,disposed:false,
    render(){trace.renders++;},changed(){trace.changes++;},
    notify(text){trace.messages.push(text);}};
  return {state,trace};
};

test('duplicating a sticky creates a new independent editable card with original drawing and image reference',()=>{
  const {state,trace}=fake(),original=structuredClone(state.notes[0]);
  const result=StickyNotes.prototype.duplicate.call(state,'original');
  assert.equal(result,true);
  assert.equal(state.notes.length,2);
  const copy=state.notes[1];
  assert.match(copy.id,/^note_/);
  assert.notEqual(copy.id,original.id);
  assert.equal(copy.title,'Copy of Thought');
  assert.equal(copy.text,original.text);
  assert.equal(copy.color,original.color);
  assert.equal(copy.x,original.x+48);
  assert.equal(copy.y,original.y+48);
  assert.equal(copy.imagePath,original.imagePath);
  assert.deepEqual(copy.scene,original.scene);
  copy.scene.elements[0].points[0][0]=87;
  copy.text='Changed the copy';
  assert.deepEqual(state.notes[0],original,'original note is independently editable');
  assert.deepEqual([trace.renders,trace.changes],[1,1]);
});
test('duplicating a note fails without writes if missing, read-only, disposed, or at note cap',()=>{
  for(const setup of ['missing','readOnly','disposed','cap']){
    const {state,trace}=fake();
    if(setup==='readOnly')state.readOnly=true;
    if(setup==='disposed')state.disposed=true;
    if(setup==='cap')state.notes=Array.from({length:80},(_,i)=>({...createNote(),id:'note'+i}));
    const saved=structuredClone(state.notes);
    assert.equal(StickyNotes.prototype.duplicate.call(state,setup==='missing'?'missing':state.notes[0].id),false);
    assert.deepEqual(state.notes,saved);
    assert.equal(trace.renders,0);
    assert.equal(trace.changes,0);
  }
});
test('duplicate coordinates remain inside spatial bounds and titles stay bounded',()=>{
  const n=createNote();n.x=7490;n.y=7491;n.title='a'.repeat(100);
  const {state}=fake([n]);
  assert.equal(StickyNotes.prototype.duplicate.call(state,n.id),true);
  assert.equal(state.notes[1].x,7500);
  assert.equal(state.notes[1].y,7500);
  assert.ok(state.notes[1].title.length<=100);
});

test('detaching one private image is reversible and never affects cloned references',()=>{
  const original=createNote(),clone={...createNote(),id:'copy'};
  const {state,trace}=fake([original,clone]);let undo;
  state.notify=(msg,duration,action)=>{trace.messages.push(msg);undo=action?.run;};
  assert.equal(StickyNotes.prototype.detachImage.call(state,'original'),true);
  assert.equal(original.imagePath,undefined);
  assert.equal(clone.imagePath,createNote().imagePath);
  assert.deepEqual([trace.renders,trace.changes],[1,1]);
  undo();assert.equal(original.imagePath,clone.imagePath);
  assert.deepEqual([trace.renders,trace.changes],[2,2]);
  state.readOnly=true;
  assert.equal(StickyNotes.prototype.detachImage.call(state,'original'),false);
});

test('sticky markdown formatting preserves plaintext persistence and selection safety',()=>{
  assert.deepEqual(formatStickySelection('hello',0,5,'bold'),{value:'**hello**',start:2,end:7});
  assert.equal(formatStickySelection('one\ntwo',0,7,'bullet').value,'- one\n- two');
  assert.equal(formatStickySelection('go',0,2,'checklist').value,'- [ ] go');
  assert.equal(formatStickySelection('website',0,7,'link','https://example.org').value,'[website](https://example.org/)');
  assert.throws(()=>formatStickySelection('site',0,4,'link','javascript:alert(1)'),/valid/);
  assert.throws(()=>formatStickySelection('site',0,4,'link','https://alice:pwd@example.org/'),/valid/);
  assert.equal(formatStickySelection('z'.repeat(5999),0,0,'bold'),null);
});
