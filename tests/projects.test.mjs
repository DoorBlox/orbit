import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeProjects,setBranchProject,validateProjectBranches} from '../src/projects.js';
import {removeBranchPreservingContents} from '../src/data.js';

const branches=()=>[
  {id:'inbox',parentId:'root',label:'Unsorted'},
  {id:'research',parentId:'root',label:'Research'},
  {id:'analysis',parentId:'research',label:'Analysis'}
];
const tasks=()=>[{id:'task_1',projectId:'analysis',title:'Preserve task'},{id:'task_2',projectId:'research',title:'Preserve second'}];

test('PJ-01 reversible project identity changes metadata, not branch/task structures',()=>{
  const originalBranches=branches(),originalTasks=tasks();
  const keptBranches=structuredClone(originalBranches),keptTasks=structuredClone(originalTasks);
  const first=setBranchProject({},'research',originalBranches,true);
  assert.deepEqual(first,{research:{description:'',status:'active',links:[]}});
  assert.deepEqual(setBranchProject(first,'research',originalBranches,true),first);
  const second=setBranchProject(first,'analysis',originalBranches,true);
  assert.deepEqual(Object.keys(second),['research','analysis']);
  assert.deepEqual(setBranchProject(second,'research',originalBranches,false),
    {analysis:{description:'',status:'active',links:[]}});
  assert.deepEqual(originalBranches,keptBranches);
  assert.deepEqual(originalTasks,keptTasks);
  assert.deepEqual(first,{research:{description:'',status:'active',links:[]}});
});

test('PJ-01 project identity follows stable branch ID across rename/reparent',()=>{
  const working=branches(),originalTasks=tasks();
  const marked=setBranchProject({},'analysis',working,true);
  working.find(b=>b.id==='analysis').label='New analysis title';
  working.find(b=>b.id==='analysis').parentId='root';
  assert.deepEqual(validateProjectBranches(marked,working),marked);
  assert.equal(working.find(b=>b.id==='analysis').parentId,'root');
  assert.deepEqual(tasks(),originalTasks);
});

test('PJ-01 branch removal cannot leave an orphan project and undo can restore metadata',()=>{
  const current=branches(),marked=setBranchProject({},'research',current,true);
  const {branches:after,tasks:reassigned}=removeBranchPreservingContents('research',current,tasks());
  const withoutProject=setBranchProject(marked,'research',current,false);
  assert.deepEqual(validateProjectBranches(withoutProject,after),{});
  assert.throws(()=>validateProjectBranches(marked,after),/existing branch/i);
  assert.deepEqual(validateProjectBranches(marked,current),marked);
  assert.equal(reassigned[1].projectId,'inbox');
});

test('PJ-01 private metadata validates status, links, limits and unsafe identifiers',()=>{
  const good={research:{
    description:'Keep research notes private',status:'paused',
    links:[{label:'Source',url:'https://example.org/work'}]
  }};
  const result=normalizeProjects(good);
  assert.deepEqual(result,good);
  assert.deepEqual(normalizeProjects(result),result);
  good.research.description='changed';
  assert.equal(result.research.description,'Keep research notes private');
  const invalid=[
    {research:{status:'published'}},
    {research:{description:'x'.repeat(4001)}},
    {research:{description:1}},
    {research:{links:[{label:'Oops',url:'javascript:alert(1)'}]}},
    {research:{links:[{label:'Credentials',url:'https://u:p@example.org/private'}]}},
    {research:{links:Array.from({length:13},()=>({label:'Many',url:'https://example.org/'}))}},
    {research:{html:'<script>alert(1)</script>'}},
    {'__proto__':{description:'unsafe'},constructor:{description:'unsafe'}},
    Object.fromEntries(Array.from({length:129},(_,i)=>['p'+i,{}]))
  ];
  for(const value of invalid)assert.throws(()=>normalizeProjects(value));
  assert.throws(()=>setBranchProject({},'not-a-branch',branches(),true),/existing branch/i);
  assert.throws(()=>setBranchProject({},'root',branches(),true),/Invalid project selection/i);
});

test('PJ-01 project metadata never becomes public without a separate publishing operation',()=>{
  const value=normalizeProjects({research:{description:'Private draft',status:'active',links:[]}});
  assert.equal(Object.hasOwn(value,'visibility'),false);
  assert.equal(Object.hasOwn(value.research,'published'),false);
  assert.equal(Object.hasOwn(value.research,'public'),false);
});
