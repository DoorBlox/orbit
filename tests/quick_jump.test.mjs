import test from 'node:test';
import assert from 'node:assert/strict';
import {searchJumpTargets} from '../src/quick-jump.js';

const entries=[
  {kind:'window',id:'journal',title:'My Journal',detail:'Spatial window'},
  {kind:'branch',id:'science',title:'Science',detail:'Home / School / Science'},
  {kind:'task',id:'do-it',title:'Finish chemistry experiment',detail:'Task · Science',
    searchText:'Investigate glucose oxidation and data collection'},
  {kind:'note',id:'idea',title:'Experiment inspiration',detail:'Try edible film',searchText:'Chemistry'},
  {kind:'journal',id:'page',title:'Research journal',detail:'Journal page · 2026-11-12',
    searchText:'Reflections about chemistry'},
  {kind:'task',id:'other',title:'Finish math homework',detail:'Task · School',searchText:'No chemistry'}
];

test('BR-01: exact and prefix titles outrank descriptions and body matches',()=>{
  assert.deepEqual(searchJumpTargets(entries,'science').map(x=>x.id).slice(0,2),['science','do-it']);
  assert.deepEqual(searchJumpTargets(entries,'research journal').map(x=>x.id),['page']);
  assert.deepEqual(searchJumpTargets(entries,'chemistry')[0].id,'do-it');
});
test('BR-01: every token must match a local field and empty queries remain bounded',()=>{
  assert.deepEqual(searchJumpTargets(entries,'finish science').map(x=>x.id),['do-it']);
  assert.deepEqual(searchJumpTargets(entries,'banana science'),[]);
  assert.equal(searchJumpTargets(entries,'',{limit:3}).length,3);
  assert.equal(searchJumpTargets(entries,'',{limit:1000}).length,entries.length);
});
test('BR-01: Unicode and case fold are applied without altering the stored title',()=>{
  const item={kind:'note',id:'u',title:'Résumé de Pokémon',detail:'Personal notes',searchText:''};
  assert.equal(searchJumpTargets([item],'resume pokemon')[0],item);
  assert.equal(item.title,'Résumé de Pokémon');
});
test('BR-01: ignores missing IDs and untrusted item shapes; does not evaluate text',()=>{
  const attack={kind:'note',id:'attack',title:'<img src=x onerror=alert(1)>',detail:'Plain data'};
  const rows=[...entries,{kind:'note',title:'missing identity'},null,attack,{kind:'task',id:2,title:'bad id'}];
  assert.deepEqual(searchJumpTargets(rows,'onerror'),[attack]);
  assert.deepEqual(searchJumpTargets(rows,'no results'),[]);
  assert.deepEqual(searchJumpTargets([],''),[]);
});
