const params = new URLSearchParams(location.search);
const discordId = params.get("id") || "";

const elements = {
  pageMessage: document.querySelector("#page-message"),
  content: document.querySelector("#dossier-content"),
  notice: document.querySelector("#notice"),
  avatar: document.querySelector("#agent-avatar"),
  name: document.querySelector("#agent-name"),
  rank: document.querySelector("#agent-rank"),
  discord: document.querySelector("#agent-discord"),
  count: document.querySelector("#training-count"),
  updated: document.querySelector("#file-updated"),
  agentForm: document.querySelector("#agent-form"),
  rpName: document.querySelector("#rp-name"),
  matricule: document.querySelector("#matricule"),
  status: document.querySelector("#academy-status"),
  generalNote: document.querySelector("#general-note"),
  saveAgent: document.querySelector("#save-agent"),
  trainingForm: document.querySelector("#training-form"),
  trainingDate: document.querySelector("#training-date"),
  trainingType: document.querySelector("#training-type"),
  customTrainingField: document.querySelector("#custom-training-field"),
  customTraining: document.querySelector("#training-custom"),
  optionalFields: document.querySelector(".optional-fields"),
  saveTraining: document.querySelector("#save-training"),
  cancelTrainingEdit: document.querySelector("#cancel-training-edit"),
  trainingFormKicker: document.querySelector("#training-form-kicker"),
  trainingFormTitle: document.querySelector("#training-form-title"),
  history: document.querySelector("#training-history"),
  historyEmpty: document.querySelector("#history-empty"),
  archiveHistory: document.querySelector("#archive-history"),
  archiveEmpty: document.querySelector("#archive-empty"),
  archiveCount: document.querySelector("#archive-count"),
  pathPercentage: document.querySelector("#path-percentage"),
  pathSummary: document.querySelector("#path-summary"),
  pathProgress: document.querySelector("#path-progress"),
  pathModules: document.querySelector("#path-modules")
};

let editingTrainingId = null;
let trainingRecords = new Map();

const resultLabels = {
  planifiee: "Planifiée",
  valide: "Validée",
  validee: "Validée",
  a_revoir: "À revoir",
  non_valide: "Non validée"
};

const standardModules = [
  "Intégration et règlement",
  "Communications radio",
  "Contrôle routier",
  "Procédure d’interpellation",
  "Usage de la force",
  "Conduite opérationnelle",
  "Rédaction de rapports",
  "Évaluation finale"
];

function canonicalResult(result) {
  return result === "validee" ? "valide" : result;
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>'"]/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
  })[character]);
}

function formatDate(value, includeTime = false) {
  if (!value) return "—";
  const date = includeTime ? new Date(value) : new Date(`${String(value).slice(0, 10)}T12:00:00`);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("fr-FR", includeTime
    ? { dateStyle: "medium", timeStyle: "short" }
    : { dateStyle: "long" }).format(date);
}

function showNotice(message, type = "success") {
  elements.notice.textContent = message;
  elements.notice.className = `notice ${type}`;
  elements.notice.hidden = false;
  elements.notice.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

async function api(url, options = {}) {
  const response = await fetch(url, {
    credentials: "same-origin",
    cache: "no-store",
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers || {}) }
  });
  const data = await response.json().catch(() => ({}));
  if (response.status === 401) {
    location.replace("/academy-auth/login.html?error=login_required");
    throw new Error("unauthorized");
  }
  if (!response.ok || !data.ok) throw new Error(data.code || "request_failed");
  return data;
}

function trainingCard(training, archived = false) {
  const result = canonicalResult(training.result);
  const updateText = training.updatedByName && training.updatedAt !== training.createdAt
    ? ` · Modifié par ${escapeHtml(training.updatedByName)} le ${escapeHtml(formatDate(training.updatedAt, true))}`
    : "";
  return `
    <article class="training-card${archived ? " archived" : ""}">
      <div class="training-topline">
        <div><span class="training-date">${escapeHtml(formatDate(training.trainingDate))}</span><h3>${escapeHtml(training.trainingType)}</h3></div>
        <span class="result result-${escapeHtml(result)}">${escapeHtml(resultLabels[result] || result)}</span>
      </div>
      ${training.score !== null ? `<div class="score"><strong>${Number(training.score)}</strong><span>/100</span></div>` : ""}
      <div class="training-details">
        ${training.strengths ? `<section><h4>Points forts</h4><p>${escapeHtml(training.strengths)}</p></section>` : ""}
        ${training.improvements ? `<section><h4>Axes d’amélioration</h4><p>${escapeHtml(training.improvements)}</p></section>` : ""}
        ${training.comment ? `<section class="full"><h4>Commentaire</h4><p>${escapeHtml(training.comment)}</p></section>` : ""}
      </div>
      <footer>Ajouté par ${escapeHtml(training.instructorName)} · ${escapeHtml(formatDate(training.createdAt, true))}${updateText}</footer>
      <div class="training-actions">
        ${archived
          ? `<button type="button" class="restore-button" data-action="restore" data-id="${escapeHtml(training.id)}">Restaurer</button>`
          : `<button type="button" class="edit-button" data-action="edit" data-id="${escapeHtml(training.id)}">Modifier</button><button type="button" class="archive-button" data-action="archive" data-id="${escapeHtml(training.id)}">Archiver</button>`}
      </div>
    </article>
  `;
}

function renderPath(trainings) {
  const latestByModule = new Map();
  trainings.forEach(training => {
    if (standardModules.includes(training.trainingType) && !latestByModule.has(training.trainingType)) {
      latestByModule.set(training.trainingType, training);
    }
  });
  const validated = standardModules.filter(module => {
    const result = canonicalResult(latestByModule.get(module)?.result);
    return result === "valide";
  }).length;
  const percentage = Math.round((validated / standardModules.length) * 100);
  elements.pathPercentage.textContent = `${percentage} %`;
  elements.pathSummary.textContent = `${validated} module${validated > 1 ? "s" : ""} validé${validated > 1 ? "s" : ""} sur ${standardModules.length}`;
  elements.pathProgress.style.width = `${percentage}%`;
  elements.pathModules.innerHTML = standardModules.map((module, index) => {
    const training = latestByModule.get(module);
    const result = canonicalResult(training?.result || "non_commence");
    const label = resultLabels[result] || "Non commencé";
    return `
      <button class="path-module path-${escapeHtml(result)}" type="button" data-module="${escapeHtml(module)}">
        <span>${String(index + 1).padStart(2, "0")}</span>
        <strong>${escapeHtml(module)}</strong>
        <small>${escapeHtml(label)}</small>
      </button>
    `;
  }).join("");
}

function renderHistory(trainings, archivedTrainings = []) {
  trainingRecords = new Map([...trainings, ...archivedTrainings].map(training => [training.id, training]));
  elements.count.textContent = String(trainings.length);
  elements.historyEmpty.hidden = trainings.length > 0;
  elements.history.hidden = trainings.length === 0;
  elements.history.innerHTML = trainings.map(training => trainingCard(training)).join("");
  elements.archiveCount.textContent = String(archivedTrainings.length);
  elements.archiveEmpty.hidden = archivedTrainings.length > 0;
  elements.archiveHistory.hidden = archivedTrainings.length === 0;
  elements.archiveHistory.innerHTML = archivedTrainings.map(training => trainingCard(training, true)).join("");
  renderPath(trainings);
}

function updateCustomTrainingField() {
  const custom = elements.trainingType.value === "__custom__";
  elements.customTrainingField.hidden = !custom;
  elements.customTraining.required = custom;
  elements.customTraining.disabled = !custom;
  if (custom) elements.customTraining.focus();
}

function resetTrainingForm() {
  editingTrainingId = null;
  elements.trainingForm.reset();
  elements.trainingDate.valueAsDate = new Date();
  elements.customTrainingField.hidden = true;
  elements.customTraining.required = false;
  elements.customTraining.disabled = true;
  elements.optionalFields.open = false;
  elements.trainingFormKicker.textContent = "Nouvelle entrée";
  elements.trainingFormTitle.textContent = "Ajouter une formation";
  elements.saveTraining.textContent = "Ajouter à l’historique";
  elements.cancelTrainingEdit.hidden = true;
}

function editTraining(id) {
  const training = trainingRecords.get(id);
  if (!training) return;
  editingTrainingId = id;
  if (standardModules.includes(training.trainingType)) {
    elements.trainingType.value = training.trainingType;
    elements.customTraining.value = "";
  } else {
    elements.trainingType.value = "__custom__";
    elements.customTraining.value = training.trainingType;
  }
  updateCustomTrainingField();
  elements.trainingForm.elements.trainingDate.value = String(training.trainingDate).slice(0, 10);
  elements.trainingForm.elements.result.value = canonicalResult(training.result);
  elements.trainingForm.elements.score.value = training.score ?? "";
  elements.trainingForm.elements.strengths.value = training.strengths;
  elements.trainingForm.elements.improvements.value = training.improvements;
  elements.trainingForm.elements.comment.value = training.comment;
  elements.trainingFormKicker.textContent = "Modification";
  elements.trainingFormTitle.textContent = "Modifier la formation";
  elements.saveTraining.textContent = "Enregistrer les modifications";
  elements.cancelTrainingEdit.hidden = false;
  elements.optionalFields.open = Boolean(training.score !== null || training.strengths || training.improvements || training.comment);
  elements.trainingForm.scrollIntoView({ behavior: "smooth", block: "start" });
}

async function setTrainingArchive(id, archived) {
  const action = archived ? "archiver" : "restaurer";
  if (!confirm(`Voulez-vous vraiment ${action} cette formation ?`)) return;
  try {
    await api("/api/academy-admin-data/training/archive", {
      method: "POST",
      body: JSON.stringify({ id, discordId, archived })
    });
    if (editingTrainingId === id) resetTrainingForm();
    await loadDossier();
    showNotice(archived ? "La formation a été archivée." : "La formation a été restaurée.");
  } catch (error) {
    if (error.message !== "unauthorized") showNotice("Cette opération n’a pas pu être effectuée.", "error");
  }
}

async function loadDossier() {
  if (!/^\d{17,20}$/.test(discordId)) {
    elements.pageMessage.textContent = "Identifiant d’agent invalide. Revenez à la liste des effectifs.";
    return;
  }
  try {
    const data = await api(`/api/academy-admin-data/agent?id=${encodeURIComponent(discordId)}`);
    elements.avatar.src = data.agent.avatar;
    elements.avatar.alt = `Avatar de ${data.agent.displayName}`;
    elements.name.textContent = data.file.rpName || data.agent.displayName;
    elements.rank.textContent = data.agent.rank;
    elements.discord.textContent = `Discord · ${data.agent.displayName}`;
    elements.rpName.value = data.file.rpName;
    elements.matricule.value = data.file.matricule;
    elements.status.value = data.file.academyStatus;
    elements.generalNote.value = data.file.generalNote;
    elements.updated.textContent = data.file.updatedAt
      ? `Mis à jour le ${formatDate(data.file.updatedAt, true)}`
      : "Nouveau dossier";
    renderHistory(data.trainings, data.archivedTrainings);
    elements.pageMessage.hidden = true;
    elements.content.hidden = false;
  } catch (error) {
    if (error.message === "unauthorized") return;
    const messages = {
      agent_not_eligible: "Cet utilisateur n’est pas un agent éligible du CPD.",
      discord_members_forbidden: "Discord refuse l’accès à cet agent. Vérifiez les droits du bot.",
      database_not_configured: "La base de données n’est pas configurée sur Vercel."
    };
    elements.pageMessage.textContent = messages[error.message] || "Impossible de charger le dossier pour le moment.";
  }
}

elements.agentForm.addEventListener("submit", async event => {
  event.preventDefault();
  elements.saveAgent.disabled = true;
  elements.saveAgent.textContent = "Enregistrement…";
  try {
    const data = await api("/api/academy-admin-data/agent/save", {
      method: "POST",
      body: JSON.stringify({
        discordId,
        rpName: elements.rpName.value,
        matricule: elements.matricule.value,
        academyStatus: elements.status.value,
        generalNote: elements.generalNote.value
      })
    });
    elements.name.textContent = elements.rpName.value.trim() || elements.name.textContent;
    elements.updated.textContent = `Mis à jour le ${formatDate(data.updatedAt, true)}`;
    showNotice("Le dossier général a bien été enregistré.");
  } catch (error) {
    if (error.message !== "unauthorized") showNotice("Impossible d’enregistrer le dossier. Réessayez.", "error");
  } finally {
    elements.saveAgent.disabled = false;
    elements.saveAgent.textContent = "Enregistrer le dossier";
  }
});

elements.trainingForm.addEventListener("submit", async event => {
  event.preventDefault();
  elements.saveTraining.disabled = true;
  elements.saveTraining.textContent = editingTrainingId ? "Modification en cours…" : "Ajout en cours…";
  const form = new FormData(elements.trainingForm);
  const selectedTrainingType = form.get("trainingType");
  const trainingType = selectedTrainingType === "__custom__"
    ? String(form.get("customTrainingType") || "").trim()
    : selectedTrainingType;
  if (!trainingType) {
    showNotice("Sélectionnez un module ou saisissez un intitulé personnalisé.", "error");
    elements.saveTraining.disabled = false;
    elements.saveTraining.textContent = editingTrainingId ? "Enregistrer les modifications" : "Ajouter à l’historique";
    return;
  }
  try {
    const isEditing = Boolean(editingTrainingId);
    await api(isEditing ? "/api/academy-admin-data/training/update" : "/api/academy-admin-data/training/create", {
      method: "POST",
      body: JSON.stringify({
        id: editingTrainingId,
        discordId,
        trainingType,
        trainingDate: form.get("trainingDate"),
        result: form.get("result"),
        score: form.get("score"),
        strengths: form.get("strengths"),
        improvements: form.get("improvements"),
        comment: form.get("comment")
      })
    });
    resetTrainingForm();
    showNotice(isEditing ? "La formation a bien été modifiée." : "La formation a bien été ajoutée à l’historique.");
    await loadDossier();
  } catch (error) {
    if (error.message !== "unauthorized") {
      const messages = {
        optional_fields_not_nullable: "La base Neon considère encore certains champs facultatifs comme obligatoires. Exécutez le correctif SQL fourni.",
        training_result_constraint: "La contrainte du statut dans Neon n’est pas à jour. Exécutez le correctif SQL du statut.",
        invalid_training: "Vérifiez le module, la date et le résultat sélectionnés."
      };
      showNotice(messages[error.message] || "Impossible d’enregistrer cette formation pour le moment.", "error");
    }
  } finally {
    elements.saveTraining.disabled = false;
    elements.saveTraining.textContent = editingTrainingId ? "Enregistrer les modifications" : "Ajouter à l’historique";
  }
});

elements.cancelTrainingEdit.addEventListener("click", resetTrainingForm);
elements.trainingType.addEventListener("change", updateCustomTrainingField);

elements.pathModules.addEventListener("click", event => {
  const button = event.target.closest("[data-module]");
  if (!button) return;
  elements.trainingType.value = button.dataset.module;
  updateCustomTrainingField();
  elements.trainingForm.scrollIntoView({ behavior: "smooth", block: "start" });
});

document.querySelector("#dossier-content").addEventListener("click", event => {
  const button = event.target.closest("[data-action][data-id]");
  if (!button) return;
  const { action, id } = button.dataset;
  if (action === "edit") editTraining(id);
  if (action === "archive") setTrainingArchive(id, true);
  if (action === "restore") setTrainingArchive(id, false);
});

resetTrainingForm();
loadDossier();
