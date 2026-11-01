// ORBIT V3 — a tree of named branches, never a fixed domain/role/project schema.
// Keep legacy IDs: existing Phase 1 / V2 task assignments continue to resolve.
export const DISPLAY_NAME = 'HISYAM';
export const DEFAULT_BRANCHES = [
  {id:'learning', parentId:'root', label:'Learning', color:'#6597E6'},
  {id:'student', parentId:'learning', label:'School'},
  {id:'physics', parentId:'student', label:'Physics & problems'},
  {id:'electromagnetism', parentId:'physics', label:'Electromagnetism'},
  {id:'coursework', parentId:'student', label:'Coursework'},
  {id:'explorer', parentId:'learning', label:'Independent learning'},
  {id:'reading', parentId:'explorer', label:'Things to read'},

  {id:'research', parentId:'root', label:'Research', color:'#9674C8'},
  {id:'atlas', parentId:'research', label:'Z + jets analysis'},
  {id:'researcher', parentId:'research', label:'Research practice'},
  {id:'writing', parentId:'researcher', label:'Writing & literature'},
  {id:'thinker', parentId:'research', label:'Questions'},
  {id:'concepts', parentId:'thinker', label:'Concept explorations'},

  {id:'leadership', parentId:'root', label:'Leadership', color:'#D48C54'},
  {id:'secretary', parentId:'leadership', label:'OSIS'},
  {id:'communications', parentId:'secretary', label:'Communication'},
  {id:'administration', parentId:'secretary', label:'Administration'},
  {id:'classmate', parentId:'leadership', label:'Class community'},
  {id:'class-life', parentId:'classmate', label:'Shared class life'},

  {id:'living', parentId:'root', label:'Everyday life', color:'#4D9F90'},
  {id:'self-care', parentId:'living', label:'Looking after myself'},
  {id:'chores', parentId:'self-care', label:'Personal admin'},
  {id:'wellbeing', parentId:'self-care', label:'Rest & wellbeing'},
  {id:'captured', parentId:'living', label:'Unsorted'},
  {id:'inbox', parentId:'captured', label:'Thoughts to sort'},

  {id:'just-because', parentId:'root', label:'Just Because', color:'#8B86CF'},
  {id:'curious-person', parentId:'just-because', label:'Curiosities'},
  {id:'just-make', parentId:'curious-person', label:'Make something'},
  {id:'play', parentId:'just-because', label:'Play & explore'},
  {id:'human', parentId:'just-because', label:'People & memories'},
  {id:'people', parentId:'human', label:'Time with people'},
];

export function branchIndex(branches) { return new Map(branches.map(b=>[b.id,b])); }
export function branchPath(id,branches) {
  const byId=branchIndex(branches); const labels=[]; const visited=new Set();
  while(id && id!=='root' && !visited.has(id) && byId.has(id)) {
    visited.add(id);const b=byId.get(id);labels.unshift(b.label);id=b.parentId;
  }
  return labels.join(' / ');
}
export function descendantsOf(id,branches){
  const result=new Set();let changed=true;
  while(changed){changed=false;for(const branch of branches){
    if(branch.id!==id && (branch.parentId===id || result.has(branch.parentId)) && !result.has(branch.id)){
      result.add(branch.id);changed=true;
    }
  }}
  return result;
}
export function createBranch(label,parentId,branches){
  const text=String(label||'').trim().slice(0,72);
  if(!text)throw Error('Give the branch a name.');
  if(parentId!=='root'&&!branches.some(b=>b.id===parentId))throw Error('That parent branch does not exist.');
  const id=`branch-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,7)}`;
  return {id,parentId,label:text};
}

function dueIn(days) {
  const d=new Date();d.setHours(12,0,0,0);d.setDate(d.getDate()+days);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
const demo=(id,title,projectId,days,urgency,criteria,effortMinutes=30,status='ready',description='')=>({
  id,title,projectId,dueDate:days===null?'':dueIn(days),urgency,criteria,
  effortMinutes,status,description,resourceUrl:'',createdAt:new Date().toISOString(),
});
export function getSampleTasks(){return [
  demo('demo-1','Work through 5 practice problems','electromagnetism',1,4,'Attempt five problems and mark any stuck steps',35),
  demo('demo-2','Review one difficult concept','physics',3,3,'Summarize the idea in my own words',25),
  demo('demo-3','Check assignment requirements','coursework',2,3,'List submission format and completion criteria',15),
  demo('demo-4','Finish a worksheet section','coursework',5,2,'Finish the first assigned section',35),
  demo('demo-5','Read one interesting chapter','reading',null,1,'Write down three surprising ideas',30),
  demo('demo-6','Recheck feature selections','atlas',4,4,'Confirm which variables enter the current test',40),
  demo('demo-7','Review experiment notebook','atlas',6,3,'Identify remaining checks and missing plots',45),
  demo('demo-8','Outline the next paragraph','writing',8,2,'Draft a claim and its supporting sources',25),
  demo('demo-9','Verify two references','writing',12,2,'Confirm author, year, title, and DOI',20),
  demo('demo-10','Sketch a philosophical question','concepts',null,1,'Capture the question without forcing an answer',20),
  demo('demo-11','Clarify a message draft','communications',1,4,'Confirm who, what, when and where',20),
  demo('demo-12','Review a template','administration',2,4,'Check required fields and approval flow',25),
  demo('demo-13','Organize pending requests','administration',7,2,'List each request and its current owner',20),
  demo('demo-14','Respond to one class request','class-life',3,3,'Acknowledge and clarify what is needed',15),
  demo('demo-15','Plan one shared class moment','class-life',14,2,'Offer one practical idea and ask for feedback',20),
  demo('demo-16','Sort personal notes','chores',5,2,'Put important files in the right place',25),
  demo('demo-17','Choose an unhurried break','wellbeing',null,1,'No criteria required for rest',20,'captured'),
  demo('demo-18','Decide where this thought belongs','inbox',null,1,'Choose a branch, or leave it here',10,'captured'),
  demo('demo-19','Design a tiny icon','just-make',null,1,'Make one version just for fun',30),
  demo('demo-20','Test a weird coding idea','just-make',null,1,'Create one small experiment and see what happens',35),
  demo('demo-21','Watch something interesting','play',null,1,'Enjoy it; no productivity goal',50,'captured'),
  demo('demo-22','Make time for a friend','people',null,1,'No scoring or streaks',25,'captured'),
];}
