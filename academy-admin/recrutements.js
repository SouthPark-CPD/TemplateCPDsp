const ACADEMY_GUILD_ID = "1538858756354473984";
const elements = {
  total: document.querySelector("#total-count"),
  active: document.querySelector("#active-count"),
  closed: document.querySelector("#closed-count"),
  deleted: document.querySelector("#deleted-count"),
  search: document.querySelector("#ticket-search"),
  status: document.querySelector("#status-filter"),
  decision: document.querySelector("#decision-filter"),
  message: document.querySelector("#tickets-message"),
  list: document.querySelector("#tickets-list"),
  dialog: document.querySelector("#ticket-dialog"),
  detailLoading: document.querySelector("#detail-loading"),
  detailContent: document.querySelector("#detail-content"),
  detailApplicationId: document.querySelector("#detail-application-id"),
  detailCandidate: document.querySelector("#detail-candidate"),
  detailStatus: document.querySelector("#detail-status"),
  detailDiscord: document.querySelector("#detail-discord"),
  detailCreated: document.querySelector("#detail-created"),
  detailActor: document.querySelector("#detail-actor"),
  detailDiscordLink: document.querySelector("#detail-discord-link"),
  detailDecision: document.querySelector("#detail-decision"),
  saveDecision: document.querySelector("#save-decision"),
  formData: document.querySelector("#form-data"),
  transcript: document.querySelector("#transcript"),
  transcriptEmpty: document.querySelector("#transcript-empty")
};

const statusLabels = { active: "En cours", closed: "Fermé", deleted: "Archivé" };
const decisionLabels = { pending: "En attente", accepted: "Accepté", refused: "Refusé", withdrawn: "Abandon" };
const formLabels = {
  firstName: "Prénom RP", lastName: "Nom RP", age: "Âge RP", playerId: "Identifiant joueur",
  policeExperience: "Expérience police RP", experience: "Expérience RP",
  availability: "Disponibilités", motivation: "Motivations", qualities: "Qualités",
  discordUsername: "Compte Discord", discordGlobalName: "Nom Discord"
};

let tickets = [];
let selectedApplicationId = null;

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>'"]/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
  })[character]);
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(date);
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
    const haystack = `${ticket.applicationId} ${ticket.candidateName} ${ticket.candidateDiscordId} ${ticket.channelName}`.toLocaleLowerCase("fr");
    return (!query || haystack.includes(query))
      && (!elements.status.value || ticket.ticketStatus === elements.status.value)
      && (!elements.decision.value || ticket.recruitmentDecision === elements.decision.value);
  });

  if (!filtered.length) {
    elements.list.hidden = true;
    elements.message.hidden = false;
    elements.message.textContent = "Aucune demande ne correspond aux filtres sélectionnés.";
    return;
  }

  elements.message.hidden = true;
  elements.list.hidden = false;
  elements.list.innerHTML = filtered.map(ticket => `
    <article class="ticket-card">
      <div class="ticket-id"><span>${escapeHtml(ticket.applicationId)}</span><small>${escapeHtml(formatDate(ticket.createdAt))}</small></div>
      <div class="candidate"><h3>${escapeHtml(ticket.candidateName)}</h3><p>Discord · ${escapeHtml(ticket.candidateDiscordId)}</p></div>
      <span class="status status-${escapeHtml(ticket.ticketStatus)}">${escapeHtml(statusLabels[ticket.ticketStatus] || ticket.ticketStatus)}</span>
      <span class="decision decision-${escapeHtml(ticket.recruitmentDecision)}">${escapeHtml(decisionLabels[ticket.recruitmentDecision] || ticket.recruitmentDecision)}</span>
      <div class="ticket-actions">
        ${ticket.ticketStatus !== "deleted" && ticket.channelId ? `<a href="https://discord.com/channels/${ACADEMY_GUILD_ID}/${escapeHtml(ticket.channelId)}" target="_blank" rel="noopener">Discord ↗</a>` : ""}
        <button type="button" data-ticket-id="${escapeHtml(ticket.applicationId)}">Consulter</button>
      </div>
    </article>
  `).join("");
}

function renderFormData(formData) {
  if (!formData || !Object.keys(formData).length) {
    elements.formData.innerHTML = '<p class="empty">Formulaire non disponible pour cette ancienne candidature.</p>';
    return;
  }
  elements.formData.innerHTML = Object.entries(formLabels)
    .filter(([key]) => formData[key] !== undefined && formData[key] !== "")
    .map(([key, label]) => `<article><span>${escapeHtml(label)}</span><p>${escapeHtml(formData[key])}</p></article>`)
    .join("");
}

function renderTranscript(transcript) {
  const messages = Array.isArray(transcript?.messages) ? transcript.messages : [];
  elements.transcriptEmpty.hidden = messages.length > 0;
  elements.transcript.hidden = messages.length === 0;
  elements.transcript.innerHTML = messages.map(message => `
    <article class="message-entry">
      <header><strong>${escapeHtml(message.authorName || "Utilisateur inconnu")}</strong><span>${escapeHtml(formatDate(message.createdAt))}</span></header>
      ${message.content ? `<p>${escapeHtml(message.content)}</p>` : ""}
      ${(message.embeds || []).map(embed => `<div class="embed"><strong>${escapeHtml(embed.title || "Message intégré")}</strong>${embed.description ? `<p>${escapeHtml(embed.description)}</p>` : ""}${(embed.fields || []).map(field => `<p><b>${escapeHtml(field.name)}</b><br>${escapeHtml(field.value)}</p>`).join("")}</div>`).join("")}
      ${(message.attachments || []).map(file => `<a class="attachment" href="${escapeHtml(file.url)}" target="_blank" rel="noopener">📎 ${escapeHtml(file.filename)}</a>`).join("")}
    </article>
  `).join("");
}

async function openTicket(applicationId) {
  selectedApplicationId = applicationId;
  elements.detailLoading.textContent = "Chargement du dossier…";
  elements.detailLoading.hidden = false;
  elements.detailContent.hidden = true;
  elements.dialog.showModal();
  try {
    const data = await api(`/api/academy-admin-data/recruitment/ticket?id=${encodeURIComponent(applicationId)}`);
    const ticket = data.ticket;
    elements.detailApplicationId.textContent = ticket.applicationId;
    elements.detailCandidate.textContent = ticket.candidateName;
    elements.detailStatus.textContent = statusLabels[ticket.ticketStatus] || ticket.ticketStatus;
    elements.detailStatus.className = `status status-${ticket.ticketStatus}`;
    elements.detailDiscord.textContent = ticket.candidateDiscordId;
    elements.detailCreated.textContent = formatDate(ticket.createdAt);
    elements.detailActor.textContent = ticket.ticketStatus === "deleted"
      ? `${ticket.deletedByName || "Instructeur inconnu"} · ${formatDate(ticket.deletedAt)}`
      : ticket.ticketStatus === "closed"
        ? `${ticket.closedByName || "Instructeur inconnu"} · ${formatDate(ticket.closedAt)}`
        : "Ticket actuellement ouvert";
    elements.detailDecision.value = ticket.recruitmentDecision;
    if (ticket.ticketStatus !== "deleted" && ticket.channelId) {
      elements.detailDiscordLink.href = `https://discord.com/channels/${ACADEMY_GUILD_ID}/${ticket.channelId}`;
      elements.detailDiscordLink.hidden = false;
    } else {
      elements.detailDiscordLink.hidden = true;
    }
    renderFormData(ticket.formData);
    renderTranscript(ticket.transcript);
    elements.detailLoading.hidden = true;
    elements.detailContent.hidden = false;
  } catch (error) {
    if (error.message !== "unauthorized") elements.detailLoading.textContent = "Impossible de charger cette demande.";
  }
}

async function loadTickets() {
  try {
    const data = await api("/api/academy-admin-data/recruitment/tickets");
    tickets = data.tickets;
    elements.total.textContent = String(tickets.length);
    elements.active.textContent = String(tickets.filter(ticket => ticket.ticketStatus === "active").length);
    elements.closed.textContent = String(tickets.filter(ticket => ticket.ticketStatus === "closed").length);
    elements.deleted.textContent = String(tickets.filter(ticket => ticket.ticketStatus === "deleted").length);
    renderTickets();
  } catch (error) {
    if (error.message !== "unauthorized") elements.message.textContent = "Impossible de charger les demandes pour le moment.";
  }
}

elements.list.addEventListener("click", event => {
  const button = event.target.closest("[data-ticket-id]");
  if (button) openTicket(button.dataset.ticketId);
});
elements.search.addEventListener("input", renderTickets);
elements.status.addEventListener("change", renderTickets);
elements.decision.addEventListener("change", renderTickets);
document.querySelector("#close-dialog").addEventListener("click", () => elements.dialog.close());
elements.dialog.addEventListener("click", event => { if (event.target === elements.dialog) elements.dialog.close(); });
elements.saveDecision.addEventListener("click", async () => {
  if (!selectedApplicationId) return;
  elements.saveDecision.disabled = true;
  elements.saveDecision.textContent = "Enregistrement…";
  try {
    await api("/api/academy-admin-data/recruitment/decision", {
      method: "POST",
      body: JSON.stringify({ applicationId: selectedApplicationId, decision: elements.detailDecision.value })
    });
    const ticket = tickets.find(item => item.applicationId === selectedApplicationId);
    if (ticket) ticket.recruitmentDecision = elements.detailDecision.value;
    renderTickets();
    elements.saveDecision.textContent = "Décision enregistrée";
  } catch (error) {
    if (error.message !== "unauthorized") elements.saveDecision.textContent = "Échec — réessayer";
  } finally {
    elements.saveDecision.disabled = false;
    setTimeout(() => { elements.saveDecision.textContent = "Enregistrer la décision"; }, 1600);
  }
});

loadTickets();
