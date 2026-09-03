const $ = selector => document.querySelector(selector);
const els = {
  message: $("#page-message"), content: $("#page-content"), notice: $("#notice"), instructor: $("#instructor-name"),
  agent: $("#evaluation-agent"), template: $("#evaluation-template"), date: $("#evaluation-date"), form: $("#evaluation-form"),
  agentField: $("#evaluation-agent-field"), dateField: $("#evaluation-date-field"), scoreStrip: $("#score-strip"),
  empty: $("#evaluation-empty"), sheet: $("#evaluation-sheet"), criteriaSheet: $("#criteria-sheet"), answered: $("#answered-count"),
  score: $("#calculated-score"), suggested: $("#suggested-result"), result: $("#evaluation-result"), comment: $("#evaluation-comment"),
  commentField: $("#general-comment-field"), finalDecision: $("#final-decision"),
  draft: $("#draft-state"), list: $("#template-list"), count: $("#template-count"), search: $("#template-search"), filter: $("#template-filter"),
  starter: $("#starter-box"), installStarters: $("#install-starters"), newTemplate: $("#new-template"), dialog: $("#template-dialog"),
  templateForm: $("#template-form"), templateId: $("#template-id"), templateName: $("#template-name"), category: $("#template-category"),
  description: $("#template-description"), criteriaEditor: $("#criteria-editor"), addCriterion: $("#add-criterion"),
  editorHelp: $("#editor-help"),
  editorKicker: $("#editor-kicker"), editorTitle: $("#editor-title"), closeEditor: $("#close-editor"), cancelEditor: $("#cancel-editor")
};

let templates = [];
let agents = [];
let resultWasManuallyChanged = false;
const DRAFT_KEY = "academy_evaluation_draft_v1";
const categoryLabels = { formation:"Formation générale", entretien:"Entretien", physique:"Aptitude physique", connaissances:"Connaissances", terrain:"Mise en situation", finale:"Évaluation finale" };
const resultLabels = { planifiee:"Planifiée / incomplète", valide:"Validée", a_revoir:"À revoir", non_valide:"Non validée" };

const starterTemplates = [
  { name:"Entretien d’entrée Police Academy", category:"entretien", description:"Entretien structuré sur la motivation, la disponibilité, le comportement et la compréhension du rôle.", criteria:[
    ["Motivation","Pourquoi souhaitez-vous rejoindre le Chicago Police Department ?","question",2,true,"Rechercher une motivation RP cohérente et personnelle."],
    ["Motivation","Que pensez-vous pouvoir apporter au département ?","question",1,false,""],
    ["Disponibilités","Quelles sont vos disponibilités habituelles pour les formations et patrouilles ?","question",1,false,""],
    ["Comportement","Comment réagissez-vous face à un ordre avec lequel vous n’êtes pas d’accord ?","question",2,true,"Évaluer la discipline, le dialogue et le respect de la hiérarchie."],
    ["Comportement","Comment gérez-vous un conflit avec un collègue ?","question",2,false,""],
    ["Connaissance du poste","Expliquez la différence entre le rôle du policier et celui du joueur hors personnage.","connaissance",2,true,"Vérifier la séparation RP / HRP."]
  ]},
  { name:"Évaluation physique initiale", category:"physique", description:"Grille d’aptitude physique et de maîtrise des déplacements opérationnels en jeu.", criteria:[
    ["Endurance","Maintient un effort continu sur le parcours demandé.","physique",2,false,"Adapter le parcours aux possibilités du serveur."],
    ["Agilité","Franchit les obstacles et change de direction avec maîtrise.","physique",1,false,""],
    ["Coordination","Exécute correctement les consignes de déplacement et de couverture.","pratique",2,true,""],
    ["Maîtrise","Conserve son calme et son contrôle après un effort.","observation",2,true,""],
    ["Sécurité","Ne met pas ses collègues ou les civils en danger pendant l’exercice.","pratique",3,true,""]
  ]},
  { name:"Connaissances réglementaires", category:"connaissances", description:"Questions sur les règles internes, la radio, les contrôles et l’usage proportionné de la force.", criteria:[
    ["Règlement","Dans quels cas une fouille est-elle justifiée ?","question",2,true,""],
    ["Contrôle","Décrivez les étapes d’un contrôle routier sécurisé.","question",2,true,""],
    ["Radio","Quelles informations doivent être annoncées avant une intervention ?","question",1,false,""],
    ["Interpellation","Expliquez les droits à rappeler lors d’une interpellation.","question",2,true,""],
    ["Force","Comment appliquez-vous le principe de proportionnalité dans l’usage de la force ?","question",3,true,""]
  ]},
  { name:"Mise en situation opérationnelle", category:"terrain", description:"Évaluation pratique d’une intervention complète, de l’arrivée sur zone au compte rendu final.", criteria:[
    ["Préparation","Analyse les informations disponibles et répartit correctement les rôles.","pratique",2,false,""],
    ["Communication","Utilise la radio de façon claire, courte et utile.","pratique",2,true,""],
    ["Sécurisation","Sécurise la zone, les collègues et les civils.","pratique",3,true,""],
    ["Décision","Prend des décisions cohérentes et proportionnées.","pratique",3,true,""],
    ["Procédure","Respecte la procédure d’interpellation et de transport.","pratique",3,true,""],
    ["Compte rendu","Produit un compte rendu précis et exploitable.","observation",1,false,""]
  ]}
];

function escapeHtml(value){return String(value??"").replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"})[c]);}
function showNotice(text,type="success"){els.notice.textContent=text;els.notice.className=`notice ${type}`;els.notice.hidden=false;scrollTo({top:0,behavior:"smooth"});setTimeout(()=>els.notice.hidden=true,5000);}
async function api(url,options={}){const response=await fetch(url,{credentials:"same-origin",cache:"no-store",...options,headers:{"Content-Type":"application/json",...(options.headers||{})}});const data=await response.json().catch(()=>({}));if(response.status===401){location.replace("/academy-auth/login.html?error=login_required");throw new Error("unauthorized");}if(!response.ok||!data.ok)throw new Error(data.code||"request_failed");return data;}

function criterionEditorRow(item={}){
  const row=document.createElement("div");row.className="criterion-editor-row";
  row.innerHTML=`<input class="criterion-section" maxlength="100" value="${escapeHtml(item.section||"Évaluation")}" aria-label="Section" placeholder="Section">
    <input class="criterion-label" maxlength="300" value="${escapeHtml(item.label||"")}" aria-label="Question ou critère" placeholder="Question ou critère *">
    <select class="criterion-type" aria-label="Type"><option value="question">Question</option><option value="observation">Observation</option><option value="physique">Physique</option><option value="pratique">Pratique</option><option value="connaissance">Connaissance</option></select>
    <select class="criterion-weight" aria-label="Poids"><option value="1">x1</option><option value="2">x2</option><option value="3">x3</option><option value="4">x4</option><option value="5">x5</option></select>
    <input class="criterion-guidance guidance" maxlength="2000" value="${escapeHtml(item.guidance||"")}" aria-label="Aide instructeur" placeholder="Aide ou réponse attendue (facultatif)">
    <label class="critical-toggle"><input class="criterion-critical" type="checkbox"><span>Critique</span></label>
    <button class="remove-criterion" type="button" aria-label="Supprimer le critère">×</button>`;
  row.querySelector(".criterion-type").value=item.type||"observation";row.querySelector(".criterion-weight").value=String(item.weight||1);row.querySelector(".criterion-critical").checked=item.critical===true;
  row.querySelector(".remove-criterion").addEventListener("click",()=>row.remove());return row;
}
function addCriterion(item){els.criteriaEditor.append(criterionEditorRow(item));}
function openEditor(template=null){
  els.templateForm.reset();els.criteriaEditor.innerHTML="";els.templateId.value=template?.id||"";els.templateName.value=template?.name||"";els.category.value=template?.category||"formation";els.description.value=template?.description||"";
  els.editorKicker.textContent=template?"Modification":"Nouvelle grille";els.editorTitle.textContent=template?"Modifier la formation":"Créer une formation";
  (template?.criteria?.length?template.criteria:[{}]).forEach(addCriterion);updateEditorMode();els.dialog.showModal();
}
function updateEditorMode(){const guide=els.category.value==="entretien";els.criteriaEditor.classList.toggle("guide-mode",guide);els.editorHelp.textContent=guide?"Ajoutez uniquement les questions à lire au candidat. Aucun résultat et aucune réponse ne seront demandés pendant l’entretien.":"Regroupez les critères par section. Un critère critique non acquis entraîne automatiquement une proposition « Non validée ».";}
function templatePayload(){return {id:els.templateId.value||undefined,name:els.templateName.value.trim(),category:els.category.value,description:els.description.value.trim(),criteria:[...els.criteriaEditor.querySelectorAll(".criterion-editor-row")].map(row=>({section:row.querySelector(".criterion-section").value.trim(),label:row.querySelector(".criterion-label").value.trim(),type:row.querySelector(".criterion-type").value,weight:Number(row.querySelector(".criterion-weight").value),critical:row.querySelector(".criterion-critical").checked,guidance:row.querySelector(".criterion-guidance").value.trim()})).filter(item=>item.label)};}

function renderLibrary(){
  const query=els.search.value.trim().toLocaleLowerCase("fr");const filter=els.filter.value;
  const visible=templates.filter(t=>(filter==="all"||(filter==="active"&&t.active)||(filter==="inactive"&&!t.active))&&`${t.name} ${t.category} ${t.description}`.toLocaleLowerCase("fr").includes(query));
  els.count.textContent=String(templates.filter(t=>t.active).length);els.starter.hidden=templates.length>0;
  els.list.innerHTML=visible.map(t=>`<article class="template-card${t.active?"":" inactive"}" data-id="${t.id}"><header><div><h3>${escapeHtml(t.name)}</h3><span class="category">${escapeHtml(categoryLabels[t.category]||t.category)}</span></div></header><p>${escapeHtml(t.description||"Aucune description")}</p><footer><span>${t.criteria.length} critère${t.criteria.length>1?"s":""} · ${t.active?"Active":"Désactivée"}</span><div class="card-actions"><button data-action="use" type="button" ${t.active?"":"disabled"}>Utiliser</button><button data-action="edit" type="button">Modifier</button><button data-action="duplicate" type="button">Dupliquer</button><button data-action="toggle" type="button">${t.active?"Désactiver":"Activer"}</button></div></footer></article>`).join("")||(!templates.length?"":'<div class="empty-state">Aucune grille ne correspond aux filtres.</div>');
  refreshTemplateSelect();
}
function refreshTemplateSelect(){const selected=els.template.value;const active=templates.filter(t=>t.active);els.template.innerHTML='<option value="">Sélectionner une grille</option>'+active.map(t=>`<option value="${t.id}">${escapeHtml(t.name)}</option>`).join("");if(active.some(t=>t.id===selected))els.template.value=selected;}
function refreshAgentSelect(){els.agent.innerHTML='<option value="">Sélectionner un agent</option>'+agents.map(a=>`<option value="${a.discordId}">${escapeHtml(a.rpName||a.displayName)} — ${escapeHtml(a.rank)}</option>`).join("");}

function currentTemplate(){return templates.find(t=>t.id===els.template.value);}
function renderEvaluation(){
  const template=currentTemplate();els.empty.hidden=Boolean(template);els.sheet.hidden=!template;if(!template)return;
  const sections=new Map();template.criteria.forEach(c=>{if(!sections.has(c.section))sections.set(c.section,[]);sections.get(c.section).push(c);});
  const guideOnly=template.category==="entretien";
  els.agentField.hidden=guideOnly;els.dateField.hidden=guideOnly;els.agent.required=!guideOnly;els.date.required=!guideOnly;
  els.scoreStrip.hidden=guideOnly;els.commentField.hidden=guideOnly;els.finalDecision.hidden=guideOnly;
  if(guideOnly){
    els.criteriaSheet.innerHTML=`<article class="question-guide"><header><p>Guide d’entretien</p><h3>${escapeHtml(template.name)}</h3></header>${[...sections].map(([section,criteria])=>`<section class="guide-section"><h4>${escapeHtml(section)}</h4><ol class="guide-questions">${criteria.map(c=>`<li><div><strong>${escapeHtml(c.label)}</strong>${c.guidance?`<small>Repère formateur : ${escapeHtml(c.guidance)}</small>`:""}</div></li>`).join("")}</ol></section>`).join("")}</article>`;
    els.draft.textContent="Guide de lecture · aucune réponse enregistrée";
    return;
  }
  els.criteriaSheet.innerHTML=[...sections].map(([section,criteria])=>`<section class="criteria-section"><h3>${escapeHtml(section)}</h3>${criteria.map(c=>`<div class="evaluation-criterion" data-id="${c.id}" data-weight="${c.weight}" data-critical="${c.critical}"><div class="criterion-question"><strong>${escapeHtml(c.label)}</strong>${c.critical?'<span class="critical-badge">Critique</span>':""}</div>${c.guidance?`<p class="criterion-guidance">Repère instructeur : ${escapeHtml(c.guidance)}</p>`:""}<div class="rating-row">${[["acquis","Acquis"],["partiel","Partiel"],["non_acquis","Non acquis"],["non_evalue","Non évalué"]].map(([value,label])=>`<label><input type="radio" name="rating-${c.id}" value="${value}" ${value==="non_evalue"?"checked":""}><span>${label}</span></label>`).join("")}</div><input class="criterion-note" maxlength="1000" placeholder="Note sur ce critère (facultatif)"></div>`).join("")}</section>`).join("");
  resultWasManuallyChanged=false;updateScore();restoreDraft();
}
function evaluationRows(){return [...els.criteriaSheet.querySelectorAll(".evaluation-criterion")].map(row=>{const criterion=currentTemplate().criteria.find(c=>c.id===row.dataset.id);return {...criterion,rating:row.querySelector('input[type="radio"]:checked')?.value||"non_evalue",note:row.querySelector(".criterion-note").value.trim()};});}
function calculate(rows){const rated=rows.filter(r=>r.rating!=="non_evalue");const possible=rated.reduce((sum,r)=>sum+r.weight*2,0);const points=rated.reduce((sum,r)=>sum+r.weight*(r.rating==="acquis"?2:r.rating==="partiel"?1:0),0);const score=possible?Math.round(points/possible*100):null;const criticalFailure=rows.some(r=>r.critical&&r.rating==="non_acquis");const suggested=score===null?"planifiee":criticalFailure?"non_valide":score>=75?"valide":score>=50?"a_revoir":"non_valide";return {rated: rated.length,total:rows.length,score,suggested};}
function updateScore(){if(!currentTemplate())return;const calc=calculate(evaluationRows());els.answered.textContent=`${calc.rated} / ${calc.total}`;els.score.textContent=calc.score===null?"—":`${calc.score} / 100`;els.suggested.textContent=resultLabels[calc.suggested];if(!resultWasManuallyChanged)els.result.value=calc.suggested;saveDraft();}
function saveDraft(){if(!currentTemplate())return;const draft={agent:els.agent.value,template:els.template.value,date:els.date.value,comment:els.comment.value,result:els.result.value,rows:evaluationRows().map(r=>({id:r.id,rating:r.rating,note:r.note}))};localStorage.setItem(DRAFT_KEY,JSON.stringify(draft));els.draft.textContent="Brouillon enregistré";}
function restoreDraft(){try{const draft=JSON.parse(localStorage.getItem(DRAFT_KEY)||"null");if(!draft||draft.template!==els.template.value)return;els.agent.value=draft.agent||els.agent.value;els.date.value=draft.date||els.date.value;els.comment.value=draft.comment||"";(draft.rows||[]).forEach(saved=>{const row=els.criteriaSheet.querySelector(`[data-id="${CSS.escape(saved.id)}"]`);if(!row)return;const radio=row.querySelector(`input[value="${saved.rating}"]`);if(radio)radio.checked=true;row.querySelector(".criterion-note").value=saved.note||"";});if(draft.result){els.result.value=draft.result;resultWasManuallyChanged=true;}const calc=calculate(evaluationRows());els.answered.textContent=`${calc.rated} / ${calc.total}`;els.score.textContent=calc.score===null?"—":`${calc.score} / 100`;els.suggested.textContent=resultLabels[calc.suggested];}catch{localStorage.removeItem(DRAFT_KEY);}}

async function load(){
  try{const [templateData,agentData]=await Promise.all([api("/api/academy-admin-data/training-templates"),api("/api/academy-admin-data/agents")]);templates=templateData.templates;agents=agentData.agents;els.instructor.textContent=agentData.instructor?.globalName||agentData.instructor?.username||"Instructeur";refreshAgentSelect();renderLibrary();els.message.hidden=true;els.content.hidden=false;}catch(error){if(error.message!=="unauthorized")els.message.textContent=error.message==="templates_table_missing"?"Les tables des grilles ne sont pas encore installées dans Neon.":"Impossible de charger le centre d’évaluation.";}
}

els.newTemplate.addEventListener("click",()=>openEditor());els.addCriterion.addEventListener("click",()=>addCriterion());els.closeEditor.addEventListener("click",()=>els.dialog.close());els.cancelEditor.addEventListener("click",()=>els.dialog.close());
els.category.addEventListener("change",updateEditorMode);
els.templateForm.addEventListener("submit",async event=>{event.preventDefault();const payload=templatePayload();if(!payload.criteria.length&&!confirm("Cette formation ne contient aucun critère. Voulez-vous quand même l’enregistrer ?"))return;try{await api("/api/academy-admin-data/training-template/save",{method:"POST",body:JSON.stringify(payload)});els.dialog.close();showNotice(payload.id?"La grille a été mise à jour.":"La nouvelle formation est disponible dans les dossiers agents.");await load();}catch(error){showNotice("Impossible d’enregistrer cette grille. Vérifiez les champs.","error");}});
els.list.addEventListener("click",async event=>{const button=event.target.closest("button[data-action]");if(!button)return;const template=templates.find(t=>t.id===button.closest("[data-id]").dataset.id);if(!template)return;const action=button.dataset.action;if(action==="use"){els.template.value=template.id;renderEvaluation();scrollTo({top:0,behavior:"smooth"});}if(action==="edit")openEditor(template);if(action==="duplicate")openEditor({...template,id:"",name:`Copie de ${template.name}`});if(action==="toggle"){try{await api("/api/academy-admin-data/training-template/toggle",{method:"POST",body:JSON.stringify({id:template.id,active:!template.active})});await load();showNotice(template.active?"La grille a été désactivée.":"La grille a été réactivée.");}catch{showNotice("Impossible de modifier l’état de la grille.","error");}}});
els.search.addEventListener("input",renderLibrary);els.filter.addEventListener("change",renderLibrary);els.template.addEventListener("change",renderEvaluation);els.criteriaSheet.addEventListener("change",updateScore);els.criteriaSheet.addEventListener("input",saveDraft);els.agent.addEventListener("change",saveDraft);els.date.addEventListener("change",saveDraft);els.comment.addEventListener("input",saveDraft);els.result.addEventListener("change",()=>{resultWasManuallyChanged=true;saveDraft();});
els.installStarters.addEventListener("click",async()=>{els.installStarters.disabled=true;els.installStarters.textContent="Installation…";try{for(const template of starterTemplates){await api("/api/academy-admin-data/training-template/save",{method:"POST",body:JSON.stringify({name:template.name,category:template.category,description:template.description,criteria:template.criteria.map(([section,label,type,weight,critical,guidance])=>({section,label,type,weight,critical,guidance}))})});}await load();showNotice("Les quatre grilles conseillées sont installées et entièrement modifiables.");}catch{showNotice("L’installation des modèles n’a pas pu être terminée.","error");}finally{els.installStarters.disabled=false;els.installStarters.textContent="Installer les grilles conseillées";}});
els.form.addEventListener("submit",async event=>{event.preventDefault();const template=currentTemplate();if(!template||!els.agent.value)return;const rows=evaluationRows();const calc=calculate(rows);const strengths=rows.filter(r=>r.rating==="acquis").map(r=>r.label).join(" · ").slice(0,3000);const improvements=rows.filter(r=>r.rating==="partiel"||r.rating==="non_acquis").map(r=>`${r.label}${r.note?` (${r.note})`:""}`).join(" · ").slice(0,3000);const evaluationData={templateId:template.id,templateName:template.name,score:calc.score,suggestedResult:calc.suggested,criteria:rows.map(r=>({criterionId:r.id,section:r.section,label:r.label,rating:r.rating,weight:r.weight,critical:r.critical,note:r.note}))};try{await api("/api/academy-admin-data/training/create",{method:"POST",body:JSON.stringify({discordId:els.agent.value,trainingType:template.name,trainingDate:els.date.value,result:els.result.value,score:calc.score,comment:els.comment.value.trim(),strengths,improvements,evaluationData})});localStorage.removeItem(DRAFT_KEY);showNotice("L’évaluation a été enregistrée dans le dossier de l’agent.");els.form.reset();els.date.valueAsDate=new Date();els.template.value="";els.criteriaSheet.innerHTML="";els.sheet.hidden=true;els.empty.hidden=false;resultWasManuallyChanged=false;}catch(error){const message=error.message==="evaluation_template_unavailable"?"Cette grille a été modifiée ou désactivée. Rechargez la page.":"Impossible d’enregistrer l’évaluation.";showNotice(message,"error");}});

els.date.valueAsDate=new Date();load();
