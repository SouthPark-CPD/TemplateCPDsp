const elements = {
  message: document.getElementById("dashboard-message"),
  content: document.getElementById("dashboard-content"),
  instructorName: document.getElementById("instructor-name"),
  welcomeName: document.getElementById("welcome-name"),
  dashboardDate: document.getElementById("dashboard-date"),
  attentionEmpty: document.getElementById("attention-empty"),
  attentionList: document.getElementById("attention-list"),
  recentEmpty: document.getElementById("recent-empty"),
  recentList: document.getElementById("recent-list"),
  instructorsEmpty: document.getElementById("instructors-empty"),
  instructorsList: document.getElementById("instructors-list")
};

const resultLabels = {
  planifiee: "Planifiée",
  valide: "Validée",
  validee: "Validée",
  a_revoir: "À revoir",
  non_valide: "Non validée"
};

function canonicalResult(result) {
  return result === "validee" ? "valide" : result;
}

const errorMessages = {
  database_not_configured: "La base de données Academy n’est pas configurée.",
  discord_members_forbidden: "Le bot Discord ne peut pas lire les membres du serveur CPD.",
  dashboard_unavailable: "Le tableau de bord est momentanément indisponible."
};

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDate(value) {
  if (!value) return "Date inconnue";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date inconnue";
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(date);
}

function userDisplayName(user) {
  return user?.globalName || user?.global_name || user?.username || "Instructeur";
}

function setText(id, value) {
  const element = document.getElementById(id);
  if (element) element.textContent = value;
}

function renderAttention(items) {
  if (!items.length) return;
  elements.attentionEmpty.hidden = true;
  elements.attentionList.hidden = false;
  elements.attentionList.innerHTML = items.map(item => `
    <a class="attention-row" href="/academy-admin/dossier.html?id=${encodeURIComponent(item.discordId)}">
      <img src="${escapeHtml(item.avatar)}" alt="" loading="lazy">
      <span class="attention-agent"><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.rank)}</small></span>
      <span class="attention-reason priority-${Number(item.priority) || 4}">${escapeHtml(item.reason)}</span>
      <span class="row-arrow" aria-hidden="true">→</span>
    </a>
  `).join("");
}

function renderRecent(items) {
  if (!items.length) return;
  elements.recentEmpty.hidden = true;
  elements.recentList.hidden = false;
  elements.recentList.innerHTML = items.map(item => {
    const result = canonicalResult(item.result);
    const score = item.score === null || item.score === undefined ? "" : `<small>${Number(item.score)}/100</small>`;
    return `
      <a class="recent-row" href="/academy-admin/dossier.html?id=${encodeURIComponent(item.agentDiscordId)}">
        <span class="recent-main"><strong>${escapeHtml(item.trainingType)}</strong><small>${escapeHtml(item.agentName)} · ${escapeHtml(formatDate(item.trainingDate))}</small></span>
        <span class="result result-${escapeHtml(result)}">${escapeHtml(resultLabels[result] || result)}</span>
        ${score}
      </a>
    `;
  }).join("");
}

function renderInstructorActivity(items) {
  if (!items.length) return;
  const maximum = Math.max(...items.map(item => Number(item.trainingCount) || 0), 1);
  elements.instructorsEmpty.hidden = true;
  elements.instructorsList.hidden = false;
  elements.instructorsList.innerHTML = items.map(item => {
    const count = Number(item.trainingCount) || 0;
    const width = Math.max(8, Math.round((count / maximum) * 100));
    return `
      <div class="instructor-row">
        <div><strong>${escapeHtml(item.name || "Instructeur inconnu")}</strong><small>Dernière activité : ${escapeHtml(formatDate(item.lastActivity))}</small></div>
        <span class="activity-bar"><i style="width:${width}%"></i></span>
        <b>${count}</b>
      </div>
    `;
  }).join("");
}

function renderDashboard(data) {
  const instructor = userDisplayName(data.instructor);
  elements.instructorName.textContent = instructor;
  elements.welcomeName.textContent = instructor;
  elements.dashboardDate.textContent = new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(new Date());

  setText("metric-agents", data.metrics.totalAgents);
  setText("metric-dossiers", `${data.metrics.dossiersStarted} dossiers commencés`);
  setText("metric-training", data.metrics.inTraining);
  setText("metric-completed", `${data.metrics.completed} parcours terminés`);
  setText("metric-review", data.metrics.toReview);
  setText("metric-without", `${data.metrics.withoutTraining} sans formation`);
  setText("metric-tickets", data.recruitment.active);
  setText("metric-archives", `${data.recruitment.archived} archives`);
  setText("recruitment-active", data.recruitment.active);
  setText("recruitment-closed", data.recruitment.closed);
  setText("recruitment-archived", data.recruitment.archived);

  renderAttention(data.attention || []);
  renderRecent(data.recentTrainings || []);
  renderInstructorActivity(data.instructorActivity || []);
  elements.message.hidden = true;
  elements.content.hidden = false;
}

async function loadDashboard() {
  try {
    const response = await fetch("/api/academy-admin-data/dashboard", {
      credentials: "same-origin",
      cache: "no-store"
    });
    if (response.status === 401) {
      window.location.replace("/academy-auth/login.html");
      return;
    }
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.ok) throw new Error(data.code || "dashboard_unavailable");
    renderDashboard(data);
  } catch (error) {
    elements.message.classList.add("error");
    elements.message.textContent = errorMessages[error.message] || errorMessages.dashboard_unavailable;
  }
}

loadDashboard();
