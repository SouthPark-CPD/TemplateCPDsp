const elements = {
  name: document.querySelector("#instructor-name"),
  total: document.querySelector("#agent-total"),
  files: document.querySelector("#file-total"),
  trainings: document.querySelector("#training-total"),
  search: document.querySelector("#agent-search"),
  rank: document.querySelector("#rank-filter"),
  message: document.querySelector("#agents-message"),
  list: document.querySelector("#agents-list")
};

const statusLabels = {
  a_former: "À former",
  en_formation: "En formation",
  termine: "Formation terminée",
  suspendu: "Suspendu"
};

let agents = [];

function escapeHtml(value) {
  return String(value || "").replace(/[&<>'"]/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
  })[character]);
}

function renderAgents() {
  const query = elements.search.value.trim().toLocaleLowerCase("fr");
  const selectedRank = elements.rank.value;
  const filtered = agents.filter(agent => {
    const haystack = `${agent.displayName} ${agent.username} ${agent.rpName} ${agent.matricule} ${agent.discordId}`.toLocaleLowerCase("fr");
    return (!query || haystack.includes(query)) && (!selectedRank || agent.rank === selectedRank);
  });

  if (!filtered.length) {
    elements.list.hidden = true;
    elements.message.hidden = false;
    elements.message.textContent = "Aucun agent ne correspond aux filtres sélectionnés.";
    return;
  }

  elements.message.hidden = true;
  elements.list.hidden = false;
  elements.list.innerHTML = filtered.map(agent => `
    <article class="agent-card">
      <img src="${escapeHtml(agent.avatar)}" alt="" loading="lazy">
      <div class="agent-main">
        <div class="agent-heading"><h3>${escapeHtml(agent.rpName || agent.displayName)}</h3><span class="rank">${escapeHtml(agent.rank)}</span></div>
        <p>${escapeHtml(agent.displayName)}${agent.matricule ? ` · Matricule ${escapeHtml(agent.matricule)}` : ""}</p>
        <div class="agent-meta"><span>${escapeHtml(statusLabels[agent.academyStatus] || "À former")}</span><span>${agent.trainingCount} formation${agent.trainingCount > 1 ? "s" : ""}</span></div>
      </div>
      <button class="file-button" type="button" disabled title="Disponible à l’étape suivante">Ouvrir le dossier</button>
    </article>
  `).join("");
}

async function initialize() {
  try {
    const sessionResponse = await fetch("/api/academy-admin-auth/session", { credentials: "same-origin", cache: "no-store" });
    if (!sessionResponse.ok) throw new Error("unauthorized");
    const session = await sessionResponse.json();
    elements.name.textContent = session.user.globalName || session.user.username;

    const response = await fetch("/api/academy-admin-data/agents", { credentials: "same-origin", cache: "no-store" });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.ok) throw new Error(data.code || "agents_unavailable");

    agents = data.agents;
    elements.total.textContent = String(data.total);
    elements.files.textContent = String(agents.filter(agent => agent.rpName || agent.matricule || agent.trainingCount).length);
    elements.trainings.textContent = String(agents.reduce((total, agent) => total + agent.trainingCount, 0));
    data.ranks.forEach(rank => elements.rank.add(new Option(rank, rank)));
    renderAgents();
  } catch (error) {
    if (error.message === "unauthorized") {
      location.replace("/academy-auth/login.html?error=login_required");
      return;
    }
    const messages = {
      bot_not_configured: "Le token du bot Discord n’est pas disponible sur Vercel.",
      discord_members_forbidden: "Discord refuse la liste des membres. Vérifiez que le bot est présent sur le serveur CPD et que Server Members Intent est activé."
    };
    elements.message.textContent = messages[error.message] || "Impossible de charger les agents pour le moment.";
  }
}

elements.search.addEventListener("input", renderAgents);
elements.rank.addEventListener("change", renderAgents);
initialize();
