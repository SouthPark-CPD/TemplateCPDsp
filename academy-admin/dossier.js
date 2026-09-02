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
  saveTraining: document.querySelector("#save-training"),
  cancelTrainingEdit: document.querySelector("#cancel-training-edit"),
  trainingFormKicker: document.querySelector("#training-form-kicker"),
  trainingFormTitle: document.querySelector("#training-form-title"),
  history: document.querySelector("#training-history"),
  historyEmpty: document.querySelector("#history-empty"),
  archiveHistory: document.querySelector("#archive-history"),
  archiveEmpty: document.querySelector("#archive-empty"),
  archiveCount: document.querySelector("#archive-count")
};

let editingTrainingId = null;
let trainingRecords = new Map();

const resultLabels = {
  planifiee: "Planifiée",
  valide: "Validée",
  a_revoir: "À revoir",
  non_valide: "Non validée"
};

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
  const updateText = training.updatedByName && training.updatedAt !== training.createdAt
    ? ` · Modifié par ${escapeHtml(training.updatedByName)} le ${escapeHtml(formatDate(training.updatedAt, true))}`
    : "";
  return `
    <article class="training-card${archived ? " archived" : ""}">
      <div class="training-topline">
        <div><span class="training-date">${escapeHtml(formatDate(training.trainingDate))}</span><h3>${escapeHtml(training.trainingType)}</h3></div>
        <span class="result result-${escapeHtml(training.result)}">${escapeHtml(resultLabels[training.result] || training.result)}</span>
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
}

function resetTrainingForm() {
  editingTrainingId = null;
  elements.trainingForm.reset();
  elements.trainingDate.valueAsDate = new Date();
  elements.trainingFormKicker.textContent = "Nouvelle entrée";
  elements.trainingFormTitle.textContent = "Ajouter une formation";
  elements.saveTraining.textContent = "Ajouter à l’historique";
  elements.cancelTrainingEdit.hidden = true;
}

function editTraining(id) {
  const training = trainingRecords.get(id);
  if (!training) return;
  editingTrainingId = id;
  elements.trainingForm.elements.trainingType.value = training.trainingType;
  elements.trainingForm.elements.trainingDate.value = String(training.trainingDate).slice(0, 10);
  elements.trainingForm.elements.result.value = training.result;
  elements.trainingForm.elements.score.value = training.score ?? "";
  elements.trainingForm.elements.strengths.value = training.strengths;
  elements.trainingForm.elements.improvements.value = training.improvements;
  elements.trainingForm.elements.comment.value = training.comment;
  elements.trainingFormKicker.textContent = "Modification";
  elements.trainingFormTitle.textContent = "Modifier la formation";
  elements.saveTraining.textContent = "Enregistrer les modifications";
  elements.cancelTrainingEdit.hidden = false;
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
  try {
    const isEditing = Boolean(editingTrainingId);
    await api(isEditing ? "/api/academy-admin-data/training/update" : "/api/academy-admin-data/training/create", {
      method: "POST",
      body: JSON.stringify({
        id: editingTrainingId,
        discordId,
        trainingType: form.get("trainingType"),
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
    if (error.message !== "unauthorized") showNotice("Impossible d’ajouter cette formation. Vérifiez les champs puis réessayez.", "error");
  } finally {
    elements.saveTraining.disabled = false;
    elements.saveTraining.textContent = editingTrainingId ? "Enregistrer les modifications" : "Ajouter à l’historique";
  }
});

elements.cancelTrainingEdit.addEventListener("click", resetTrainingForm);

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
