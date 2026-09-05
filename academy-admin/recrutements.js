const elements = {
  total: document.querySelector("#total-count"), newCount: document.querySelector("#active-count"),
  processing: document.querySelector("#closed-count"), archived: document.querySelector("#deleted-count"),
  search: document.querySelector("#ticket-search"), status: document.querySelector("#status-filter"),
  decision: document.querySelector("#decision-filter"), message: document.querySelector("#tickets-message"),
  list: document.querySelector("#tickets-list"), dialog: document.querySelector("#ticket-dialog"),
  detailLoading: document.querySelector("#detail-loading"), detailContent: document.querySelector("#detail-content"),
  detailApplicationId: document.querySelector("#detail-application-id"), detailCandidate: document.querySelector("#detail-candidate"),
  detailStatus: document.querySelector("#detail-status"), detailPhone: document.querySelector("#detail-discord"),
  detailCreated: document.querySelector("#detail-created"), detailActor: document.querySelector("#detail-actor"),
  detailFollowup: document.querySelector("#detail-followup"), detailDecision: document.querySelector("#detail-decision"),
  detailNote: document.querySelector("#detail-note"), copyPhone: document.querySelector("#detail-copy-phone"),
  saveDecision: document.querySelector("#save-decision"), formData: document.querySelector("#form-data")
};

const statusLabels = { new: "Nouvelle", to_contact: "À contacter", contacted: "Contactée", scheduled: "Convoquée", processed: "Traitée", archived: "Archivée" };
const decisionLabels = { pending: "En attente", accepted: "Acceptée", refused: "Refusée", withdrawn: "Abandon" };
const kanbanColumns = [
  { status: "new", statuses: ["new"], title: "Nouvelles candidatures", hint: "À consulter" },
  { status: "to_contact", statuses: ["to_contact", "contacted"], title: "À contacter", hint: "Prise de contact" },
  { status: "scheduled", statuses: ["scheduled"], title: "Convoqués", hint: "Prochaine PA" },
  { status: "processed", statuses: ["processed", "archived"], title: "Traités", hint: "Décision ou archive" }
];
const formLabels = {
  firstName: "Prénom RP", lastName: "Nom RP", age: "Âge RP", phone: "Téléphone en jeu",
  policeExperience: "Expérience dans la police RP", experience: "Expérience RP",
  availability: "Disponibilités", motivation: "Motivations", qualities: "Qualités"
};
let tickets = [];
let selectedApplicationId = null;
let selectedPhone = "";
let ignoreClickUntil = 0;

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>'"]/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]);
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function relativeDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date inconnue";
  const seconds = Math.round((date.getTime() - Date.now()) / 1000);
  const formatter = new Intl.RelativeTimeFormat("fr-FR", { numeric: "auto" });
  if (Math.abs(seconds) < 3600) return formatter.format(Math.round(seconds / 60), "minute");
  if (Math.abs(seconds) < 86400) return formatter.format(Math.round(seconds / 3600), "hour");
  return formatter.format(Math.round(seconds / 86400), "day");
}

async function api(url, options = {}) {
  const response = await fetch(url, { credentials: "same-origin", cache: "no-store", ...options, headers: { "Content-Type": "application/json", ...(options.headers || {}) } });
  const data = await response.json().catch(() => ({}));
  if (response.status === 401) {
    location.replace("/academy-auth/login.html?error=login_required");
    throw new Error("unauthorized");
  }
  if (!response.ok || !data.ok) throw new Error(data.code || "request_failed");
  return data;
}

function renderTickets() {
  const query = elements.search.value.trim().toLocaleLowerCase("fr");
  const filtered = tickets.filter(ticket => {
    const haystack = `${ticket.applicationId} ${ticket.candidateName} ${ticket.phone} ${ticket.assignedInstructorName || ""}`.toLocaleLowerCase("fr");
    return (!query || haystack.includes(query)) && (!elements.status.value || ticket.status === elements.status.value) && (!elements.decision.value || ticket.recruitmentDecision === elements.decision.value);
  });
  elements.message.hidden = filtered.length > 0;
  elements.message.textContent = "Aucune candidature ne correspond aux filtres sélectionnés.";
  elements.list.hidden = false;
  const visibleColumns = elements.status.value
    ? kanbanColumns.filter(column => column.statuses.includes(elements.status.value))
    : kanbanColumns;
  elements.list.innerHTML = visibleColumns.map(column => {
    const cards = filtered.filter(ticket => column.statuses.includes(ticket.status));
    return `
      <section class="kanban-column column-${column.status}" data-drop-status="${column.status}">
        <header class="kanban-head">
          <span class="column-dot" aria-hidden="true"></span>
          <div><h3>${escapeHtml(column.title)}</h3><small>${escapeHtml(column.hint)}</small></div>
          <strong>${cards.length}</strong>
        </header>
        <div class="kanban-cards">
          ${cards.length ? cards.map(ticket => `
            <button class="kanban-card" type="button" draggable="true" data-ticket-id="${escapeHtml(ticket.applicationId)}" data-current-status="${escapeHtml(ticket.status)}">
              <span class="kanban-meta"><b>${escapeHtml(ticket.applicationId)}</b><time title="${escapeHtml(formatDate(ticket.createdAt))}">${escapeHtml(relativeDate(ticket.createdAt))}</time></span>
              <strong>${escapeHtml(ticket.candidateName)}</strong>
              <span class="kanban-phone">☎ ${escapeHtml(ticket.phone || "Non renseigné")}</span>
              <span class="kanban-owner">${ticket.assignedInstructorName ? `Responsable · ${escapeHtml(ticket.assignedInstructorName)}` : "Non attribuée"}</span>
              ${ticket.recruitmentDecision !== "pending" ? `<span class="decision decision-${escapeHtml(ticket.recruitmentDecision)}">${escapeHtml(decisionLabels[ticket.recruitmentDecision])}</span>` : ""}
              <span class="kanban-open">Consulter le dossier <b>→</b></span>
            </button>`).join("") : '<p class="kanban-empty">Aucune candidature</p>'}
        </div>
      </section>`;
  }).join("");
}

function renderFormData(formData) {
  if (!formData || !Object.keys(formData).length) {
    elements.formData.innerHTML = '<p class="empty">Les réponses du formulaire ne sont pas disponibles.</p>';
    return;
  }
  elements.formData.innerHTML = Object.entries(formLabels)
    .filter(([key]) => formData[key] !== undefined && formData[key] !== "")
    .map(([key, label]) => `<article><span>${escapeHtml(label)}</span><p>${escapeHtml(formData[key])}</p></article>`).join("");
}

async function openTicket(applicationId) {
  selectedApplicationId = applicationId;
  selectedPhone = "";
  elements.detailLoading.textContent = "Chargement du dossier…";
  elements.detailLoading.hidden = false;
  elements.detailContent.hidden = true;
  elements.dialog.showModal();
  try {
    const { ticket } = await api(`/api/academy-admin-data/recruitment/ticket?id=${encodeURIComponent(applicationId)}`);
    selectedPhone = ticket.phone || "";
    elements.detailApplicationId.textContent = ticket.applicationId;
    elements.detailCandidate.textContent = ticket.candidateName;
    elements.detailStatus.textContent = statusLabels[ticket.status] || ticket.status;
    elements.detailStatus.className = `status status-${ticket.status}`;
    elements.detailPhone.textContent = ticket.phone || "Non renseigné";
    elements.detailCreated.textContent = formatDate(ticket.createdAt);
    elements.detailActor.textContent = ticket.assignedInstructorName || "Non attribuée";
    elements.detailFollowup.value = ticket.status;
    elements.detailDecision.value = ticket.recruitmentDecision;
    elements.detailNote.value = ticket.internalNote || "";
    renderFormData(ticket.formData);
    elements.detailLoading.hidden = true;
    elements.detailContent.hidden = false;
  } catch (error) {
    if (error.message !== "unauthorized") elements.detailLoading.textContent = "Impossible de charger cette candidature.";
  }
}

function updateCounters() {
  elements.total.textContent = String(tickets.length);
  elements.newCount.textContent = String(tickets.filter(ticket => ticket.status === "new").length);
  elements.processing.textContent = String(tickets.filter(ticket => ["to_contact", "contacted", "scheduled"].includes(ticket.status)).length);
  elements.archived.textContent = String(tickets.filter(ticket => ticket.status === "archived").length);
}

async function loadTickets() {
  try {
    const data = await api("/api/academy-admin-data/recruitment/tickets");
    tickets = data.tickets;
    updateCounters();
    renderTickets();
  } catch (error) {
    if (error.message !== "unauthorized") elements.message.textContent = "Impossible de charger les candidatures pour le moment.";
  }
}

elements.list.addEventListener("click", event => {
  if (Date.now() < ignoreClickUntil) return;
  const button = event.target.closest("[data-ticket-id]");
  if (button) openTicket(button.dataset.ticketId);
});
let draggedApplicationId = null;
elements.list.addEventListener("dragstart", event => {
  const card = event.target.closest(".kanban-card");
  if (!card) return;
  draggedApplicationId = card.dataset.ticketId;
  card.classList.add("is-dragging");
  event.dataTransfer.effectAllowed = "move";
  event.dataTransfer.setData("text/plain", draggedApplicationId);
});
elements.list.addEventListener("dragend", event => {
  event.target.closest(".kanban-card")?.classList.remove("is-dragging");
  elements.list.querySelectorAll(".is-drag-over").forEach(column => column.classList.remove("is-drag-over"));
  draggedApplicationId = null;
  ignoreClickUntil = Date.now() + 250;
});
elements.list.addEventListener("dragover", event => {
  const column = event.target.closest("[data-drop-status]");
  if (!column || !draggedApplicationId) return;
  event.preventDefault();
  event.dataTransfer.dropEffect = "move";
  elements.list.querySelectorAll(".is-drag-over").forEach(item => item.classList.toggle("is-drag-over", item === column));
});
elements.list.addEventListener("dragleave", event => {
  const column = event.target.closest("[data-drop-status]");
  if (column && !column.contains(event.relatedTarget)) column.classList.remove("is-drag-over");
});
elements.list.addEventListener("drop", async event => {
  const column = event.target.closest("[data-drop-status]");
  const applicationId = draggedApplicationId || event.dataTransfer.getData("text/plain");
  if (!column || !applicationId) return;
  event.preventDefault();
  const ticket = tickets.find(item => item.applicationId === applicationId);
  const status = column.dataset.dropStatus;
  column.classList.remove("is-drag-over");
  if (!ticket || ticket.status === status || (status === "to_contact" && ticket.status === "contacted") || (status === "processed" && ticket.status === "archived")) return;
  const previousStatus = ticket.status;
  ticket.status = status;
  renderTickets();
  try {
    const data = await api("/api/academy-admin-data/recruitment/decision", {
      method: "POST",
      body: JSON.stringify({ applicationId, status, decision: ticket.recruitmentDecision })
    });
    Object.assign(ticket, data.ticket);
    updateCounters();
    renderTickets();
  } catch (error) {
    ticket.status = previousStatus;
    updateCounters();
    renderTickets();
    if (error.message !== "unauthorized") alert("Le changement de colonne n’a pas pu être enregistré.");
  }
});
elements.search.addEventListener("input", renderTickets);
elements.status.addEventListener("change", renderTickets);
elements.decision.addEventListener("change", renderTickets);
document.querySelector("#close-dialog").addEventListener("click", () => elements.dialog.close());
elements.dialog.addEventListener("click", event => { if (event.target === elements.dialog) elements.dialog.close(); });
elements.copyPhone.addEventListener("click", async () => {
  if (!selectedPhone) return;
  try { await navigator.clipboard.writeText(selectedPhone); elements.copyPhone.textContent = "Téléphone copié"; }
  catch { elements.copyPhone.textContent = selectedPhone; }
  setTimeout(() => { elements.copyPhone.textContent = "Copier le téléphone"; }, 1600);
});
elements.saveDecision.addEventListener("click", async () => {
  if (!selectedApplicationId) return;
  elements.saveDecision.disabled = true;
  elements.saveDecision.textContent = "Enregistrement…";
  try {
    const data = await api("/api/academy-admin-data/recruitment/decision", {
      method: "POST",
      body: JSON.stringify({ applicationId: selectedApplicationId, status: elements.detailFollowup.value, decision: elements.detailDecision.value, internalNote: elements.detailNote.value })
    });
    const ticket = tickets.find(item => item.applicationId === selectedApplicationId);
    if (ticket) Object.assign(ticket, data.ticket);
    updateCounters();
    renderTickets();
    elements.detailStatus.textContent = statusLabels[data.ticket.status] || data.ticket.status;
    elements.detailStatus.className = `status status-${data.ticket.status}`;
    elements.detailActor.textContent = data.ticket.assignedInstructorName || "Non attribuée";
    elements.saveDecision.textContent = "Suivi enregistré";
  } catch (error) {
    if (error.message !== "unauthorized") elements.saveDecision.textContent = "Échec — réessayer";
  } finally {
    elements.saveDecision.disabled = false;
    setTimeout(() => { elements.saveDecision.textContent = "Enregistrer le suivi"; }, 1600);
  }
});

loadTickets();
