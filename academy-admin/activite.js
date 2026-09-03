const elements = {
  instructorName: document.getElementById("instructor-name"),
  todayCount: document.getElementById("today-count"),
  monthCount: document.getElementById("month-count"),
  actorCount: document.getElementById("actor-count"),
  search: document.getElementById("activity-search"),
  actor: document.getElementById("actor-filter"),
  type: document.getElementById("type-filter"),
  period: document.getElementById("period-filter"),
  message: document.getElementById("activity-message"),
  list: document.getElementById("activity-list")
};

const actionLabels = {
  agent_file_updated: "Dossier agent modifié",
  training_created: "Formation ajoutée",
  training_session_created: "Session collective enregistrée",
  training_updated: "Formation modifiée",
  training_archived: "Formation archivée",
  training_restored: "Formation restaurée",
  recruitment_decision_updated: "Décision de recrutement modifiée",
  template_created: "Grille de formation créée",
  template_updated: "Grille de formation modifiée",
  template_activated: "Grille de formation activée",
  template_deactivated: "Grille de formation désactivée"
};

const resultLabels = {
  planifiee: "Planifiée",
  valide: "Validée",
  validee: "Validée",
  a_revoir: "À revoir",
  non_valide: "Non validée"
};

const academyStatusLabels = {
  a_former: "À former",
  en_formation: "En formation",
  termine: "Formation terminée",
  suspendu: "Suspendu"
};

const decisionLabels = {
  pending: "En attente",
  accepted: "Acceptée",
  refused: "Refusée",
  withdrawn: "Abandon"
};

let entries = [];

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>'"]/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
  })[character]);
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date inconnue";
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

function category(entry) {
  if (entry.actionType.startsWith("training_")) return "training";
  if (entry.actionType.startsWith("template_")) return "training";
  if (entry.actionType.startsWith("recruitment_")) return "recruitment";
  return "agent";
}

function withinPeriod(value, period) {
  if (period === "all") return true;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  const now = new Date();
  if (period === "today") {
    return date.getFullYear() === now.getFullYear()
      && date.getMonth() === now.getMonth()
      && date.getDate() === now.getDate();
  }
  const days = Number(period);
  return date.getTime() >= now.getTime() - days * 86400000;
}

function detailItems(entry) {
  const details = entry.details || {};
  const items = [];
  if (details.trainingType) items.push(["Formation", details.trainingType]);
  if (details.trainingDate) items.push(["Date de formation", new Intl.DateTimeFormat("fr-FR").format(new Date(`${details.trainingDate}T12:00:00`))]);
  if (details.result) items.push(["Résultat", resultLabels[details.result] || details.result]);
  if (details.score !== null && details.score !== undefined) items.push(["Note", `${details.score}/100`]);
  if (details.participantCount) items.push(["Participants", String(details.participantCount)]);
  if (details.academyStatus) items.push(["Statut Academy", academyStatusLabels[details.academyStatus] || details.academyStatus]);
  if (details.matricule) items.push(["Matricule", details.matricule]);
  if (details.decision) items.push(["Décision", decisionLabels[details.decision] || details.decision]);
  return items;
}

function targetLink(entry) {
  if (entry.targetType === "agent" && entry.targetId) {
    return `/academy-admin/dossier.html?id=${encodeURIComponent(entry.targetId)}`;
  }
  if (entry.targetType === "recruitment") return "/academy-admin/recrutements.html";
  if (entry.targetType === "template") return "/academy-admin/evaluations.html";
  if (entry.targetType === "session") return "/academy-admin/sessions.html";
  return "";
}

function render() {
  const query = elements.search.value.trim().toLocaleLowerCase("fr");
  const selectedActor = elements.actor.value;
  const selectedType = elements.type.value;
  const selectedPeriod = elements.period.value;
  const filtered = entries.filter(entry => {
    const haystack = `${entry.actorName} ${entry.targetName} ${entry.targetId} ${actionLabels[entry.actionType] || entry.actionType}`.toLocaleLowerCase("fr");
    return (!query || haystack.includes(query))
      && (!selectedActor || entry.actorDiscordId === selectedActor)
      && (!selectedType || category(entry) === selectedType)
      && withinPeriod(entry.createdAt, selectedPeriod);
  });

  if (!filtered.length) {
    elements.list.hidden = true;
    elements.message.hidden = false;
    elements.message.textContent = entries.length
      ? "Aucune action ne correspond aux filtres sélectionnés."
      : "Le journal est prêt. Les prochaines actions des instructeurs apparaîtront ici.";
    return;
  }

  elements.message.hidden = true;
  elements.list.hidden = false;
  elements.list.innerHTML = filtered.map(entry => {
    const details = detailItems(entry);
    const link = targetLink(entry);
    return `
      <article class="activity-entry category-${category(entry)}">
        <span class="activity-marker" aria-hidden="true"></span>
        <div class="activity-main">
          <div class="activity-title"><strong>${escapeHtml(actionLabels[entry.actionType] || entry.actionType)}</strong><span>${escapeHtml(formatDate(entry.createdAt))}</span></div>
          <p><b>${escapeHtml(entry.actorName)}</b> · ${escapeHtml(entry.targetName || entry.targetId || "Élément Academy")}</p>
          ${details.length ? `<div class="activity-details">${details.map(([label, value]) => `<span><small>${escapeHtml(label)}</small><strong>${escapeHtml(value)}</strong></span>`).join("")}</div>` : ""}
        </div>
        ${link ? `<a class="target-link" href="${link}">Consulter →</a>` : ""}
      </article>
    `;
  }).join("");
}

async function initialize() {
  try {
    const response = await fetch("/api/academy-admin-data/activity", {
      credentials: "same-origin",
      cache: "no-store"
    });
    if (response.status === 401) {
      location.replace("/academy-auth/login.html?error=login_required");
      return;
    }
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.ok) throw new Error(data.code || "activity_unavailable");
    entries = data.entries || [];
    elements.instructorName.textContent = data.instructor?.globalName || data.instructor?.username || "Instructeur";
    const actorIds = new Set(entries.map(entry => entry.actorDiscordId));
    elements.todayCount.textContent = String(entries.filter(entry => withinPeriod(entry.createdAt, "today")).length);
    elements.monthCount.textContent = String(entries.filter(entry => withinPeriod(entry.createdAt, "30")).length);
    elements.actorCount.textContent = String(actorIds.size);
    (data.instructors || []).forEach(instructor => elements.actor.add(new Option(instructor.name, instructor.discordId)));
    render();
  } catch (error) {
    const messages = {
      activity_table_missing: "La table du journal d’activité n’existe pas encore dans Neon.",
      database_not_configured: "La base de données Academy n’est pas configurée.",
      activity_unavailable: "Le journal d’activité est momentanément indisponible."
    };
    elements.message.classList.add("error");
    elements.message.textContent = messages[error.message] || messages.activity_unavailable;
  }
}

elements.search.addEventListener("input", render);
elements.actor.addEventListener("change", render);
elements.type.addEventListener("change", render);
elements.period.addEventListener("change", render);
initialize();
