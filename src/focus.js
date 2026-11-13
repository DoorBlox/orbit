/** FO-01: Optional, private, ephemeral Focus timer.
 * Timer progress uses sessionStorage scoped to the active view, never the cloud
 * workspace or V6 backup. No per-second storage writes or notifications.
 */
const WORK_MIN=25, BREAK_MIN=5;
const DURATION_MINUTES=60_000;
const isMinute=(value,max)=>Number.isSafeInteger(value)&&value>=1&&value<=max;
const validWall=value=>Number.isFinite(value)&&value>=0&&value<=8_640_000_000_000_000;
const fresh=()=>({version:1,phase:'work',status:'idle',
  workMinutes:WORK_MIN,breakMinutes:BREAK_MIN,elapsedMs:0,startedWallMs:null});
const duration=s=>(s.phase==='work'?s.workMinutes:s.breakMinutes)*DURATION_MINUTES;
function validateSaved(value){
  if(!value||typeof value!=='object'||Array.isArray(value)||
    value.version!==1||!['work','break'].includes(value.phase)||
    !['idle','running','paused','finished'].includes(value.status)||
    !isMinute(value.workMinutes,120)||!isMinute(value.breakMinutes,60)||
    !Number.isFinite(value.elapsedMs)||value.elapsedMs<0||value.elapsedMs>duration(value)||
    (value.status==='running'?!validWall(value.startedWallMs):value.startedWallMs!==null))
    return null;
  return {version:1,phase:value.phase,status:value.status,
    workMinutes:value.workMinutes,breakMinutes:value.breakMinutes,
    elapsedMs:value.elapsedMs,startedWallMs:value.startedWallMs};
}
function sensibleNow(now){
  const value=now();
  return Number.isFinite(value)?value:0;
}

const safeSessionStorage=()=>{
  try{return globalThis.sessionStorage??null;}catch{return null;}
};

/** Testable clock independent of DOM, animation frames and network callbacks. */
export function createFocusClock({
  storage=safeSessionStorage(),storageKey='orbit.fo01.v1.local',
  monoNow=()=>performance.now(),wallNow=()=>Date.now(),
}={}){
  let disposed=false,storageAvailable=Boolean(storage),stored=null;
  try{
    const raw=storage?.getItem(storageKey);
    if(raw&&raw.length<=1000)stored=validateSaved(JSON.parse(raw));
  }catch{storageAvailable=false;}
  let state=stored||fresh();
  let monoStart=sensibleNow(monoNow),baseElapsed=state.elapsedMs;
  const elapsed=()=>{
    if(state.status!=='running')return state.elapsedMs;
    return Math.min(duration(state),baseElapsed+
      Math.max(0,sensibleNow(monoNow)-monoStart));
  };
  if(state.status==='running'){
    // A new document has a new performance clock origin. Reconstitute using
    // the persisted wall anchor, then resume with monotonic ticks.
    const wallElapsed=Math.max(0,sensibleNow(wallNow)-state.startedWallMs);
    baseElapsed=Math.min(duration(state),state.elapsedMs+wallElapsed);
    if(baseElapsed>=duration(state)){
      state={...state,status:'finished',elapsedMs:duration(state),startedWallMs:null};
    }else{
      state={...state,elapsedMs:baseElapsed,startedWallMs:sensibleNow(wallNow)};
      monoStart=sensibleNow(monoNow);
    }
  }
  const write=()=>{
    if(disposed)return;
    try{
      if(!storage||typeof storage.setItem!=='function')throw Error('Session storage unavailable');
      storage.setItem(storageKey,JSON.stringify(state));
      storageAvailable=true;
    }catch{storageAvailable=false;}
  };
  const snapshot=()=>{
    const spent=elapsed(),total=duration(state);
    return {phase:state.phase,status:state.status,workMinutes:state.workMinutes,
      breakMinutes:state.breakMinutes,elapsedMs:spent,durationMs:total,
      remainingMs:Math.max(0,total-spent),storageAvailable};
  };
  const complete=()=>{
    state={...state,elapsedMs:duration(state),startedWallMs:null,status:'finished'};
    write();return snapshot();
  };
  const clock={
    getState:snapshot,
    start(){
      if(disposed||state.status==='running'||state.status==='finished')return false;
      state={...state,status:'running',startedWallMs:sensibleNow(wallNow)};
      monoStart=sensibleNow(monoNow);baseElapsed=state.elapsedMs;write();return true;
    },
    pause(){
      if(disposed||state.status!=='running')return false;
      const spent=elapsed();
      if(spent>=duration(state)){complete();return true;}
      state={...state,elapsedMs:spent,startedWallMs:null,status:'paused'};write();return true;
    },
    reset(){
      if(disposed)return false;
      state={...state,elapsedMs:0,startedWallMs:null,status:'idle'};write();return true;
    },
    nextPhase(){
      if(disposed)return false;
      state={...state,phase:state.phase==='work'?'break':'work',
        elapsedMs:0,startedWallMs:null,status:'idle'};write();return true;
    },
    setDurations({workMinutes,breakMinutes}={}){
      if(disposed||state.status==='running'||
        !isMinute(workMinutes,120)||!isMinute(breakMinutes,60))return false;
      state={...state,workMinutes,breakMinutes};
      if(state.elapsedMs>duration(state)){
        state={...state,elapsedMs:duration(state),status:'finished'};
      }
      write();return true;
    },
    tick(){
      if(disposed)return snapshot();
      if(state.status==='running'&&elapsed()>=duration(state))return complete();
      return snapshot();
    },
    reconcile(){
      if(disposed||state.status!=='running')return snapshot();
      const monoElapsed=elapsed();
      const wallElapsed=Math.min(duration(state),baseElapsed+
        Math.max(0,sensibleNow(wallNow)-state.startedWallMs));
      const spent=Math.max(monoElapsed,wallElapsed);
      if(spent>=duration(state))return complete();
      state={...state,elapsedMs:spent,startedWallMs:sensibleNow(wallNow)};
      baseElapsed=spent;monoStart=sensibleNow(monoNow);
      write();return snapshot();
    },
    dispose({clearSession=false}={}){
      if(disposed)return;
      if(clearSession){
        try{storage?.removeItem(storageKey);}catch{/* No storage access. */}
      }
      disposed=true;
    },
  };
  return clock;
}
const el=(tag,className='',text)=>{const n=document.createElement(tag);
  if(className)n.className=className;
  if(text!==undefined)n.textContent=text;
  return n;
};
const formatTime=milliseconds=>{
  const seconds=Math.ceil(milliseconds/1000);
  return String(Math.floor(seconds/60)).padStart(2,'0')+':'+
    String(seconds%60).padStart(2,'0');
};

/** The visible, first-party spatial window; the only saved workspace data is
 * its existing optional-window geometry. Clock session data stays tab-scoped. */
export class FocusWidget {
  constructor({readOnly=false,storageKey='orbit.fo01.v1.local',storage=safeSessionStorage()}={}){
    this.readOnly=readOnly;this.events=new AbortController();
    this.clock=createFocusClock({storageKey,storage});
    const root=el('section','glass-widget spatial-item focus-timer-widget');
    root.id='fo01-focus-widget';root.dataset.widget='focus-timer';
    root.setAttribute('aria-labelledby','fo01-title');
    root.style.width='410px';root.style.height='465px';
    this.element=root;
    const header=el('header','widget-heading focus-timer-heading');
    const grip=el('button','widget-grip','⠿');
    grip.type='button';grip.setAttribute('aria-label','Move Focus timer widget');
    grip.title='Drag Focus timer. Arrow keys move this window.';
    const identity=el('div','focus-timer-identity');
    identity.append(el('span','eyebrow','YOUR QUIET INTERVAL'));
    const heading=el('h2','');heading.id='fo01-title';
    heading.append(el('span','','Focus'),el('span','heading-period','.'));
    identity.append(heading);
    header.append(grip,identity);root.append(header);

    const phase=el('p','focus-timer-phase');this.phase=phase;root.append(phase);
    const time=el('output','focus-timer-display','25:00');
    time.id='fo01-time';time.setAttribute('role','timer');
    time.setAttribute('aria-label','Focus timer remaining');
    time.setAttribute('aria-live','off');
    this.time=time;root.append(time);
    const bar=el('div','focus-timer-progress');
    bar.id='fo01-progress';bar.setAttribute('role','progressbar');
    bar.setAttribute('aria-label','Focus timer progress');
    bar.setAttribute('aria-valuemin','0');bar.setAttribute('aria-valuemax','100');
    this.progress=bar;const fill=el('div','focus-timer-progress-fill');
    bar.append(fill);this.fill=fill;root.append(bar);
    const status=el('p','focus-timer-status');status.id='fo01-status';
    status.setAttribute('aria-live','polite');status.setAttribute('aria-atomic','true');
    this.status=status;root.append(status);

    const fields=el('div','focus-timer-settings');
    const durationInput=(label,id,min,max,value)=>{
      const wrapper=el('label','focus-timer-setting',label);
      const input=el('input');input.type='number';input.id=id;
      input.min=String(min);input.max=String(max);input.step='1';
      input.value=String(value);input.inputMode='numeric';
      input.disabled=readOnly;
      wrapper.append(input);fields.append(wrapper);return input;
    };
    this.work=durationInput('Focus · min','fo01-work-minutes',1,120,25);
    this.rest=durationInput('Break · min','fo01-break-minutes',1,60,5);
    root.append(fields);
    const actions=el('div','focus-timer-actions');
    const action=(id,title,handler)=>{
      const button=el('button','glass-button',title);
      button.type='button';button.id=id;button.disabled=readOnly;
      button.addEventListener('click',()=>{handler();this.render();},{signal:this.events.signal});
      actions.append(button);return button;
    };
    this.start=action('fo01-start','Start',()=>this.clock.start());
    this.pause=action('fo01-pause','Pause',()=>this.clock.pause());
    this.reset=action('fo01-reset','Reset',()=>this.clock.reset());
    this.next=action('fo01-next','Next phase',()=>this.clock.nextPhase());
    root.append(actions);
    const note=el('p','focus-timer-note');
    this.note=note;root.append(note);
    const changed=()=>{
      if(!this.clock.setDurations({
        workMinutes:Number(this.work.value),breakMinutes:Number(this.rest.value),
      })){
        const state=this.clock.getState();
        this.work.value=String(state.workMinutes);this.rest.value=String(state.breakMinutes);
      }
      this.render();
    };
    this.work.addEventListener('change',changed,{signal:this.events.signal});
    this.rest.addEventListener('change',changed,{signal:this.events.signal});
    const resume=()=>{if(document.visibilityState!=='hidden')this.clock.reconcile();this.render();};
    document.addEventListener('visibilitychange',resume,{signal:this.events.signal});
    window.addEventListener('pageshow',resume,{signal:this.events.signal});
    window.addEventListener('focus',resume,{signal:this.events.signal});
    this.interval=setInterval(()=>{this.clock.tick();this.render();},1000);
    this.render();
  }
  render(){
    const s=this.clock.getState(),isWork=s.phase==='work',running=s.status==='running';
    this.phase.textContent=isWork?'FOCUS INTERVAL':'BREAK INTERVAL';
    this.time.textContent=formatTime(s.remainingMs);
    const percent=Math.round(100*s.elapsedMs/s.durationMs);
    this.progress.setAttribute('aria-valuenow',String(percent));
    this.fill.style.width=percent+'%';
    const descriptions={
      idle:isWork?'Ready when you are.':'A little room to breathe.',
      running:isWork?'Focus session running.':'Break is running.',
      paused:'Paused. Return when ready.',
      finished:isWork?'Focus complete. Choose your break.':'Break complete. Ready to focus.',
    };
    const statusText=descriptions[s.status];
    if(this.status.textContent!==statusText)this.status.textContent=statusText;
    this.start.textContent=s.status==='paused'?'Resume':'Start';
    this.start.disabled=this.readOnly||running||s.status==='finished';
    this.pause.disabled=this.readOnly||!running;
    this.reset.disabled=this.readOnly||s.status==='idle';
    this.next.disabled=this.readOnly;
    this.work.disabled=this.readOnly||running;
    this.rest.disabled=this.readOnly||running;
    if(document.activeElement!==this.work)this.work.value=String(s.workMinutes);
    if(document.activeElement!==this.rest)this.rest.value=String(s.breakMinutes);
    this.note.textContent=s.storageAvailable?
      'This timer stays in this tab. Your work is not changed.':
      'Session storage is unavailable. This timer may reset after a reload.';
    this.element.dataset.phase=s.phase;this.element.dataset.timerStatus=s.status;
  }
  dispose({clearSession=false}={}){
    clearInterval(this.interval);this.events.abort();
    this.clock.dispose({clearSession});
    this.element.remove();
  }
}
