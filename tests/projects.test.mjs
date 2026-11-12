import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeProjects,setBranchProject,validateProjectBranches,summarizeProjectPortfolio} from '../src/projects.js';
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


test('PJ-02B parent and nested projects count unique task IDs without duplicate portfolio totals',()=>{
  const branches=[
    {id:'research',parentId:'root',label:'Research',color:'#9674C8'},
    {id:'researcher',parentId:'research',label:'Research practice'},
    {id:'writing',parentId:'researcher',label:'Writing'},
    {id:'unrelated',parentId:'root',label:'Elsewhere'}
  ];
  const input=[
    {id:'a',projectId:'research',status:'completed'},
    {id:'b',projectId:'researcher',status:'ready'},
    {id:'c',projectId:'writing',status:'completed'},
    {id:'d',projectId:'writing',status:'captured'},
    {id:'d',projectId:'writing',status:'captured'},
    {id:'other',projectId:'unrelated',status:'completed'}
  ];
  const identities={research:{description:'Private lab',status:'paused',links:[]},
    writing:{status:'active'}};
  const branchesBefore=structuredClone(branches),tasksBefore=structuredClone(input);
  const summary=summarizeProjectPortfolio(identities,branches,input);
  assert.equal(summary.projects.length,2);
  const parent=summary.projects.find(item=>item.id==='research');
  assert.equal(parent.label,'Research');
  assert.equal(parent.description,'Private lab');
  assert.equal(parent.status,'paused');
  assert.deepEqual(parent.direct,{total:1,completed:1});
  assert.deepEqual(parent.including,{total:4,completed:2});
  assert.equal(parent.progress,50);
  const nested=summary.projects.find(item=>item.id==='writing');
  assert.equal(nested.path,'Research / Research practice / Writing');
  assert.deepEqual(nested.direct,{total:2,completed:1});
  assert.deepEqual(nested.including,{total:2,completed:1});
  assert.equal(nested.progress,50);
  // The nested project is also part of Research, not a duplicate portfolio task.
  assert.deepEqual(summary.totals,{total:4,completed:2});
  assert.deepEqual(branches,branchesBefore);
  assert.deepEqual(input,tasksBefore);
});

test('PJ-02B empty project counts are not displayed as fake 100% progress',()=>{
  const branches=[{id:'inbox',parentId:'root',label:'Inbox'}];
  const empty=summarizeProjectPortfolio({inbox:{status:'completed'}},branches,[]);
  assert.deepEqual(empty.totals,{total:0,completed:0});
  assert.equal(empty.projects[0].progress,null);
  assert.deepEqual(empty.projects[0].including,{total:0,completed:0});
  assert.deepEqual(summarizeProjectPortfolio({},branches,[]),{projects:[],totals:{total:0,completed:0}});
  assert.throws(()=>summarizeProjectPortfolio({orphan:{}},branches,[]),/existing branch/i);
});

test('PJ-03 private project brief supports optional goal, next action, blockers and real target date',()=>{
  const raw={research:{description:'Private research',status:'active',links:[],
    goal:'Publish the validated model',nextAction:'Run synthetic regression checks',
    blockers:'Waiting for sample approval',targetDate:'2027-03-15'}};
  const parsed=normalizeProjects(raw);
  assert.deepEqual(parsed,raw);
  assert.deepEqual(normalizeProjects(parsed),parsed);
  assert.deepEqual(summarizeProjectPortfolio(parsed,branches(),tasks()).projects[0].goal,
    'Publish the validated model');
  const item=summarizeProjectPortfolio(parsed,branches(),tasks()).projects[0];
  assert.equal(item.nextAction,'Run synthetic regression checks');
  assert.equal(item.blockers,'Waiting for sample approval');
  assert.equal(item.targetDate,'2027-03-15');
  assert.equal(item.progress,0,'Goal and target date do not fabricate task completion');
  assert.deepEqual(setBranchProject({},'research',branches(),true),
    {research:{description:'',status:'active',links:[]}});
});
test('PJ-03 rejects unsafe brief types, overlong fields, malformed dates and unknown properties',()=>{
  for(const [key,value] of [
    ['goal',42],['goal','x'.repeat(501)],['nextAction','x'.repeat(241)],
    ['blockers','x'.repeat(1001)],['targetDate','2027-02-29'],
    ['targetDate','2027-13-01'],['targetDate','tomorrow'],
    ['targetDate','2027-03-15<script>'],['milestones',[{title:'unreviewed'}]],
  ])assert.throws(()=>normalizeProjects({research:{[key]:value}}));
  assert.deepEqual(normalizeProjects({research:{goal:'',nextAction:'',blockers:'',targetDate:''}}),
    {research:{description:'',status:'active',links:[]}});
});

test('PJ-03: per-project milestones are private bounded metadata separate from task progress',()=>{
  const input={research:{description:'Lab',status:'active',
    milestones:[
      {id:'lit-1',title:'Literature review',dueDate:'2027-01-02',done:true},
      {id:'pilot-2',title:'Pilot experiment',dueDate:'',done:false}
    ]}};
  const saved=normalizeProjects(input);
  assert.notEqual(saved,input);
  assert.notEqual(saved.research.milestones,input.research.milestones);
  assert.deepEqual(saved.research.milestones,input.research.milestones);
  const row=summarizeProjectPortfolio(saved,branches(),tasks()).projects[0];
  assert.deepEqual(row.milestoneStats,{total:2,done:1});
  assert.equal(row.progress,0,'Milestone checkoffs cannot fake completion of tasks');
  assert.deepEqual(normalizeProjects(saved),saved);
  assert.equal(Object.hasOwn(saved.research,'published'),false);
});
test('PJ-03: milestone validation fails closed on collisions, spoofing, malformed data and overload',()=>{
  const first={id:'m_1',title:'Deliver phase 1',dueDate:'2027-03-15',done:false};
  for(const bad of [
    [{...first,id:'__proto__'}],
    [{...first,id:'root'}],
    [{...first,title:'  '}],
    [{...first,title:'x'.repeat(121)}],
    [{...first,dueDate:'2027-02-29'}],
    [{...first,done:'yes'}],
    [{...first,secret:'inline data'}],
    [first,{...first}],
    Array.from({length:21},(_,i)=>({...first,id:'m_'+i})),
    'wrong type',
  ])assert.throws(()=>normalizeProjects({research:{milestones:bad}}));
  assert.deepEqual(normalizeProjects({research:{milestones:[]}}),
    {research:{description:'',status:'active',links:[]}});
  assert.deepEqual(normalizeProjects({research:{milestones:[{id:'m1',title:'Ready'}]}})
    .research.milestones,[{id:'m1',title:'Ready',dueDate:'',done:false}]);
});
