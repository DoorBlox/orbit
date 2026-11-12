import {summarizeProjectPortfolio} from './projects.js';

/** A vetted, first-party seventh spatial window; saved snapshots contain data only. */
const node=(tag,className='',text=null)=>{
  const element=document.createElement(tag);
  if(className)element.className=className;
  if(text!==null)element.textContent=text;
  return element;
};
const plural=(n,word)=>n+' '+word+(n===1?'':'s');
const statusLabels={active:'Active',paused:'Paused',completed:'Completed'};

export class ProjectsShelf {
  constructor({readOnly=false,onCreate=()=>false,onOpen=()=>{},onUpdate=()=>false}={}){
    this.readOnly=readOnly;this.onCreate=onCreate;this.onOpen=onOpen;this.onUpdate=onUpdate;
    this.branches=[];this.tasks=[];this.projectMetadata={};
    this.element=node('section','glass-widget spatial-item projects-widget');
    this.element.id='projects-widget';this.element.dataset.widget='projects';
    this.element.setAttribute('aria-labelledby','projects-title');
    this.element.style.width=innerWidth<650?'430px':'960px';this.element.style.height='710px';

    const header=node('header','widget-heading projects-heading');
    const grip=node('button','widget-grip','⠿');grip.type='button';
    grip.title='Drag Projects. Arrow keys on this button move the window.';
    grip.setAttribute('aria-label','Move Projects widget');
    const titleGroup=node('div','projects-title-group');
    titleGroup.append(node('span','eyebrow','PRIVATE PROJECTS'));
    const title=node('h2','');title.id='projects-title';
    title.append(node('span','','Projects'),node('span','heading-period','.'));
    titleGroup.append(title,node('p','widget-subtitle','Your work, organized by project.'));
    const count=node('span','projects-count','0');count.setAttribute('aria-label','Private project count');
    this.count=count;header.append(grip,titleGroup,count);
    this.element.append(header);

    this.summary=node('p','projects-summary');this.summary.id='projects-summary';
    this.summary.setAttribute('aria-live','polite');this.element.append(this.summary);

    this.list=node('div','projects-list');this.list.id='projects-list';
    this.list.setAttribute('aria-label','Your private project overview');
    this.element.append(this.list);

    this.createForm=node('form','projects-create');
    this.createForm.setAttribute('aria-label','Mark a branch as a private project');
    const label=node('label','projects-create-label','Turn a branch into a project');
    this.selector=node('select','projects-create-select');
    this.selector.setAttribute('aria-label','Choose a branch for a private project');
    this.selector.required=true;
    label.append(this.selector);
    const create=node('button','projects-create-button','Add private project');
    create.type='submit';create.disabled=readOnly;
    this.createButton=create;
    this.createForm.append(label,create);
    this.createForm.addEventListener('submit',e=>{
      e.preventDefault();
      if(this.readOnly||!this.selector.value)return;
      const id=this.selector.value;
      if(this.onCreate(id)!==false){
        requestAnimationFrame(()=>{
          const card=[...this.list.querySelectorAll('.project-card')]
            .find(element=>element.dataset.projectId===id);
          card?.querySelector('.project-open')?.focus({preventScroll:true});
        });
      }
    });
    if(!readOnly)this.element.append(this.createForm);
    this.element.append(node('p','projects-private-footnote',
      'Only in your space. Nothing here is published to a website.'));
    this.setData([],[],{});
  }

  setData(branches,tasks,projectMetadata){
    this.branches=branches;this.tasks=tasks;this.projectMetadata=projectMetadata;
    const summary=summarizeProjectPortfolio(projectMetadata,branches,tasks);
    const count=summary.projects.length,totals=summary.totals;
    this.count.textContent=String(count);
    this.summary.textContent=plural(count,'project')+' · '+plural(totals.total,'unique task')+' · '+totals.completed+' finished';
    const existing=new Set(summary.projects.map(project=>project.id));
    if(!this.readOnly){
      const previous=this.selector.value;
      this.selector.replaceChildren();
      for(const branch of branches){
        if(existing.has(branch.id))continue;
        const option=node('option','',branch.label);option.value=branch.id;
        this.selector.append(option);
      }
      if([...this.selector.options].some(option=>option.value===previous))this.selector.value=previous;
      this.selector.disabled=!this.selector.options.length;
      this.createButton.disabled=this.selector.disabled;
    }
    this.list.replaceChildren();
    if(!count){
      const empty=node('div','projects-empty');empty.id='projects-empty';
      empty.append(node('span','projects-empty-symbol','✧'),
        node('h3','','A home for your projects'),
        node('p','',this.readOnly?'No projects have been marked yet.':
          'Pick a branch below, or right-click one in the constellation to turn it into a project.'));
      this.list.append(empty);return;
    }
    for(const project of summary.projects)this.list.append(this.buildCard(project));
  }

  buildCard(project){
    const card=node('article','project-card');
    card.dataset.projectId=project.id;
    card.setAttribute('aria-label',project.label+' private project');
    if(/^#[0-9a-fA-F]{6}$/.test(project.color))
      card.style.setProperty('--project-branch-color',project.color);
    const heading=node('div','project-card-heading');
    const name=node('div','project-name-group');
    name.append(node('span','project-path',project.path));
    name.append(node('h3','project-name',project.label));
    const open=node('button','project-open','Open branch');
    open.type='button';open.setAttribute('aria-label','Open '+project.label+' branch');
    open.addEventListener('click',()=>this.onOpen(project.id));
    heading.append(name,open);card.append(heading);

    const row=node('div','project-stats');
    row.append(node('span','',plural(project.direct.total,'direct task')),
      node('span','',project.including.total+' including sub-branches'));
    card.append(row);

    const progress=node('div','project-progress');
    if(project.progress!==null){
      const bar=node('progress','');bar.max=100;bar.value=project.progress;
      bar.setAttribute('aria-label','Tasks completed for '+project.label);
      progress.append(bar,node('span','project-progress-label',project.progress+'% finished'));
    }else progress.append(node('span','project-progress-label','No tasks to measure yet'));
    card.append(progress);

    if(project.milestones.length){
      const checklist=node('section','project-milestones');
      checklist.setAttribute('aria-label','Milestones for '+project.label);
      const heading=node('div','project-milestones-heading');
      heading.append(node('h4','','Milestones'),
        node('span','',project.milestoneStats.done+' of '+project.milestoneStats.total+' done'));
      checklist.append(heading);
      for(const milestone of project.milestones){
        const row=node('label','project-milestone');
        if(milestone.done)row.classList.add('is-done');
        row.dataset.milestoneId=milestone.id;
        const checkbox=node('input','project-milestone-toggle');
        checkbox.type='checkbox';checkbox.checked=milestone.done;checkbox.disabled=this.readOnly;
        checkbox.setAttribute('aria-label','Completed: '+milestone.title);
        checkbox.addEventListener('change',()=>{
          const before=milestone.done;
          const updated=project.milestones.map(entry=>
            entry.id===milestone.id?{...entry,done:checkbox.checked}:entry);
          if(this.onUpdate(project.id,{milestones:updated})===false){
            checkbox.checked=before;return;
          }
          requestAnimationFrame(()=>{
            const card=[...this.list.querySelectorAll('.project-card')].find(el=>el.dataset.projectId===project.id);
            const target=[...card?.querySelectorAll('.project-milestone')||[]]
              .find(el=>el.dataset.milestoneId===milestone.id)?.querySelector('input');
            target?.focus({preventScroll:true});
          });
        });
        const title=node('span','project-milestone-name',milestone.title);
        row.append(checkbox,title);
        if(milestone.dueDate)row.append(node('time','project-milestone-date',milestone.dueDate));
        checklist.append(row);
      }
      card.append(checklist);
    }

    const details=node('div','project-detail-row');
    const description=node('p','project-description',project.description||'No description yet.');
    const brief=node('dl','project-brief');
    for(const [label,value] of [
      ['Goal',project.goal],['Next action',project.nextAction],
      ['Blockers',project.blockers],['Target date',project.targetDate]
    ]){
      if(!value)continue;
      const pair=node('div','project-brief-line');
      pair.append(node('dt','project-brief-label',label),node('dd','project-brief-value',value));
      brief.append(pair);
    }
    const view=()=>details.replaceChildren(description,...(brief.children.length?[brief]:[]),...(this.readOnly?[]:[edit]));
    let edit;
    if(!this.readOnly){
      edit=node('button','project-edit','Edit project brief');
      edit.type='button';edit.setAttribute('aria-label','Edit project brief for '+project.label);
      edit.addEventListener('click',()=>{
        const form=node('form','project-description-form'),inputs={};
        for(const [key,label,maxLength,rows] of [
          ['description','Description',4000,3],['goal','Goal or outcome',500,2],
          ['nextAction','Next action',240,2],['blockers','Blockers or decisions',1000,2],
          ['targetDate','Target date',10,0]
        ]){
          const field=node('label','project-description-label',label);
          const input=node(rows?'textarea':'input','project-description-input');
          if(rows)input.rows=rows;else input.type='date';
          input.maxLength=maxLength;input.value=project[key]||'';
          input.setAttribute('aria-label',label+' for '+project.label);
          field.append(input);form.append(field);inputs[key]=input;
        }
        const controls=node('div','project-edit-actions');
        const save=node('button','project-save','Save project brief');save.type='submit';
        const cancel=node('button','project-cancel','Cancel');cancel.type='button';
        cancel.addEventListener('click',()=>{view();edit.focus({preventScroll:true});});
        form.addEventListener('submit',event=>{
          event.preventDefault();
          const patch=Object.fromEntries(Object.entries(inputs).map(([key,input])=>[key,input.value]));
          if(this.onUpdate(project.id,patch)===false){inputs.description.focus();return;}
          requestAnimationFrame(()=>{
            [...this.list.querySelectorAll('.project-card')].find(element=>element.dataset.projectId===project.id)
              ?.querySelector('.project-edit')?.focus({preventScroll:true});
          });
        });
        controls.append(save,cancel);form.append(controls);
        details.replaceChildren(form);inputs.description.focus({preventScroll:true});
      });
    }
    view();
    card.append(details);

    const bottom=node('div','project-card-bottom');
    const statusLabel=node('label','project-status-label','Status');
    const status=node('select','project-status');
    status.setAttribute('aria-label','Status for '+project.label);
    status.disabled=this.readOnly;
    for(const [value,label] of Object.entries(statusLabels)){
      const option=node('option','',label);option.value=value;status.append(option);
    }
    status.value=project.status;
    status.addEventListener('change',()=>{
      const updated=this.onUpdate(project.id,{status:status.value});
      if(updated===false)status.value=project.status;
      else requestAnimationFrame(()=>{
        [...this.list.querySelectorAll('.project-card')].find(element=>element.dataset.projectId===project.id)
          ?.querySelector('.project-status')?.focus({preventScroll:true});
      });
    });
    statusLabel.append(status);bottom.append(statusLabel);
    for(const link of project.links){
      const anchor=node('a','project-link',link.label);anchor.href=link.url;
      anchor.target='_blank';anchor.rel='noopener noreferrer';bottom.append(anchor);
    }
    card.append(bottom);
    if(!this.readOnly)card.append(this.buildPlanEditor(project));
    return card;
  }
  /** Edit private milestones and resource links without mutating live data until Save. */
  buildPlanEditor(project){
    const surface=node('div','project-plan-tools');
    const edit=node('button','project-plan-edit','Plan milestones & links');
    edit.type='button';edit.setAttribute('aria-label','Edit milestones and resource links for '+project.label);
    surface.append(edit);
    edit.addEventListener('click',()=>{
      const form=node('form','project-plan-form');
      const intro=node('p','project-plan-intro',
        'Private project plan. Milestones are tracked separately from completed tasks.');
      const heading=node('h4','','Milestones');
      const milestoneList=node('div','project-plan-list');
      const linksTitle=node('h4','','Resource links');
      const linkList=node('div','project-plan-list');
      const error=node('p','project-plan-error');error.setAttribute('role','alert');
      const controls=node('div','project-edit-actions');
      const addMilestone=node('button','project-plan-add','+ milestone');addMilestone.type='button';
      const addLink=node('button','project-plan-add','+ link');addLink.type='button';
      const save=node('button','project-save','Save project plan');save.type='submit';
      const cancel=node('button','project-cancel','Cancel');cancel.type='button';
      const field=(label,value,{type='text',maxLength,required=false}={})=>{
        const wrapper=node('label','project-plan-field',label);
        const input=node('input','project-plan-input');
        input.type=type;input.value=value||'';input.required=required;
        if(maxLength)input.maxLength=maxLength;
        input.setAttribute('aria-label',label+' for '+project.label);
        wrapper.append(input);return {wrapper,input};
      };
      const milestoneRow=milestone=>{
        const row=node('div','project-plan-row');row.dataset.milestoneId=milestone.id;
        const title=field('Milestone name',milestone.title,{maxLength:120,required:true});
        title.input.dataset.field='title';
        const due=field('Due date',milestone.dueDate,{type:'date'});
        due.input.dataset.field='dueDate';
        const done=field('Finished','',{type:'checkbox'});
        done.input.dataset.field='done';done.input.checked=!!milestone.done;
        const remove=node('button','project-plan-remove','Remove');remove.type='button';
        remove.setAttribute('aria-label','Remove milestone '+(milestone.title||'new draft'));
        remove.addEventListener('click',()=>{row.remove();error.textContent='';});
        row.append(title.wrapper,due.wrapper,done.wrapper,remove);
        return row;
      };
      const linkRow=link=>{
        const row=node('div','project-plan-row project-plan-link-row');
        const label=field('Link label',link.label,{maxLength:120,required:true});
        label.input.dataset.field='label';
        const url=field('Link URL',link.url,{type:'url',maxLength:1000,required:true});
        url.input.dataset.field='url';
        const remove=node('button','project-plan-remove','Remove');remove.type='button';
        remove.setAttribute('aria-label','Remove link '+(link.label||'new draft'));
        remove.addEventListener('click',()=>{row.remove();error.textContent='';});
        row.append(label.wrapper,url.wrapper,remove);
        return row;
      };
      for(const milestone of project.milestones)milestoneList.append(milestoneRow(milestone));
      for(const link of project.links)linkList.append(linkRow(link));
      addMilestone.addEventListener('click',()=>{
        if(milestoneList.children.length>=20){
          error.textContent='A project can have at most 20 milestones.';return;
        }
        const id='milestone_'+globalThis.crypto.randomUUID().replace(/-/g,'');
        const row=milestoneRow({id,title:'',dueDate:'',done:false});
        milestoneList.append(row);row.querySelector('[data-field=title]').focus();
      });
      addLink.addEventListener('click',()=>{
        if(linkList.children.length>=12){
          error.textContent='A project can have at most 12 resource links.';return;
        }
        const row=linkRow({label:'',url:''});
        linkList.append(row);row.querySelector('[data-field=label]').focus();
      });
      form.addEventListener('submit',event=>{
        event.preventDefault();error.textContent='';
        const milestones=[...milestoneList.children].map(row=>({
          id:row.dataset.milestoneId,
          title:row.querySelector('[data-field=title]').value.trim(),
          dueDate:row.querySelector('[data-field=dueDate]').value,
          done:row.querySelector('[data-field=done]').checked,
        }));
        const links=[...linkList.children].map(row=>({
          label:row.querySelector('[data-field=label]').value.trim(),
          url:row.querySelector('[data-field=url]').value.trim()
        }));
        if(this.onUpdate(project.id,{milestones,links})===false){
          error.textContent='Plan not saved. Check the date, title and link URL.';
          return;
        }
        requestAnimationFrame(()=>{
          [...this.list.querySelectorAll('.project-card')].find(el=>el.dataset.projectId===project.id)
            ?.querySelector('.project-plan-edit')?.focus({preventScroll:true});
        });
      });
      cancel.addEventListener('click',()=>{
        surface.replaceChildren(edit);edit.focus({preventScroll:true});
      });
      controls.append(save,cancel);
      form.append(intro,heading,milestoneList,addMilestone,linksTitle,linkList,addLink,error,controls);
      surface.replaceChildren(form);
      const first=form.querySelector('input');first?.focus({preventScroll:true});
    });
    return surface;
  }
  dispose(){this.element.remove();}
}
