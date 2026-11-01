import { daysUntil, dueLabel, taskColor } from './model.js';
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

export class ScrapWidgets {
  constructor({onFocus,onComplete,onRestore,onChangeMilestones,onOpenJournal,notify=()=>{}}){
    Object.assign(this,{onFocus,onComplete,onRestore,onChangeMilestones,onOpenJournal});
    this.notify=notify;
    this.activeEl=document.getElementById('active-task-list');
    this.completedEl=document.getElementById('completed-task-list');
    this.scroll=document.getElementById('timeline-scroll');
    this.surface=document.getElementById('timeline-surface');
    this.pxPerDay=5.3;this.scrolledInitially=false;
    this.milestones=[];this.journalEntries=[];this.tasks=[];this.branches=[];this.mode='deadline';
    this.timelineStart=0;
    this.initTimeline();
  }
  setData(branches,tasks,mode,milestones=[]){
    const activeTop=this.activeEl.scrollTop,doneTop=this.completedEl.scrollTop;
    this.branches=branches;this.tasks=tasks;this.mode=mode;this.milestones=milestones;
    this.renderLists();this.activeEl.scrollTop=activeTop;this.completedEl.scrollTop=doneTop;
    this.renderTimeline();
  }
  setJournalEntries(entries){this.journalEntries=Array.isArray(entries)?entries:[];this.renderTimeline();}
  renderLists(){
    const active=byMode(this.tasks.filter(t=>t.status!=='completed'),this.mode);
    const done=[...this.tasks.filter(t=>t.status==='completed')].sort((a,b)=>String(b.completedAt||'').localeCompare(String(a.completedAt||'')));
    document.getElementById('active-count').textContent=active.length;
    document.getElementById('completed-count').textContent=done.length;
    this.activeEl.replaceChildren();this.completedEl.replaceChildren();
    if(!active.length)this.activeEl.append(el('p','rail-empty','Nothing waiting here. Enjoy the space.'));
    for(const task of active){
      const item=el('div','rail-task');item.style.setProperty('--task-color',taskColor(task,this.mode));
      const focus=addButton(task.title,()=>this.onFocus(task),'rail-task-name');focus.setAttribute('aria-label',`Find ${task.title} in constellation`);
      item.append(focus);
      const info=el('div','rail-task-info');
      info.append(el('span','rail-category',branchPath(task.projectId,this.branches)||'Unsorted'));
      const due=el('span','rail-due',this.mode==='urgency'?`U${task.urgency} · ${dueLabel(task.dueDate)}`:dueLabel(task.dueDate));
      if(daysUntil(task.dueDate)!==null&&daysUntil(task.dueDate)<0)due.classList.add('is-late');
      info.append(due);item.append(info);
      const check=addButton('✓',()=>this.onComplete(task.id),'rail-check');check.title=`Complete ${task.title}`;check.setAttribute('aria-label',`Complete ${task.title}`);item.append(check);
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
      if(!title||!Number.isFinite(utcDate(date)))return;
      const entry={id:`mark-${Date.now()}-${Math.random().toString(36).slice(2,6)}`,title,date};
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
    const milestoneEnds=Array(3).fill(-Infinity),miniMilestones=this.pxPerDay<3.3;
    const orderedMilestones=[...this.milestones].filter(m=>Number.isFinite(utcDate(m.date))).sort((a,b)=>a.date.localeCompare(b.date));
    for(const entry of orderedMilestones){
      const ts=utcDate(entry.date);if(ts<start||ts>start+days*UTC_DAY)continue;
      const x=(ts-start)/UTC_DAY*this.pxPerDay+65,needed=miniMilestones?24:Math.min(205,Math.max(75,entry.title.length*6.8+22));
      let lane=milestoneEnds.findIndex(end=>x-end>needed+9);
      if(lane<0)lane=milestoneEnds.indexOf(Math.min(...milestoneEnds));
      milestoneEnds[lane]=x;
      const marker=el('button','timeline-milestone',miniMilestones?'◆':entry.title);marker.type='button';
      marker.style.left=`${x}px`;marker.style.top=`${203+lane*29}px`;
      if(miniMilestones)marker.classList.add('is-condensed');
      marker.title=`Milestone: ${entry.title}, ${entry.date}. Activate for removal options.`;
      marker.setAttribute('aria-label',marker.title);
      marker.addEventListener('click',()=>this.confirmMilestoneRemoval(entry));
      this.surface.append(marker);
    }
    // One visible page marker per date. Multiple pages on the same date are
    // represented by a count and opened at their newest page.
    const pagesByDay=new Map();
    for(const entry of this.journalEntries){const key=entry.date?.slice(0,10);if(!Number.isFinite(utcDate(key)))continue;
      if(!String(entry.title||'').trim()&&!String(entry.html||'').replace(/<[^>]*>/g,'').trim())continue;
      const group=pagesByDay.get(key)||[];group.push(entry);pagesByDay.set(key,group);}
    const journalEnds=Array(3).fill(-Infinity);
    for(const [date,entries] of [...pagesByDay.entries()].sort((a,b)=>a[0].localeCompare(b[0]))){
      const x=(utcDate(date)-start)/UTC_DAY*this.pxPerDay+65;
      const mini=this.pxPerDay<3.2;
      const needed=mini?30:82;
      let lane=journalEnds.findIndex(end=>x-end>needed+6);
      if(lane<0)lane=journalEnds.indexOf(Math.min(...journalEnds));journalEnds[lane]=x;
      const latest=[...entries].sort((a,b)=>String(b.updatedAt||'').localeCompare(String(a.updatedAt||'')))[0];
      const marker=el('button','timeline-journal');marker.type='button';
      const glyph=el('span','journal-page-glyph');glyph.setAttribute('aria-hidden','true');marker.append(glyph);
      if(!mini)marker.append(el('span','journal-chip-label',`${monthLabel(new Date(utcDate(date)))}${entries.length>1?` · ${entries.length}`:''}`));
      marker.style.left=`${x}px`;marker.style.top=`${295+lane*25}px`;
      if(mini)marker.classList.add('is-condensed');
      marker.title=`Journal, ${date}: ${entries.length} ${entries.length===1?'page':'pages'}${latest.title?` · ${latest.title}`:''}`;
      marker.setAttribute('aria-label',`Open journal page for ${date}${entries.length>1?`, ${entries.length} pages`:''}`);
      marker.addEventListener('click',()=>this.onOpenJournal?.(latest.id));this.surface.append(marker);
    }
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
