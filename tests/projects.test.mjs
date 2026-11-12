import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeProjects,setBranchProject,validateProjectBranches,summarizeProjectPortfolio,filterProjectPortfolio} from '../src/projects.js';
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


test('PJ-03 project milestone metadata roundtrips with independent task progress',()=>{
  const original={research:{description:'Private research',status:'active',links:[],
    milestones:[
      {id:'ms_1',title:'Validate first prototype',targetDate:'2027-02-15',done:true},
      {id:'ms_2',title:'Review findings',targetDate:'',done:false}
    ]}};
  const input=structuredClone(original);
  const saved=normalizeProjects(input);
  assert.deepEqual(saved,input);
  assert.notStrictEqual(saved.research.milestones,input.research.milestones);
  const [project]=summarizeProjectPortfolio(saved,branches(),tasks()).projects;
  assert.deepEqual(project.milestones,saved.research.milestones);
  assert.equal(project.including.total,2);
  assert.equal(project.progress,0,'Milestone completion must never change task-derived progress');
  saved.research.milestones[0].title='Edited privately';
  assert.equal(input.research.milestones[0].title,'Validate first prototype');
  assert.deepEqual(normalizeProjects({research:{}}),
    {research:{description:'',status:'active',links:[]}});
});

test('PJ-03 project milestone IDs, dates and fields are bounded and validated',()=>{
  const valid={id:'ms_one',title:' Evaluate samples ',targetDate:'2028-02-29',done:false};
  const normalized=normalizeProjects({research:{milestones:[valid]}});
  assert.deepEqual(normalized.research.milestones,
    [{id:'ms_one',title:'Evaluate samples',targetDate:'2028-02-29',done:false}]);
  const wrong=[
    'milestone',{},null,[null],Array.from({length:13},(_,i)=>({
      id:'m'+i,title:'item',targetDate:'',done:false})),
    [{id:'unsafe/id',title:'Task',targetDate:'',done:false}],
    [{id:'__proto__',title:'Task',targetDate:'',done:false}],
    [{id:'ms',title:' ',targetDate:'',done:false}],
    [{id:'ms',title:'a'.repeat(141),targetDate:'',done:false}],
    [{id:'ms',title:'T',targetDate:'2027-02-29',done:false}],
    [{id:'ms',title:'T',targetDate:'2027-13-01',done:false}],
    [{id:'ms',title:'T',targetDate:'tomorrow',done:false}],
    [{id:'ms',title:'T',targetDate:'',done:'true'}],
    [{id:'ms',title:'T',targetDate:'',done:false,href:'javascript:alert(1)'}],
    [{id:'same',title:'First',targetDate:'',done:false},{id:'same',title:'Second',targetDate:'',done:false}]
  ];
  for(const item of wrong)assert.throws(()=>normalizeProjects({research:{milestones:item}}));
});


test('PJ-03 qualitative project health is owner-selected, never task-derived',()=>{
  const active={research:{description:'Private plan',status:'active',links:[],
    health:'needs-attention'}};
  const normalized=normalizeProjects(active);
  assert.deepEqual(normalized,active);
  const [project]=summarizeProjectPortfolio(normalized,branches(),tasks()).projects;
  assert.equal(project.health,'needs-attention');
  assert.equal(project.progress,0,'Health must not change task completion');
  assert.deepEqual(normalizeProjects({research:{health:''}}),
    {research:{description:'',status:'active',links:[]}});
  assert.equal(summarizeProjectPortfolio({research:{}},branches(),tasks()).projects[0].health,'');
  for(const health of ['green','published',null,1,{},['blocked']]){
    assert.throws(()=>normalizeProjects({research:{health}}));
  }
});

test('PJ-03 local project finder filters by status and diacritic-insensitive text',()=>{
  const rows=[
    {id:'research',label:'Éducation lab',path:'Root / Research',status:'active',
      health:'needs-attention',description:'Private study',goal:'Validate samples',
      nextAction:'Review protocol',blockers:'',links:[{label:'Lab dossier',url:'https://example.org/'}],
      milestones:[{id:'ms1',title:'First assay',targetDate:'',done:false}]},
    {id:'writing',label:'Essay',path:'Root / Writing',status:'paused',
      health:'',description:'Draft work',goal:'Publish a new text',nextAction:'',blockers:'',
      links:[],milestones:[]},
    {id:'finished',label:'Archive',path:'Root / Archive',status:'completed',
      health:'on-track',description:'Historic work',goal:'',nextAction:'',blockers:'',
      links:[],milestones:[]},
  ];
  const original=structuredClone(rows);
  const ids=(query,status='all')=>filterProjectPortfolio(rows,{query,status}).map(item=>item.id);
  assert.deepEqual(ids(''),['research','writing','finished']);
  assert.deepEqual(ids('education'),['research']);
  assert.deepEqual(ids('protocol validate'),['research']);
  assert.deepEqual(ids('lab dossier'),['research']);
  assert.deepEqual(ids('first assay'),['research']);
  assert.deepEqual(ids('blocked'),[],'Unassessed or needs-attention health is not guessed as blocked');
  assert.deepEqual(ids('needs-attention'),['research']);
  assert.deepEqual(ids('', 'paused'),['writing']);
  assert.deepEqual(ids('essay','active'),[]);
  assert.deepEqual(ids('ARCHIVE','completed'),['finished']);
  assert.deepEqual(rows,original,'Filtering must not mutate private records');
  assert.throws(()=>filterProjectPortfolio(rows,{status:'published'}));
  assert.throws(()=>filterProjectPortfolio(null,{query:'a'}));
  assert.throws(()=>filterProjectPortfolio(rows,{query:{text:'a'}}));
});
