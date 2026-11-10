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
    this.element.style.width=innerWidth<650?'430px':'530px';this.element.style.height='615px';

    const header=node('header','widget-heading projects-heading');
    const grip=node('button','widget-grip','⠿');grip.type='button';
    grip.title='Drag Projects. Arrow keys on this button move the window.';
    grip.setAttribute('aria-label','Move Projects widget');
    const titleGroup=node('div','projects-title-group');
    titleGroup.append(node('span','eyebrow','PRIVATE PROJECTS'));
    const title=node('h2','');title.id='projects-title';
    title.append(node('span','','Projects'),node('span','heading-period','.'));
    titleGroup.append(title,node('p','widget-subtitle','Big ideas, with somewhere to land.'));
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

    const details=node('div','project-detail-row');
    const description=node('p','project-description',project.description||'No description yet.');
    details.append(description);
    if(!this.readOnly){
      const edit=node('button','project-edit','Edit description');
      edit.type='button';edit.setAttribute('aria-label','Edit description for '+project.label);
      edit.addEventListener('click',()=>{
        details.replaceChildren();
        const form=node('form','project-description-form');
        const field=node('label','project-description-label','Description');
        const input=node('textarea','project-description-input');
        input.setAttribute('aria-label','Description for '+project.label);
        input.maxLength=4000;input.rows=3;input.value=project.description;
        field.append(input);form.append(field);
        const controls=node('div','project-edit-actions');
        const save=node('button','project-save','Save description');save.type='submit';
        const cancel=node('button','project-cancel','Cancel');cancel.type='button';
        cancel.addEventListener('click',()=>{details.replaceChildren(description,edit);edit.focus({preventScroll:true});});
        form.addEventListener('submit',event=>{
          event.preventDefault();
          if(this.onUpdate(project.id,{description:input.value})===false){input.focus();return;}
          requestAnimationFrame(()=>{
            [...this.list.querySelectorAll('.project-card')].find(element=>element.dataset.projectId===project.id)
              ?.querySelector('.project-edit')?.focus({preventScroll:true});
          });
        });
        controls.append(save,cancel);form.append(controls);
        details.append(form);input.focus({preventScroll:true});
      });
      details.append(edit);
    }
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
    card.append(bottom);return card;
  }
  dispose(){this.element.remove();}
}
