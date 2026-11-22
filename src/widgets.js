import { daysUntil, dueLabel, taskColor, getDailyOccurrence } from './model.js';
import { branchPath } from './data.js';
import { civilTimestamp, todayKey, dateLabel, DAY_MS } from './dates.js';

const el=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;};
const monthLabel=value=>dateLabel(value.toISOString().slice(0,10),{month:'short',day:'numeric'});
const UTC_DAY=DAY_MS;
const midnight=d=>civilTimestamp(todayKey(d));
const utcDate=civilTimestamp;
const byMode=(tasks,mode)=>[...tasks].sort((a,b)=>{
  const ua=Number(a.urgency)||1,ub=Number(b.urgency)||1;
  const da=daysUntil(a.dueDate),db=daysUntil(b.dueDate);
  const dueDiff=(da??Infinity)-(db??Infinity);
  return mode==='urgency'?(ub-ua||dueDiff||a.title.localeCompare(b.title)):(dueDiff||ub-ua||a.title.localeCompare(b.title));
});
const addButton=(text,fn,css='')=>{const b=el('button',css,text);b.type='button';b.addEventListener('click',e=>{e.stopPropagation();fn();});return b;};

/** FB-224: readable positions are local to the visible date, not the deepest
 * milestone anywhere on the timeline. This is presentation-only geometry:
 * input dates, titles, colors, source arrays, and owner snapshots are untouched.
 * Dense rows expand the scroll surface rather than reusing occupied lanes. */
export function layoutTimelineAnnotations(milestones=[],journals=[]){
  const gap=8,milestoneHeight=36,journalHeight=29,slotEnds=[];
  const eventMarkers=milestones.map(item=>{
    const width=item.width,left=item.x-width/2,right=item.x+width/2;
    let lane=slotEnds.findIndex(end=>left>=end+gap);
    if(lane<0){lane=slotEnds.length;slotEnds.push(-Infinity);}
    slotEnds[lane]=right;
    const top=164+lane*44;
    return {...item,left,right,top,bottom:top+milestoneHeight};
  });
  // Only rectangles near this journal's date can push it down.
  // Existing journal rectangles become obstacles to later close dates.
  const obstacles=[...eventMarkers];
  const pageMarkers=journals.map(item=>{
    const width=item.width,left=item.x-width/2,right=item.x+width/2;
    let top=213;
    for(let attempt=0;attempt<=obstacles.length;attempt++){
      let next=top;
      for(const block of obstacles){
        if(left>=block.right+gap||right<=block.left-gap)continue;
        if(top<block.bottom+gap && top+journalHeight>block.top-gap)
          next=Math.max(next,block.bottom+gap);
      }
      if(next===top)break;
      top=next;
    }
    const placed={...item,left,right,top,bottom:top+journalHeight};
    obstacles.push(placed);
    return placed;
  });
  const requiredHeight=Math.max(350,...eventMarkers.map(e=>e.bottom+36),
    ...pageMarkers.map(e=>e.bottom+36));
  return {milestones:eventMarkers,journals:pageMarkers,requiredHeight:Math.ceil(requiredHeight)};
}


export class ScrapWidgets {
  constructor({onFocus,onComplete,onRestore,onChangeMilestones,onOpenJournal,notify=()=>{}}){
    Object.assign(this,{onFocus,onComplete,onRestore,onChangeMilestones,onOpenJournal});
    this.notify=notify;
    this.activeEl=document.getElementById('active-task-list');
    this.completedEl=document.getElementById('completed-task-list');
    this.scroll=document.getElementById('timeline-scroll');
    this.surface=document.getElementById('timeline-surface');
    this.pxPerDay=5.3;this.scrolledInitially=false;
    this.milestones=[];this.journalEntries=[];this.tasks=[];this.branches=[];this.mode='deadline';this.routines={};this.routineFocusTask=null;
    this.timelineStart=0;
    this.initTimeline();
    this.routineSummary=el('button','timeline-routine-summary');this.routineSummary.type='button';
    this.routineSummary.hidden=true;
    this.routineSummary.addEventListener('click',()=>{if(this.routineFocusTask)this.onFocus(this.routineFocusTask);});
    document.querySelector('.timeline-footnote')?.append(this.routineSummary);
  }
  setData(branches,tasks,mode,milestones=[],routines={}){
    const activeTop=this.activeEl.scrollTop,doneTop=this.completedEl.scrollTop;
    this.branches=branches;this.tasks=tasks;this.mode=mode;this.milestones=milestones;this.routines=routines||{};
    this.renderLists();this.activeEl.scrollTop=activeTop;this.completedEl.scrollTop=doneTop;
    this.renderTimeline();
  }
  setJournalEntries(entries){this.journalEntries=Array.isArray(entries)?entries:[];this.renderTimeline();}
  renderLists(){
    const active=byMode(this.tasks.filter(t=>t.status!=='completed'||Object.hasOwn(this.routines,t.id)),this.mode);
    const done=[...this.tasks.filter(t=>t.status==='completed'&&!Object.hasOwn(this.routines,t.id))].sort((a,b)=>String(b.completedAt||'').localeCompare(String(a.completedAt||'')));
    document.getElementById('active-count').textContent=active.length;
    document.getElementById('completed-count').textContent=done.length;
    this.activeEl.replaceChildren();this.completedEl.replaceChildren();
    if(!active.length)this.activeEl.append(el('p','rail-empty','Nothing waiting here. Enjoy the space.'));
    for(const task of active){
      const daily=getDailyOccurrence(task,this.routines);
      const item=el('div','rail-task');
      item.classList.toggle('is-daily-complete',Boolean(daily?.completed));item.style.setProperty('--task-color',taskColor(task,this.mode));
      const focus=addButton(task.title,()=>this.onFocus(task),'rail-task-name');focus.setAttribute('aria-label',`Find ${task.title} in constellation`);
      item.append(focus);
      const info=el('div','rail-task-info');
      info.append(el('span','rail-category',branchPath(task.projectId,this.branches)||'Unsorted'));
      const due=el('span','rail-due',this.mode==='urgency'?`U${task.urgency} · ${dueLabel(task.dueDate)}`:dueLabel(task.dueDate));
      if(daysUntil(task.dueDate)!==null&&daysUntil(task.dueDate)<0)due.classList.add('is-late');
      info.append(due);if(daily?.active)info.append(el('span','rail-routine-label',daily.completed?'Daily · done today':'Daily · today'));item.append(info);
      const check=addButton(daily?.completed?'↶':'✓',()=>daily?.completed?this.onRestore(task.id):this.onComplete(task.id),'rail-check');
      check.title=daily?(daily.completed?`Undo today for ${task.title}`:`Complete today: ${task.title}`):`Complete ${task.title}`;
      check.setAttribute('aria-label',check.title);item.append(check);
      this.activeEl.append(item);
    }
    if(!done.length)this.completedEl.append(el('p','rail-empty','Completed tasks will appear here, not on the map.'));
    for(const task of done){
      const item=el('div','rail-task done-task');
      item.append(el('div','rail-task-name-static',task.title));
      const info=el('div','rail-task-info');info.append(el('span','rail-category',branchPath(task.projectId,this.branches)||'Unsorted'));
      info.append(addButton('Reopen',()=>this.onRestore(task.id),'reopen-button'));item.append(info);
      this.completedEl.append(item);
    }
  }
  initTimeline(){
    document.getElementById('timeline-zoom-in').addEventListener('click',()=>this.adjustZoom(1.55));
    document.getElementById('timeline-zoom-out').addEventListener('click',()=>this.adjustZoom(1/1.55));
    document.getElementById('timeline-today').addEventListener('click',()=>this.centerToday(true));
    const form=document.getElementById('milestone-form');
    document.getElementById('timeline-add').addEventListener('click',()=>{form.hidden=!form.hidden;if(!form.hidden){document.getElementById('milestone-date').value=todayKey();document.getElementById('milestone-title').focus();}});
    document.getElementById('milestone-cancel').addEventListener('click',()=>{form.hidden=true;});
    form.addEventListener('submit',e=>{e.preventDefault();
      const title=document.getElementById('milestone-title').value.trim().slice(0,110);
      const date=document.getElementById('milestone-date').value;
      const chosenColor=document.getElementById('milestone-color').value;
      if(!title||!Number.isFinite(utcDate(date)))return;
      const color=/^#[0-9a-fA-F]{6}$/.test(chosenColor)?chosenColor:'#6578c4';
      const entry={id:`mark-${Date.now()}-${Math.random().toString(36).slice(2,6)}`,title,date,color};
      this.onChangeMilestones([...this.milestones,entry]);form.reset();form.hidden=true;
    });
    this.scroll.addEventListener('wheel',e=>{if(e.ctrlKey||e.metaKey){e.preventDefault();this.adjustZoom(e.deltaY<0?1.25:.8);}}, {passive:false});
  }
  adjustZoom(mult){const anchor=this.scroll.scrollLeft+this.scroll.clientWidth/2;
    const centerDay=anchor/this.pxPerDay;
    this.pxPerDay=Math.max(1.5,Math.min(30,this.pxPerDay*mult));
    this.renderTimeline();this.scroll.scrollLeft=Math.max(0,centerDay*this.pxPerDay-this.scroll.clientWidth/2);
  }
  centerToday(smooth=false){const todayOffset=(midnight(new Date())-this.timelineStart)/UTC_DAY*this.pxPerDay+65;
    this.scroll.scrollTo({left:Math.max(0,todayOffset-this.scroll.clientWidth*.35),behavior:smooth?'smooth':'instant'});
  }
  renderTimeline(){
    if(!this.surface)return;
    const todayRoutines=this.tasks.map(task=>({task,occurrence:getDailyOccurrence(task,this.routines)}))
      .filter(item=>item.occurrence?.active);
    const done=todayRoutines.filter(item=>item.occurrence.completed).length;
    this.routineFocusTask=(todayRoutines.find(item=>!item.occurrence.completed)||todayRoutines[0])?.task||null;
    if(this.routineSummary){this.routineSummary.hidden=!todayRoutines.length;
      this.routineSummary.textContent=`Daily today: ${done} / ${todayRoutines.length} complete`;
    }
    const now=midnight(new Date());const dates=[...this.tasks.map(t=>utcDate(t.dueDate)),
      ...this.milestones.map(m=>utcDate(m.date)),...this.journalEntries.map(j=>utcDate(j.date?.slice(0,10)))].filter(Number.isFinite);
    const earliest=Math.min(now-120*UTC_DAY,...dates),latest=Math.max(now+300*UTC_DAY,...dates);
    // A timeline is also a life history: dates outside the current semester still exist.
    const start=earliest-28*UTC_DAY,days=Math.ceil((latest+45*UTC_DAY-start)/UTC_DAY);
    const priorStart=this.timelineStart;this.timelineStart=start;
    const offsetChange=(priorStart&&priorStart!==start)?(priorStart-start)/UTC_DAY*this.pxPerDay:0;
    const width=days*this.pxPerDay+165;
    this.surface.style.width=`${width}px`;
    this.surface.replaceChildren();
    const base=el('div','timeline-base');this.surface.append(base);
    const step=this.pxPerDay<3?30:this.pxPerDay<8?14:7;
    for(let day=0;day<days;day+=step){
      const stamp=new Date(start+day*UTC_DAY),tick=el('div','timeline-tick');tick.style.left=`${day*this.pxPerDay+65}px`;
      tick.append(el('span','timeline-tick-label',monthLabel(stamp)));this.surface.append(tick);
    }
    const today=el('div','timeline-now');today.style.left=`${(now-start)/UTC_DAY*this.pxPerDay+65}px`;today.append(el('span','','NOW'));this.surface.append(today);
    // Reserve the upper region for stacked deadlines, the middle for milestones,
    // and the lower region for paper-page links. Nothing sits outside scroll bounds.
    const condensed=this.pxPerDay<9;
    const markerWidth=condensed?16:110,laneEnds=Array(8).fill(-Infinity);
    const dueTasks=this.tasks.filter(t=>Number.isFinite(utcDate(t.dueDate)))
      .sort((a,b)=>utcDate(a.dueDate)-utcDate(b.dueDate));
    for(const task of dueTasks){
      const ts=utcDate(task.dueDate);if(ts<start||ts>start+days*UTC_DAY)continue;
      const x=Math.round((ts-start)/UTC_DAY)*this.pxPerDay+65;
      let lane=laneEnds.findIndex(end=>x-end>markerWidth+3);
      if(lane<0)lane=laneEnds.indexOf(Math.min(...laneEnds));
      laneEnds[lane]=x;
      const marker=el('button','timeline-task',condensed?'':task.title);marker.type='button';
      if(condensed)marker.classList.add('is-condensed');
      marker.style.left=`${x}px`;marker.style.top=`${12+lane*18}px`;
      marker.style.setProperty('--task-color',taskColor(task,this.mode));
      marker.title=`${task.title} · ${dueLabel(task.dueDate)}`;marker.setAttribute('aria-label',marker.title);
      if(task.status==='completed')marker.classList.add('timeline-completed');
      marker.addEventListener('click',()=>this.onFocus(task));this.surface.append(marker);
    }
    // Collision-free date-local milestone rows and journal links.
    const miniMilestones=this.pxPerDay<3.3,miniJournals=this.pxPerDay<3.2;
    const orderedMilestones=[...this.milestones].filter(m=>Number.isFinite(utcDate(m.date)))
      .sort((a,b)=>a.date.localeCompare(b.date));
    const milestoneSpecs=orderedMilestones.map(entry=>({
      entry,x:(utcDate(entry.date)-start)/UTC_DAY*this.pxPerDay+65,
      width:miniMilestones?27:Math.min(205,Math.max(75,entry.title.length*6.8+22)),
    })).filter(item=>item.x>=65&&item.x<=width-100);
    // One visible page link per date. Multiple pages on the same date retain
    // their count and open the most recently edited one; do not alter any pages.
    const pagesByDay=new Map();
    for(const entry of this.journalEntries){
      const key=entry.date?.slice(0,10);
      if(!Number.isFinite(utcDate(key)))continue;
      if(!String(entry.title||'').trim()&&!String(entry.html||'').replace(/<[^>]*>/g,'').trim())continue;
      const group=pagesByDay.get(key)||[];group.push(entry);pagesByDay.set(key,group);
    }
    const pageSpecs=[...pagesByDay.entries()].sort((a,b)=>a[0].localeCompare(b[0]))
      .map(([date,entries])=>({
        date,entries,x:(utcDate(date)-start)/UTC_DAY*this.pxPerDay+65,
        width:miniJournals?30:116,
      }));
    const positions=layoutTimelineAnnotations(milestoneSpecs,pageSpecs);
    for(const {entry,x,width:markerWidth,top,bottom} of positions.milestones){
      const color=/^#[0-9a-fA-F]{6}$/.test(entry.color??'')?entry.color:'#6578c4';
      // A full colored rail crosses the time axis and visually anchors the
      // event even when several milestones share a civil date.
      const rail=el('div','timeline-milestone-band');
      rail.setAttribute('aria-hidden','true');
      rail.style.left=`${x}px`;rail.style.height=`${bottom-146}px`;
      rail.style.setProperty('--milestone-accent',color);
      this.surface.append(rail);
      const marker=el('button','timeline-milestone',miniMilestones?'◆':entry.title);
      marker.type='button';marker.style.left=`${x}px`;marker.style.top=`${top}px`;
      marker.style.width=`${markerWidth}px`;
      marker.style.setProperty('--milestone-accent',color);
      if(miniMilestones)marker.classList.add('is-condensed');
      marker.title=`Milestone: ${entry.title}, ${entry.date}. Activate for removal options.`;
      marker.setAttribute('aria-label',marker.title);
      marker.addEventListener('click',()=>this.confirmMilestoneRemoval(entry));
      this.surface.append(marker);
    }
    for(const {date,entries,x,top} of positions.journals){
      const latest=[...entries].sort((a,b)=>String(b.updatedAt||'').localeCompare(String(a.updatedAt||'')))[0];
      const marker=el('button','timeline-journal');marker.type='button';
      const glyph=el('span','journal-page-glyph');glyph.setAttribute('aria-hidden','true');marker.append(glyph);
      if(!miniJournals)marker.append(el('span','journal-chip-label',
        `${monthLabel(new Date(utcDate(date)))}${entries.length>1?` · ${entries.length}`:''}`));
      marker.style.left=`${x}px`;marker.style.top=`${top}px`;
      if(miniJournals)marker.classList.add('is-condensed');
      marker.title=`Journal, ${date}: ${entries.length} ${entries.length===1?'page':'pages'}${latest.title?` · ${latest.title}`:''}`;
      marker.setAttribute('aria-label',`Open journal page for ${date}${entries.length>1?`, ${entries.length} pages`:''}`);
      marker.addEventListener('click',()=>this.onOpenJournal?.(latest.id));this.surface.append(marker);
    }
    // A busy period may legitimately need more than three rows. Keep all
    // interactive markers reachable via vertical scroll, not clipped or hidden.
    this.surface.style.height=positions.requiredHeight>355?`${positions.requiredHeight}px`:'100%';
    this.surface.style.minHeight=`${positions.requiredHeight}px`;
    this.scroll.classList.toggle('has-vertical-stacks',positions.requiredHeight>355);
    if(offsetChange){this.scroll.scrollLeft+=offsetChange;}
    if(!this.scrolledInitially){this.scrolledInitially=true;requestAnimationFrame(()=>this.centerToday());}
  }

  confirmMilestoneRemoval(entry){
    this.notify(`Remove milestone “${entry.title}”?`,10000,{label:'Remove',run:()=>{
      const index=this.milestones.findIndex(item=>item.id===entry.id);
      if(index<0)return;
      const saved=this.onChangeMilestones(this.milestones.filter(item=>item.id!==entry.id));
      this.notify(saved===false?'Milestone removed for this session; not saved.':'Milestone removed. You can undo.',10000,
        {label:'Undo',run:()=>{
          if(this.milestones.some(item=>item.id===entry.id))return;
          const restored=[...this.milestones];restored.splice(Math.min(index,restored.length),0,entry);
          const undoSaved=this.onChangeMilestones(restored);
          this.notify(undoSaved===false?'Milestone restored for this session; not saved.':'Milestone restored.');
        }});
    }});
  }
}
