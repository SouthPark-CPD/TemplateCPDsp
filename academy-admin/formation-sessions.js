(() => {
  const group = {
    form: document.querySelector("#group-session-form"),
    notice: document.querySelector("#notice"),
    template: document.querySelector("#group-training-template"),
    date: document.querySelector("#group-training-date"),
    comment: document.querySelector("#group-common-comment"),
    templateInfo: document.querySelector("#group-template-info"),
    search: document.querySelector("#group-agent-search"),
    rank: document.querySelector("#group-rank-filter"),
    list: document.querySelector("#group-agents-list"),
    empty: document.querySelector("#group-agents-empty"),
    selectedCount: document.querySelector("#group-selected-count"),
    summary: document.querySelector("#group-submit-summary"),
    save: document.querySelector("#group-save-session"),
    selectVisible: document.querySelector("#group-select-visible"),
    clear: document.querySelector("#group-clear-selection"),
    history: document.querySelector("#group-history-list"),
    historyEmpty: document.querySelector("#group-history-empty"),
    refresh: document.querySelector("#group-refresh-history")
  };
  if (!group.form) return;

  const resultLabels = { planifiee: "Planifiée", valide: "Validée", a_revoir: "À revoir", non_valide: "Non validée" };
  let agents = [];
  let templates = [];
  const selected = new Map();
  const escapeHtml = value => String(value ?? "").replace(/[&<>'"]/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]);

  async function api(url, options = {}) {
    const response = await fetch(url, { credentials: "same-origin", cache: "no-store", ...options, headers: { "Content-Type": "application/json", ...(options.headers || {}) } });
    const data = await response.json().catch(() => ({}));
    if (response.status === 401) { location.replace("/academy-auth/login.html?error=login_required"); throw new Error("unauthorized"); }
    if (!response.ok || !data.ok) throw new Error(data.code || "request_failed");
    return data;
  }

  function showNotice(text, type = "success") {
    group.notice.textContent = text;
    group.notice.className = `notice ${type}`;
    group.notice.hidden = false;
    scrollTo({ top: 0, behavior: "smooth" });
    setTimeout(() => { group.notice.hidden = true; }, 5000);
  }

  function filteredAgents() {
    const query = group.search.value.trim().toLocaleLowerCase("fr");
    return agents.filter(agent => (!group.rank.value || agent.rank === group.rank.value) && (!query || `${agent.displayName} ${agent.rpName} ${agent.matricule} ${agent.rank}`.toLocaleLowerCase("fr").includes(query)));
  }

  function defaultParticipant(discordId) { return { discordId, result: "planifiee", score: "", note: "" }; }

  function updateSummary() {
    const count = selected.size;
    group.selectedCount.textContent = String(count);
    group.selectedCount.parentElement.lastChild.textContent = ` sélectionné${count > 1 ? "s" : ""}`;
    group.summary.textContent = count < 2 ? "Sélectionnez au moins 2 participants" : `${count} participants à enregistrer`;
    group.save.disabled = count < 2 || !group.template.value || !group.date.value;
  }

  function renderAgents() {
    const filtered = filteredAgents();
    group.empty.hidden = Boolean(filtered.length);
    group.list.innerHTML = filtered.map(agent => {
      const value = selected.get(agent.discordId) || defaultParticipant(agent.discordId);
      const checked = selected.has(agent.discordId);
      return `<article class="group-agent-row${checked ? " selected" : ""}" data-id="${agent.discordId}"><input class="group-agent-check" type="checkbox" ${checked ? "checked" : ""} aria-label="Sélectionner ${escapeHtml(agent.displayName)}"><div class="group-agent-identity"><strong>${escapeHtml(agent.rpName || agent.displayName)}</strong><span>${escapeHtml(agent.rank)}${agent.matricule ? ` · ${escapeHtml(agent.matricule)}` : ""}</span></div><select class="group-agent-result" aria-label="Résultat"><option value="planifiee" ${value.result === "planifiee" ? "selected" : ""}>Planifiée</option><option value="valide" ${value.result === "valide" ? "selected" : ""}>Validée</option><option value="a_revoir" ${value.result === "a_revoir" ? "selected" : ""}>À revoir</option><option value="non_valide" ${value.result === "non_valide" ? "selected" : ""}>Non validée</option></select><input class="group-agent-score" type="number" min="0" max="100" value="${escapeHtml(value.score)}" placeholder="Score" aria-label="Score sur 100"><input class="group-agent-note" maxlength="900" value="${escapeHtml(value.note)}" placeholder="Note individuelle…" aria-label="Note individuelle"></article>`;
    }).join("");
    updateSummary();
  }

  function saveRow(row) {
    const discordId = row.dataset.id;
    if (!selected.has(discordId)) return;
    selected.set(discordId, { discordId, result: row.querySelector(".group-agent-result").value, score: row.querySelector(".group-agent-score").value, note: row.querySelector(".group-agent-note").value.trim() });
  }

  function renderTemplateInfo() {
    const template = templates.find(item => item.id === group.template.value);
    group.templateInfo.hidden = !template;
    group.templateInfo.innerHTML = template ? `<strong>${escapeHtml(template.name)}</strong>${escapeHtml(template.description || "Formation disponible dans la bibliothèque Academy.")}` : "";
    updateSummary();
  }

  function formatDate(value) { return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(new Date(`${String(value).slice(0, 10)}T12:00:00`)); }

  function renderHistory(sessions) {
    group.historyEmpty.hidden = Boolean(sessions.length);
    group.history.innerHTML = sessions.map(session => {
      const scores = session.participants.filter(participant => Number.isInteger(participant.score));
      const average = scores.length ? Math.round(scores.reduce((total, participant) => total + participant.score, 0) / scores.length) : null;
      return `<article class="group-history-card"><div><h3>${escapeHtml(session.trainingType)}</h3><div class="group-history-meta"><span>${formatDate(session.trainingDate)}</span><span>${escapeHtml(session.instructorName)}</span><span>${session.participantCount} participant${session.participantCount > 1 ? "s" : ""}</span></div><div class="group-history-participants">${session.participants.map(participant => `<a href="/academy-admin/dossier.html?id=${encodeURIComponent(participant.discordId)}">${escapeHtml(participant.agentName || participant.discordId)} · ${escapeHtml(resultLabels[participant.result] || participant.result)}</a>`).join("")}</div></div><div class="group-history-score"><strong>${average === null ? "—" : `${average}%`}</strong><span>moyenne</span></div></article>`;
    }).join("");
  }

  async function loadHistory() {
    try { const data = await api("/api/academy-admin-data/training-sessions"); renderHistory(data.sessions || []); }
    catch (error) { if (error.message !== "unauthorized") group.history.innerHTML = '<p class="group-empty">Impossible de charger les sessions récentes.</p>'; }
  }

  async function initialize() {
    try {
      const [agentData, templateData] = await Promise.all([api("/api/academy-admin-data/agents"), api("/api/academy-admin-data/training-templates")]);
      agents = agentData.agents || [];
      templates = (templateData.templates || []).filter(template => template.active);
      (agentData.ranks || []).forEach(rank => group.rank.add(new Option(rank, rank)));
      templates.forEach(template => group.template.add(new Option(template.name, template.id)));
      const params = new URLSearchParams(location.search);
      group.date.valueAsDate = new Date();
      if (params.get("date")) group.date.value = params.get("date");
      if (params.get("template") && templates.some(template => template.id === params.get("template"))) {
        group.template.value = params.get("template");
        renderTemplateInfo();
      }
      const requestedAgents = params.getAll("agent");
      requestedAgents.filter(id => agents.some(agent => agent.discordId === id)).slice(0, 12).forEach(id => selected.set(id, defaultParticipant(id)));
      renderAgents();
      await loadHistory();
    } catch (error) {
      if (error.message !== "unauthorized") group.list.innerHTML = '<p class="group-empty">Impossible de charger les données de la session.</p>';
    }
  }

  group.list.addEventListener("change", event => {
    const row = event.target.closest(".group-agent-row");
    if (!row) return;
    const discordId = row.dataset.id;
    if (event.target.classList.contains("group-agent-check")) {
      if (event.target.checked) selected.set(discordId, defaultParticipant(discordId)); else selected.delete(discordId);
      renderAgents();
    } else saveRow(row);
    updateSummary();
  });
  group.list.addEventListener("input", event => { const row = event.target.closest(".group-agent-row"); if (row) saveRow(row); });
  group.search.addEventListener("input", renderAgents);
  group.rank.addEventListener("change", renderAgents);
  group.template.addEventListener("change", renderTemplateInfo);
  group.date.addEventListener("change", updateSummary);
  group.selectVisible.addEventListener("click", () => { filteredAgents().forEach(agent => { if (!selected.has(agent.discordId)) selected.set(agent.discordId, defaultParticipant(agent.discordId)); }); renderAgents(); });
  group.clear.addEventListener("click", () => { selected.clear(); renderAgents(); });
  group.refresh.addEventListener("click", loadHistory);
  group.form.addEventListener("submit", async event => {
    event.preventDefault();
    document.querySelectorAll(".group-agent-row").forEach(saveRow);
    if (selected.size < 2) return;
    group.save.disabled = true;
    group.save.textContent = "Enregistrement…";
    try {
      const scheduleId = new URLSearchParams(location.search).get("schedule") || undefined;
      const data = await api("/api/academy-admin-data/training-session/create", { method: "POST", body: JSON.stringify({ scheduleId, templateId: group.template.value, trainingDate: group.date.value, commonComment: group.comment.value.trim(), participants: [...selected.values()] }) });
      showNotice(`Session enregistrée dans ${data.createdCount} dossier${data.createdCount > 1 ? "s" : ""}.`);
      selected.clear(); group.comment.value = ""; renderAgents(); await loadHistory();
    } catch (error) {
      showNotice(error.message === "invalid_training_session" ? "Vérifiez la formation, la date et les résultats." : "Impossible d’enregistrer la session.", "error");
    } finally { group.save.textContent = "Enregistrer la session"; updateSummary(); }
  });

  initialize();
})();
