/** BP-03: deterministic fake-clock calculation; no network or user data. */
import {createSyncController} from '../src/cloud/sync.js';

export const TICKS_PER_MINUTE=4; // 15-second polling interval

function syntheticSnapshot(taskCount){
  if(!Number.isSafeInteger(taskCount)||taskCount<0||taskCount>3000)throw Error('Invalid synthetic task count');
  return {
    branches:[{id:'research',parentId:'root',label:'Synthetic research'}],
    tasks:Array.from({length:taskCount},(_,i)=>({
      id:'synthetic-task-'+i,projectId:'research',
      title:'Synthetic work item '+String(i).padStart(4,'0')+' '.repeat(58),
      description:'Synthetic task description. '.repeat(8),
      status:i%7===0?'completed':'ready',urgency:3,effortMinutes:25,
      createdAt:'2026-11-09T00:00:00.000Z'
    })),
    journalEntries:Array.from({length:5},(_,i)=>({
      id:'synthetic-journal-'+i,date:'2026-11-0'+(i+1),
      title:'Synthetic page '+i,html:'<p>'+'Synthetic journal text. '.repeat(60)+'</p>'
    })),
    milestones:[],spatialLayout:{timeline:{x:445,y:105},constellation:{x:410,y:670}},
    preferences:{colorMode:'deadline'},extensions:{notes:[],taskLinks:{},journalScenes:{}}
  };
}

function fakePollClock(){
  let callback=null,stopped=false;
  return {
    start(fn,ms){if(ms!==15000||callback)throw Error('Unexpected poll schedule');callback=fn;return 1;},
    stop(id){if(id!==1)throw Error('Unexpected timer identity');stopped=true;},
    tick(){if(!callback||stopped)throw Error('Timer missing or stopped');callback();},
    get stopped(){return stopped;}
  };
}
const settle=()=>new Promise(resolve=>setImmediate(resolve));

async function runScenario(snapshot,{hiddenMinutes=0,visibleMinutes=0}={}){
  if(!Number.isSafeInteger(hiddenMinutes)||!Number.isSafeInteger(visibleMinutes)||
    hiddenMinutes<0||visibleMinutes<0)throw Error('Invalid simulation minutes');
  let visible=hiddenMinutes===0,online=true,reads=0,writes=0;
  const eventTarget=new EventTarget(),visibilityTarget=new EventTarget(),clock=fakePollClock();
  const repository={
    async loadOwnerSnapshot(){reads++;return {revision:0,snapshot};},
    async saveSnapshot(){writes++;throw Error('No synthetic simulation should save');}
  };
  const controller=createSyncController({repository,initialRevision:0,pollMs:15000,
    eventTarget,visibilityTarget,isVisible:()=>visible,isOnline:()=>online,
    pollScheduler:{setInterval:(cb,ms)=>clock.start(cb,ms),clearInterval:id=>clock.stop(id)}
  });
  try{
    for(let i=0;i<hiddenMinutes*TICKS_PER_MINUTE;i++){clock.tick();await settle();}
    if(hiddenMinutes&&visibleMinutes){visible=true;visibilityTarget.dispatchEvent(new Event('visibilitychange'));await settle();}
    for(let i=0;i<visibleMinutes*TICKS_PER_MINUTE;i++){clock.tick();await settle();}
    if(writes!==0)throw Error('Synthetic polling must not save');
    return reads;
  }finally{
    controller.dispose();
    if(!clock.stopped)throw Error('Poll timer leaked after dispose');
  }
}

export async function measureSyncTraffic(taskCount=100){
  const snapshot=syntheticSnapshot(taskCount),responseBytes=Buffer.byteLength(JSON.stringify({revision:0,snapshot}),'utf8');
  const [foreground,hidden,mixed]=await Promise.all([
    runScenario(snapshot,{visibleMinutes:60}),
    runScenario(snapshot,{hiddenMinutes:60}),
    runScenario(snapshot,{hiddenMinutes:45,visibleMinutes:15})
  ]);
  return {
    taskCount,responseBytes,
    fullForegroundReads:foreground,fullForegroundBytes:foreground*responseBytes,
    fullHiddenReads:hidden,fullHiddenBytes:hidden*responseBytes,
    mixedReads:mixed,mixedBytes:mixed*responseBytes
  };
}

if(process.argv[1]&&import.meta.url===new URL('file://'+process.argv[1]).href){
  for(const tasks of [30,100,300]){
    const result=await measureSyncTraffic(tasks);
    console.log(JSON.stringify({...result,note:'synthetic JSON-only estimates; not billed network or Production measurements'}));
  }
}
