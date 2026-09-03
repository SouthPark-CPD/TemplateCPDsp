const elements = {
  instructorName: document.getElementById("instructor-name"),
  total: document.getElementById("total-count"),
  progress: document.getElementById("progress-count"),
  review: document.getElementById("review-count"),
  completed: document.getElementById("completed-count"),
  search: document.getElementById("agent-search"),
  status: document.getElementById("status-filter"),
  rank: document.getElementById("rank-filter"),
  sort: document.getElementById("sort-filter"),
  message: document.getElementById("overview-message"),
  list: document.getElementById("overview-list")
};

const resultLabels = {
  non_commence: "Non commencé",
  planifiee: "Planifiée",
  valide: "Validée",
  a_revoir: "À revoir",
  non_valide: "Non validée"
};

const stateLabels = {
  review: "À revoir",
  in_progress: "En formation",
  not_started: "Non commencé",
  completed: "Terminé",
  suspended: "Suspendu"
};

let agents = [];

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>'"]/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
  })[character]);
}

function formatDate(value) {
  if (!value) return "Aucune formation";
  const date = new Date(`${String(value).slice(0, 10)}T12:00:00`);
  if (Number.isNaN(date.getTime())) return "Date inconnue";
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(date);
}

function agentState(agent) {
  if (agent.academyStatus === "suspendu") return "suspended";
  if (agent.reviewCount > 0 || agent.failedCount > 0) return "review";
  if (agent.percentage === 100) return "completed";
  if (agent.trainingCount === 0) return "not_started";
  return "in_progress";
}

function moduleDots(modules) {
  return modules.map((module, index) => `
    <span class="module-dot module-${escapeHtml(module.result)}" title="${escapeHtml(module.name)} — ${escapeHtml(resultLabels[module.result] || module.result)}">
      ${index + 1}
    </span>
  `).join("");
}

function dateValue(value) {
  if (!value) return null;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? null : time;
}

function compareAgents(a, b, criterion) {
  if (criterion === "progress_asc") return a.percentage - b.percentage || a.displayName.localeCompare(b.displayName, "fr");
  if (criterion === "progress_desc") return b.percentage - a.percentage || a.displayName.localeCompare(b.displayName, "fr");
  if (criterion === "rank_desc") return b.rankLevel - a.rankLevel || a.displayName.localeCompare(b.displayName, "fr");
  if (criterion === "rank_asc") return a.rankLevel - b.rankLevel || a.displayName.localeCompare(b.displayName, "fr");
  if (criterion === "name_asc") return (a.rpName || a.displayName).localeCompare(b.rpName || b.displayName, "fr");
  if (criterion === "recent_desc" || criterion === "recent_asc") {
    const dateA = dateValue(a.lastTrainingDate);
    const dateB = dateValue(b.lastTrainingDate);
    if (dateA === null && dateB === null) return a.displayName.localeCompare(b.displayName, "fr");
    if (dateA === null) return 1;
    if (dateB === null) return -1;
    return criterion === "recent_desc" ? dateB - dateA : dateA - dateB;
  }
  const priorities = { review: 0, in_progress: 1, not_started: 2, suspended: 3, completed: 4 };
  return priorities[agentState(a)] - priorities[agentState(b)]
    || a.percentage - b.percentage
    || a.displayName.localeCompare(b.displayName, "fr");
}

function render() {
  const query = elements.search.value.trim().toLocaleLowerCase("fr");
  const selectedStatus = elements.status.value;
  const selectedRank = elements.rank.value;
  const filtered = agents.filter(agent => {
    const haystack = `${agent.rpName} ${agent.displayName} ${agent.username} ${agent.matricule}`.toLocaleLowerCase("fr");
    return (!query || haystack.includes(query))
      && (!selectedStatus || agentState(agent) === selectedStatus)
      && (!selectedRank || agent.rank === selectedRank);
  }).sort((a, b) => compareAgents(a, b, elements.sort.value));

  if (!filtered.length) {
    elements.list.hidden = true;
    elements.message.hidden = false;
    elements.message.textContent = "Aucun agent ne correspond aux filtres sélectionnés.";
    return;
  }

  elements.message.hidden = true;
  elements.list.hidden = false;
  elements.list.innerHTML = filtered.map(agent => {
    const state = agentState(agent);
    const remaining = Math.max(0, agent.modules.length - Number(agent.validatedCount || 0));
    const details = agent.reviewCount > 0
      ? `${agent.reviewCount} module${agent.reviewCount > 1 ? "s" : ""} à revoir`
      : agent.failedCount > 0
        ? `${agent.failedCount} module${agent.failedCount > 1 ? "s" : ""} non validé${agent.failedCount > 1 ? "s" : ""}`
      : agent.percentage === 100
        ? "Parcours complet"
        : `${remaining} module${remaining > 1 ? "s" : ""} restant${remaining > 1 ? "s" : ""}`;
    return `
      <article class="agent-row">
        <div class="agent-summary">
          <img src="${escapeHtml(agent.avatar)}" alt="" loading="lazy">
          <div class="agent-name"><div><h3>${escapeHtml(agent.rpName || agent.displayName)}</h3><span>${escapeHtml(agent.rank)}</span></div><p>${escapeHtml(agent.matricule ? `Matricule ${agent.matricule}` : agent.displayName)}</p></div>
          <span class="state state-${state}">${escapeHtml(stateLabels[state])}</span>
          <div class="progress"><div><strong>${Number(agent.percentage)} %</strong><span>${escapeHtml(details)}</span></div><i><b style="width:${Number(agent.percentage)}%"></b></i></div>
          <div class="last-training"><span>Dernière formation</span><strong>${escapeHtml(formatDate(agent.lastTrainingDate))}</strong></div>
          <div class="agent-actions"><a class="train-agent" href="/academy-admin/evaluations.html?agent=${encodeURIComponent(agent.discordId)}">Former</a><a href="/academy-admin/dossier.html?id=${encodeURIComponent(agent.discordId)}">Ouvrir le dossier</a></div>
        </div>
        <div class="module-strip"><span>Modules</span><div>${moduleDots(agent.modules)}</div></div>
      </article>
    `;
  }).join("");
}

async function initialize() {
  try {
    const response = await fetch("/api/academy-admin-data/training-overview", {
      credentials: "same-origin",
      cache: "no-store"
    });
    if (response.status === 401) {
      location.replace("/academy-auth/login.html?error=login_required");
      return;
    }
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.ok) throw new Error(data.code || "training_overview_unavailable");
    agents = data.agents || [];
    elements.instructorName.textContent = data.instructor?.globalName || data.instructor?.username || "Instructeur";
    elements.total.textContent = String(data.summary.total);
    elements.progress.textContent = String(data.summary.inProgress);
    elements.review.textContent = String(data.summary.toReview);
    elements.completed.textContent = String(data.summary.completed);
    (data.ranks || []).forEach(rank => elements.rank.add(new Option(rank, rank)));
    const requestedStatus = new URLSearchParams(location.search).get("status");
    if (["review", "in_progress", "not_started", "completed", "suspended"].includes(requestedStatus)) {
      elements.status.value = requestedStatus;
    }
    render();
  } catch (error) {
    const messages = {
      database_not_configured: "La base de données Academy n’est pas configurée.",
      discord_members_forbidden: "Discord refuse l’accès aux effectifs. Vérifiez les permissions du bot.",
      training_overview_unavailable: "Le suivi des formations est momentanément indisponible."
    };
    elements.message.classList.add("error");
    elements.message.textContent = messages[error.message] || messages.training_overview_unavailable;
  }
}

elements.search.addEventListener("input", render);
elements.status.addEventListener("change", render);
elements.rank.addEventListener("change", render);
elements.sort.addEventListener("change", render);
initialize();
