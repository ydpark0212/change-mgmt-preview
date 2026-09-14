(function(){
  let viewMode='step';
  let selectedStep=null;
  function reachable(step){
    const node=document.querySelector(`[data-workflow-step="${step}"]`);
    return node&&node.dataset.stepState!=='future';
  }
  function groupsFor(panel){return (panel.dataset.stepGroup||'').split(',').map(v=>v.trim()).filter(Boolean)}
  function buildStepCards(){
    const container=document.querySelector('.cr-step-content');
    if(!container||container.querySelector('.cr-step-group-card'))return;
    const items=Array.from(container.children).filter(node=>node.dataset&&node.dataset.stepGroup);
    const order=['REVIEW1','REVIEW2','GRADED','COMMITTEE','PLAN_APPROVE','SIM_PROGRESS','SIM_TEST','COMMISSIONING','COMPLETED'];
    const cards=new Map();
    order.forEach(step=>{
      const card=document.createElement('section');
      card.className='cr-step-group-card';
      card.dataset.cardStep=step;
      cards.set(step,card);
      container.appendChild(card);
    });
    items.forEach(item=>{
      const card=cards.get(groupsFor(item)[0]);
      if(card)card.appendChild(item);
    });
  }
  function hasStepContent(step){
    const container=document.querySelector('.cr-step-content');
    if(!container)return false;
    return Array.from(container.querySelectorAll('[data-step-group]')).some(panel=>
      !panel.classList.contains('cr-stage-heading')&&groupsFor(panel).includes(step)
    );
  }
  function applyPanels(){
    const container=document.querySelector('.cr-step-content');
    if(container)container.classList.toggle('is-all-view',viewMode==='all');
    document.querySelectorAll('[data-step-group]').forEach(panel=>{
      const groups=groupsFor(panel);
      let show=viewMode==='all'?groups.some(reachable):groups.includes(selectedStep);
      if(viewMode==='all'&&panel.classList.contains('cr-stage-heading')&&!hasStepContent(groups[0]))show=false;
      panel.classList.toggle('cr-step-panel-hidden',!show);
    });
    document.querySelectorAll('.cr-step-group-card').forEach(card=>{
      const hasVisibleContent=Array.from(card.children).some(panel=>
        !panel.classList.contains('cr-stage-heading')&&!panel.classList.contains('cr-step-panel-hidden')
      );
      card.classList.toggle('cr-step-group-card-hidden',viewMode==='all'&&!hasVisibleContent);
    });
  }
  function revealWorkflowStep(step,behavior){
    const tracker=document.getElementById('cr-workflow-tracker');
    const node=tracker&&tracker.querySelector(`[data-workflow-step="${step}"]`);
    if(!tracker||!node)return;
    const left=node.offsetLeft-(tracker.clientWidth-node.offsetWidth)/2;
    tracker.scrollTo({left:Math.max(0,left),behavior:behavior||'smooth'});
  }
  window.selectWorkflowStep=function(step){
    if(!reachable(step))return;
    selectedStep=step;
    if(viewMode!=='step')window.setCrViewMode('step');else applyPanels();
    document.querySelectorAll('[data-workflow-step]').forEach(node=>node.classList.toggle('is-selected',node.dataset.workflowStep===step));
    revealWorkflowStep(step,'smooth');
  };
  window.setCrViewMode=function(mode){
    viewMode=mode==='all'?'all':'step';
    document.querySelectorAll('[data-cr-view]').forEach(button=>button.classList.toggle('is-active',button.dataset.crView===viewMode));
    if(viewMode==='step'&&!selectedStep){
      const current=document.querySelector('[data-step-state="current"]');
      selectedStep=current?current.dataset.workflowStep:'DRAFT';
    }
    applyPanels();
    if(viewMode==='step')revealWorkflowStep(selectedStep,'auto');
  };
  window.toggleWorkflowDensity=function(){
    const tracker=document.getElementById('cr-workflow-tracker');
    const button=document.querySelector('.cr-density-toggle');
    const expanded=tracker.classList.toggle('is-expanded');
    button.setAttribute('aria-pressed',String(expanded));
  };
  window.toggleWorkflowHistory=function(){
    const tracker=document.getElementById('cr-workflow-tracker');
    const button=document.querySelector('[data-history-toggle]');
    if(!tracker||!button)return;
    const collapsed=tracker.classList.toggle('is-history-collapsed');
    button.setAttribute('aria-pressed',String(!collapsed));
  };
  window.saveReviewDraft=function(form,key){
    if(!form)return;
    const values={};
    new FormData(form).forEach((value,name)=>{if(typeof value==='string')values[name]=value});
    sessionStorage.setItem(`cr-review-draft:${key}`,JSON.stringify(values));
    if(typeof window.showToast==='function')window.showToast('임시저장했습니다.');
  };
  function restoreReviewDraft(form){
    const key=form.dataset.reviewDraft;
    if(!key)return;
    let values={};
    try{values=JSON.parse(sessionStorage.getItem(`cr-review-draft:${key}`)||'{}')}catch(_error){return}
    Object.entries(values).forEach(([name,value])=>{
      form.querySelectorAll(`[name="${CSS.escape(name)}"]`).forEach(field=>{
        if(field.type==='radio'||field.type==='checkbox')field.checked=field.value===value;
        else field.value=value;
        if(field.checked&&field.name.startsWith('grade_review'))field.dispatchEvent(new Event('change',{bubbles:true}));
      });
    });
  }
  document.addEventListener('DOMContentLoaded',()=>{
    buildStepCards();
    document.querySelectorAll('form[data-review-draft]').forEach(restoreReviewDraft);
    window.setCrViewMode('step');
  });
})();
