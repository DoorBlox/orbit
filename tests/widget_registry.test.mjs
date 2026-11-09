import test from 'node:test';
import assert from 'node:assert/strict';
import {CORE_WIDGET_IDS,DEFAULT_WIDGET_REGISTRY,createWidgetRegistry} from '../src/widget-registry.js';

const synthetic=()=>({
  id:'projects',position:{x:2250,y:250},limits:{minW:340,minH:230,maxW:1500,maxH:1800},icon:'◆'
});

test('SP-01A original widgets keep their IDs, coordinates and bounds exactly',()=>{
  assert.deepEqual(CORE_WIDGET_IDS,['timeline','constellation','active','completed','space','journal']);
  assert.deepEqual(DEFAULT_WIDGET_REGISTRY.defaults(),{
    timeline:{x:445,y:105},constellation:{x:410,y:670},
    active:{x:1895,y:760},completed:{x:1980,y:1370},
    space:{x:280,y:1725},journal:{x:930,y:1780},
  });
  assert.deepEqual(DEFAULT_WIDGET_REGISTRY.get('journal').limits,
    {minW:420,minH:720,maxW:1500,maxH:2400});
  assert.equal(DEFAULT_WIDGET_REGISTRY.get('missing'),null);
});

test('SP-01A seventh registered widget preserves the six original definitions',()=>{
  const source=synthetic(),registry=createWidgetRegistry([source]);
  assert.equal(registry.ids.length,7);
  assert.deepEqual(registry.ids.slice(0,6),CORE_WIDGET_IDS);
  assert.equal(registry.has('projects'),true);
  assert.deepEqual(registry.defaults().projects,{x:2250,y:250});
  assert.deepEqual(registry.defaults().timeline,DEFAULT_WIDGET_REGISTRY.defaults().timeline);
  source.position.x=6500;
  source.limits.maxW=4000;
  assert.equal(registry.get('projects').position.x,2250);
  assert.equal(registry.get('projects').limits.maxW,1500);
  const defaults=registry.defaults();defaults.timeline.x=999;
  assert.equal(registry.defaults().timeline.x,445);
  assert.equal(DEFAULT_WIDGET_REGISTRY.has('projects'),false);
});

test('SP-01A registry rejects duplicate, unsafe and unbounded widget definitions',()=>{
  assert.throws(()=>createWidgetRegistry({}),/descriptor list/);
  for(const change of [
    v=>v.id='timeline',v=>v.id='__proto__',v=>v.id='bad selector"',
    v=>v.id='a'.repeat(60),v=>v.position.x=Infinity,
    v=>v.position.y=8000,v=>v.limits.maxW=10000,
    v=>v.limits.minH=0,v=>v.limits.maxH=v.limits.minH-1,
    v=>v.icon='<img>',v=>delete v.position
  ]) {
    const invalid=synthetic();change(invalid);
    assert.throws(()=>createWidgetRegistry([invalid]));
  }
});
