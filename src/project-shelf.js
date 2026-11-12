import {summarizeProjectPortfolio,filterProjectPortfolio} from './projects.js';

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
    this.branches=[];this.tasks=[];this.projectMetadata={};this.portfolioRows=[];
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

    // Finder state is intentionally ephemeral, never part of a workspace
    // snapshot, URL, sync request or analytics payload.
    this.filters=node('div','projects-filters');
    const searchLabel=node('label','projects-filter-search','Find projects');
    this.search=node('input','projects-search');
    this.search.type='search';this.search.maxLength=120;this.search.autocomplete='off';
    this.search.placeholder='Project, goal, resource…';
    this.search.setAttribute('aria-label','Search private projects');
    searchLabel.append(this.search);
    const statusFilterLabel=node('label','projects-filter-label','Show');
    this.statusFilter=node('select','projects-filter-select');
    this.statusFilter.setAttribute('aria-label','Filter projects by status');
    for(const [value,label] of [
      ['all','All statuses'],['active','Active'],['paused','Paused'],['completed','Completed']
    ]){
      const option=node('option','',label);option.value=value;this.statusFilter.append(option);
    }
    statusFilterLabel.append(this.statusFilter);
    this.filterCount=node('span','projects-filter-count');
    this.filterCount.setAttribute('aria-live','polite');
    this.filters.append(searchLabel,statusFilterLabel,this.filterCount);
    this.element.append(this.filters);
    this.search.addEventListener('input',()=>this.applyFilters());
    this.statusFilter.addEventListener('change',()=>this.applyFilters());

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
        // The newly created project should never be hidden by the previous
        // filter, especially when its initial status differs from the filter.
        this.search.value='';this.statusFilter.value='all';this.applyFilters();
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
    this.portfolioRows=summary.projects;this.filters.hidden=!count;
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
      this.list.append(empty);this.filterCount.textContent='';return;
    }
    for(const project of summary.projects)this.list.append(this.buildCard(project));
    this.applyFilters();
  }

  /** Hide cards without rebuilding them: filtering never destroys unsaved
   * editor drafts, resets focus or changes canonical project metadata.
   */
  applyFilters(){
    if(!this.list||!this.portfolioRows.length)return;
    const shown=new Set(filterProjectPortfolio(this.portfolioRows,{
      query:this.search.value,status:this.statusFilter.value
    }).map(project=>project.id));
    for(const card of this.list.querySelectorAll('.project-card')){
      card.hidden=!shown.has(card.dataset.projectId);
    }
    this.list.querySelector('.projects-no-matches')?.remove();
    if(!shown.size){
      const empty=node('p','projects-no-matches',
        'No matching projects. Try another search or status.');
      this.list.append(empty);
    }
    this.filterCount.textContent='Showing '+shown.size+' of '+this.portfolioRows.length+' private projects';
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
    card.append(this.buildMilestones(project));

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
        const card=[...this.list.querySelectorAll('.project-card')]
          .find(element=>element.dataset.projectId===project.id);
        if(card?.hidden)this.statusFilter.focus({preventScroll:true});
        else card?.querySelector('.project-status')?.focus({preventScroll:true});
      });
    });
    statusLabel.append(status);bottom.append(statusLabel);

    // Health is a deliberate, qualitative owner assessment. It is never
    // inferred from task progress, deadline, blockers or cloud sync state.
    const healthLabel=node('label','project-status-label','Health');
    const health=node('select','project-health');
    health.setAttribute('aria-label','Health for '+project.label);
    health.disabled=this.readOnly;
    for(const [value,label] of [
      ['','Not assessed'],['on-track','On track'],
      ['needs-attention','Needs attention'],['blocked','Blocked']
    ]){
      const option=node('option','',label);option.value=value;health.append(option);
    }
    health.value=project.health||'';
    health.addEventListener('change',()=>{
      const updated=this.onUpdate(project.id,{health:health.value});
      if(updated===false)health.value=project.health||'';
      else requestAnimationFrame(()=>{
        [...this.list.querySelectorAll('.project-card')]
          .find(element=>element.dataset.projectId===project.id)
          ?.querySelector('.project-health')?.focus({preventScroll:true});
      });
    });
    healthLabel.append(health);bottom.append(healthLabel);
    for(const link of project.links){
      const anchor=node('a','project-link',link.label);anchor.href=link.url;
      anchor.target='_blank';anchor.rel='noopener noreferrer';bottom.append(anchor);
    }
    card.append(bottom);

    // PJ-03: links live in existing owner-private project metadata. The editor
    // submits the entire bounded list atomically, never writes to an external
    // provider, and leaves the prior persisted list intact on validation error.
    if(!this.readOnly){
      const resources=node('section','project-resources');
      resources.setAttribute('aria-label','Resource links for '+project.label);
      const editLinks=node('button','project-edit-links','Edit resource links');
      editLinks.type='button';
      editLinks.setAttribute('aria-label','Edit resource links for '+project.label);
      const summary=node('p','project-resources-summary',
        project.links.length?plural(project.links.length,'saved resource'):'No resource links yet.');
      const showSummary=()=>resources.replaceChildren(summary,editLinks);
      editLinks.addEventListener('click',()=>{
        const form=node('form','project-links-form');
        form.setAttribute('aria-label','Edit resource links for '+project.label);
        const rows=node('div','project-links-rows');
        const error=node('p','project-links-error');
        error.setAttribute('role','alert');
        const add=node('button','project-add-link','Add resource link');add.type='button';
        const save=node('button','project-save-links','Save resource links');save.type='submit';
        const cancel=node('button','project-cancel-links','Cancel');cancel.type='button';
        const updateLimit=()=>{
          add.disabled=rows.children.length>=12;
          add.setAttribute('aria-disabled',String(add.disabled));
        };
        const appendRow=(link={label:'',url:''})=>{
          if(rows.children.length>=12)return;
          const row=node('div','project-link-editor-row');
          const labelField=node('label','project-description-label','Label');
          const labelInput=node('input','project-description-input');
          labelInput.type='text';labelInput.required=true;labelInput.maxLength=120;
          labelInput.value=link.label;
          const urlField=node('label','project-description-label','URL (http or https)');
          const urlInput=node('input','project-description-input');
          urlInput.type='text';urlInput.required=true;urlInput.maxLength=1000;
          urlInput.value=link.url;urlInput.autocomplete='off';
          const remove=node('button','project-remove-link','Remove');
          remove.type='button';
          const renumber=()=>{
            [...rows.children].forEach((item,index)=>{
              const number=index+1;
              item.querySelector('label:first-child input')
                .setAttribute('aria-label','Resource label '+number+' for '+project.label);
              item.querySelector('label:nth-child(2) input')
                .setAttribute('aria-label','Resource URL '+number+' for '+project.label);
              item.querySelector('.project-remove-link')
                .setAttribute('aria-label','Remove resource '+number);
            });
          };
          labelField.append(labelInput);urlField.append(urlInput);
          remove.addEventListener('click',()=>{row.remove();renumber();updateLimit();});
          row.append(labelField,urlField,remove);rows.append(row);
          renumber();updateLimit();
          return labelInput;
        };
        for(const link of project.links)appendRow(link);
        add.addEventListener('click',()=>appendRow()?.focus({preventScroll:true}));
        cancel.addEventListener('click',()=>{showSummary();editLinks.focus({preventScroll:true});});
        form.addEventListener('submit',event=>{
          event.preventDefault();
          const links=[...rows.children].map(row=>({
            label:row.querySelector('label:first-child input').value,
            url:row.querySelector('label:nth-child(2) input').value.trim()
          }));
          if(this.onUpdate(project.id,{links})===false){
            error.textContent='Could not save. Use an http(s) URL without embedded credentials.';
            return;
          }
          requestAnimationFrame(()=>{
            [...this.list.querySelectorAll('.project-card')]
              .find(element=>element.dataset.projectId===project.id)
              ?.querySelector('.project-edit-links')?.focus({preventScroll:true});
          });
        });
        const controls=node('div','project-edit-actions');
        controls.append(save,cancel);form.append(rows,add,error,controls);
        resources.replaceChildren(form);
        (rows.querySelector('input')||add).focus({preventScroll:true});
        updateLimit();
      });
      showSummary();card.append(resources);
    }
    return card;
  }
  /** PJ-03: milestone outcomes are distinct from task-based progress and
   * the app's global calendar milestones. No automatic task writes.
   */
  buildMilestones(project){
    const milestones=project.milestones||[];
    const section=node('section','project-milestones');
    section.setAttribute('aria-label','Project milestones for '+project.label);
    const header=node('div','project-milestones-heading');
    const title=node('h4','project-milestones-title','Milestones');
    const done=milestones.filter(item=>item.done).length;
    const count=node('span','project-milestones-count',
      milestones.length?done+' of '+milestones.length+' done':'None yet');
    header.append(title,count);

    const showView=()=>{
      const trigger=header.querySelector('.project-edit-milestones');
      if(trigger)trigger.hidden=false;
      const list=node('ul','project-milestone-list');
      if(!milestones.length){
        list.append(node('li','project-milestone-empty','Mark a meaningful step towards your goal.'));
      }
      for(const milestone of milestones){
        const row=node('li','project-milestone-item');
        row.dataset.milestoneId=milestone.id;
        const main=node('div','project-milestone-main');
        main.append(node('span','project-milestone-name',milestone.title));
        if(milestone.targetDate){
          const date=node('time','project-milestone-date','Target '+milestone.targetDate);
          date.dateTime=milestone.targetDate;main.append(date);
        }
        const status=node('span','project-milestone-status',milestone.done?'Done':'Planned');
        status.dataset.done=String(milestone.done);
        row.append(main,status);list.append(row);
      }
      section.replaceChildren(header,list);
    };

    if(!this.readOnly){
      const edit=node('button','project-edit-milestones','Edit milestones');
      edit.type='button';
      edit.setAttribute('aria-label','Edit milestones for '+project.label);
      edit.addEventListener('click',()=>{
        edit.hidden=true;
        const form=node('form','project-milestone-form');
        form.setAttribute('aria-label','Edit milestones for '+project.label);
        const rows=node('div','project-milestone-editor-rows');
        const error=node('p','project-milestone-error');
        error.setAttribute('role','alert');
        const add=node('button','project-add-milestone','Add milestone');add.type='button';
        const save=node('button','project-save-milestones','Save milestones');save.type='submit';
        const cancel=node('button','project-cancel-milestones','Cancel milestone edits');cancel.type='button';
        const used=new Set(milestones.map(item=>item.id));let sequence=1;
        const newId=()=>{
          while(used.has('ms_'+sequence))sequence++;
          const id='ms_'+sequence++;used.add(id);return id;
        };
        const updateLimit=()=>{add.disabled=rows.children.length>=12;};
        const renumber=()=>{
          [...rows.children].forEach((row,index)=>{
            const num=index+1;
            row.querySelector('[data-field="title"]').setAttribute(
              'aria-label','Milestone '+num+' title for '+project.label);
            row.querySelector('[data-field="targetDate"]').setAttribute(
              'aria-label','Milestone '+num+' target date for '+project.label);
            row.querySelector('[data-field="done"]').setAttribute(
              'aria-label','Milestone '+num+' completed for '+project.label);
            row.querySelector('.project-remove-milestone')
              .setAttribute('aria-label','Remove milestone '+num);
          });
        };
        const appendRow=(value={id:newId(),title:'',targetDate:'',done:false})=>{
          if(rows.children.length>=12)return null;
          const row=node('div','project-milestone-edit-row');
          row.dataset.milestoneId=value.id;
          const titleInput=node('input','project-description-input');
          titleInput.type='text';titleInput.required=true;titleInput.maxLength=140;
          titleInput.dataset.field='title';titleInput.value=value.title;
          const titleLabel=node('label','project-description-label','Milestone title');
          titleLabel.append(titleInput);
          const dateInput=node('input','project-description-input');
          dateInput.type='date';dateInput.dataset.field='targetDate';
          dateInput.value=value.targetDate;
          const dateLabel=node('label','project-description-label','Target date');
          dateLabel.append(dateInput);
          const completed=node('input','');
          completed.type='checkbox';completed.dataset.field='done';completed.checked=value.done;
          const completedLabel=node('label','project-milestone-check','Done');
          completedLabel.prepend(completed);
          const remove=node('button','project-remove-milestone','Remove');
          remove.type='button';
          remove.addEventListener('click',()=>{
            const next=row.nextElementSibling?.querySelector('input')||
              row.previousElementSibling?.querySelector('input')||add;
            row.remove();renumber();updateLimit();next.focus({preventScroll:true});
          });
          row.append(titleLabel,dateLabel,completedLabel,remove);
          rows.append(row);renumber();updateLimit();
          return titleInput;
        };
        for(const milestone of milestones)appendRow(milestone);
        add.addEventListener('click',()=>appendRow()?.focus({preventScroll:true}));
        cancel.addEventListener('click',()=>{
          showView();edit.focus({preventScroll:true});
        });
        form.addEventListener('submit',event=>{
          event.preventDefault();
          const next=[...rows.children].map(row=>({
            id:row.dataset.milestoneId,
            title:row.querySelector('[data-field="title"]').value,
            targetDate:row.querySelector('[data-field="targetDate"]').value,
            done:row.querySelector('[data-field="done"]').checked
          }));
          if(this.onUpdate(project.id,{milestones:next})===false){
            error.textContent='Could not save milestones. Check titles, dates and the 12-step limit.';
            return;
          }
          requestAnimationFrame(()=>{
            [...this.list.querySelectorAll('.project-card')]
              .find(element=>element.dataset.projectId===project.id)
              ?.querySelector('.project-edit-milestones')?.focus({preventScroll:true});
          });
        });
        const controls=node('div','project-edit-actions');controls.append(save,cancel);
        form.append(rows,add,error,controls);section.replaceChildren(header,form);
        (rows.querySelector('input')||add).focus({preventScroll:true});
        updateLimit();
      });
      header.append(edit);
    }
    showView();return section;
  }

  dispose(){this.element.remove();}
}
