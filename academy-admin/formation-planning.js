(() => {
  const elements = {
    form: document.querySelector("#planning-form"), id: document.querySelector("#planning-id"),
    title: document.querySelector("#planning-editor-title"), template: document.querySelector("#planning-template"),
    start: document.querySelector("#planning-start"), location: document.querySelector("#planning-location"),
    notes: document.querySelector("#planning-notes"), search: document.querySelector("#planning-agent-search"),
    agents: document.querySelector("#planning-agents"), count: document.querySelector("#planning-selection-count"),
    save: document.querySelector("#planning-save"), cancelEdit: document.querySelector("#planning-cancel-edit"),
    refresh: document.querySelector("#planning-refresh"), filter: document.querySelector("#planning-status-filter"),
    list: document.querySelector("#planning-list"), empty: document.querySelector("#planning-empty"),
    notice: document.querySelector("#notice")
  };
  if (!elements.form) return;
  let agents = [];
  let templates = [];
  let sessions = [];
  const selected = new Set();
  const escapeHtml = value => String(value ?? "").replace(/[&<>'"]/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]);

  async function api(url, options = {}) {
    const response = await fetch(url, { credentials: "same-origin", cache: "no-store", ...options, headers: { "Content-Type": "application/json", ...(options.headers || {}) } });
    const data = await response.json().catch(() => ({}));
    if (response.status === 401) { location.replace("/academy-auth/login.html?error=login_required"); throw new Error("unauthorized"); }
    if (!response.ok || !data.ok) throw new Error(data.code || "request_failed");
    return data;
  }

  function showNotice(text, type = "success") {
    elements.notice.textContent = text; elements.notice.className = `notice ${type}`; elements.notice.hidden = false;
    scrollTo({ top: 0, behavior: "smooth" }); setTimeout(() => { elements.notice.hidden = true; }, 5500);
  }

  function localDateTimeValue(value) {
    const date = value ? new Date(value) : new Date(Date.now() + 24 * 60 * 60 * 1000);
    date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
    return date.toISOString().slice(0, 16);
  }

  function formatDateTime(value) {
    return new Intl.DateTimeFormat("fr-FR", { dateStyle: "full", timeStyle: "short" }).format(new Date(value));
  }

  function updateCount() {
    elements.count.textContent = `${selected.size} sélectionné${selected.size > 1 ? "s" : ""}`;
  }

  function renderAgents() {
    const query = elements.search.value.trim().toLocaleLowerCase("fr");
    const visible = agents.filter(agent => !query || `${agent.rpName} ${agent.displayName} ${agent.matricule} ${agent.rank}`.toLocaleLowerCase("fr").includes(query));
    elements.agents.innerHTML = visible.map(agent => `<label class="planning-agent"><input type="checkbox" value="${agent.discordId}" ${selected.has(agent.discordId) ? "checked" : ""}><div><strong>${escapeHtml(agent.rpName || agent.displayName)}</strong><small>${escapeHtml(agent.rank)}${agent.matricule ? ` · ${escapeHtml(agent.matricule)}` : ""}</small></div></label>`).join("") || '<p class="group-empty">Aucun agent trouvé.</p>';
    updateCount();
  }

  function filteredSessions() {
    const filter = elements.filter.value;
    const now = Date.now();
    return sessions.filter(session => {
      if (filter === "all") return true;
      if (filter === "upcoming") return session.status === "scheduled" && new Date(session.startsAt).getTime() >= now;
      return session.status === filter;
    }).sort((first, second) => {
      const direction = filter === "upcoming" ? 1 : -1;
      return direction * (new Date(first.startsAt) - new Date(second.startsAt));
    });
  }

  function responseLabel(response) {
    return response === "present" ? "Présent" : response === "unavailable" ? "Indisponible" : "En attente";
  }

  function startUrl(session) {
    const params = new URLSearchParams({ template: session.templateId || "", date: String(session.startsAt).slice(0, 10), schedule: session.id });
    if (session.participants.length > 1) params.set("mode", "group");
    session.participants.forEach(participant => params.append("agent", participant.discordId));
    return `/academy-admin/evaluations.html?${params}`;
  }

  function renderSessions() {
    const visible = filteredSessions();
    elements.empty.hidden = Boolean(visible.length);
    elements.list.innerHTML = visible.map(session => {
      const responseBadges = session.participants.map(participant => `<span class="${escapeHtml(participant.response || "pending")}">${escapeHtml(participant.name || participant.discordId)} · ${responseLabel(participant.response)}</span>`).join("");
      const discordLink = session.discordMessageId ? `https://discord.com/channels/${session.discordGuildId}/${session.discordChannelId}/${session.discordMessageId}` : "";
      return `<article class="planning-card ${escapeHtml(session.status)}" data-id="${session.id}"><header><div><h3>${escapeHtml(session.trainingType)}</h3><time datetime="${escapeHtml(session.startsAt)}">${escapeHtml(formatDateTime(session.startsAt))}</time></div><span class="planning-status ${escapeHtml(session.status)}">${session.status === "scheduled" ? "Planifiée" : session.status === "completed" ? "Terminée" : "Annulée"}</span></header><div class="planning-meta"><span>${escapeHtml(session.location || "Lieu à définir")}</span><span>${escapeHtml(session.instructorName)}</span><span>${session.participants.length} participant${session.participants.length > 1 ? "s" : ""}</span></div><div class="planning-response-row">${responseBadges}</div>${session.notificationStatus === "failed" ? `<p class="planning-warning">La convocation Discord n’a pas pu être envoyée. Utilisez « Renvoyer » après vérification.</p>` : ""}<div class="planning-actions">${session.status === "scheduled" ? `<a class="start" href="${startUrl(session)}">Commencer</a><button data-action="edit" type="button">Modifier</button><button data-action="resend" type="button">Renvoyer</button><button class="danger" data-action="cancel" type="button">Annuler</button>` : ""}${discordLink ? `<a href="${discordLink}" target="_blank" rel="noopener">Voir sur Discord ↗</a>` : ""}</div></article>`;
    }).join("");
  }

  function resetForm() {
    elements.form.reset(); elements.id.value = ""; selected.clear(); elements.start.value = localDateTimeValue();
    elements.title.textContent = "Planifier une formation"; elements.save.textContent = "Planifier et envoyer sur Discord"; elements.cancelEdit.hidden = true; renderAgents();
  }

  function editSession(session) {
    elements.id.value = session.id; elements.template.value = session.templateId || ""; elements.start.value = localDateTimeValue(session.startsAt);
    elements.location.value = session.location || ""; elements.notes.value = session.notes || ""; selected.clear(); session.participants.forEach(participant => selected.add(participant.discordId));
    elements.title.textContent = "Modifier la formation planifiée"; elements.save.textContent = "Enregistrer les modifications"; elements.cancelEdit.hidden = false; renderAgents();
    window.openFormationTab?.("planning"); elements.form.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function loadPlanning() {
    try { const data = await api("/api/academy-admin-data/planning"); sessions = data.sessions || []; renderSessions(); }
    catch (error) { elements.list.innerHTML = `<p class="group-empty">${error.message === "planning_table_missing" ? "La table du planning n’est pas encore installée dans Neon." : "Impossible de charger le planning."}</p>`; }
  }

  async function initialize() {
    try {
      const [agentData, templateData] = await Promise.all([api("/api/academy-admin-data/agents"), api("/api/academy-admin-data/training-templates")]);
      agents = agentData.agents || []; templates = (templateData.templates || []).filter(template => template.active);
      templates.forEach(template => elements.template.add(new Option(template.name, template.id)));
      resetForm(); await loadPlanning();
    } catch (error) { if (error.message !== "unauthorized") elements.agents.innerHTML = '<p class="group-empty">Impossible de charger les agents.</p>'; }
  }

  elements.agents.addEventListener("change", event => { if (!event.target.matches('input[type="checkbox"]')) return; if (event.target.checked) selected.add(event.target.value); else selected.delete(event.target.value); updateCount(); });
  elements.search.addEventListener("input", renderAgents); elements.filter.addEventListener("change", renderSessions); elements.refresh.addEventListener("click", loadPlanning); elements.cancelEdit.addEventListener("click", resetForm);
  elements.list.addEventListener("click", async event => {
    const button = event.target.closest("button[data-action]"); if (!button) return;
    const session = sessions.find(item => item.id === button.closest("[data-id]").dataset.id); if (!session) return;
    if (button.dataset.action === "edit") return editSession(session);
    if (button.dataset.action === "cancel" && !confirm("Annuler cette formation et mettre à jour la convocation Discord ?")) return;
    button.disabled = true;
    try { await api("/api/academy-admin-data/planning/action", { method: "POST", body: JSON.stringify({ id: session.id, action: button.dataset.action }) }); showNotice(button.dataset.action === "cancel" ? "La formation a été annulée sur le planning et sur Discord." : "La convocation a été renvoyée sur Discord."); await loadPlanning(); }
    catch { showNotice("Impossible d’effectuer cette action.", "error"); button.disabled = false; }
  });
  elements.form.addEventListener("submit", async event => {
    event.preventDefault(); if (!selected.size) return showNotice("Sélectionnez au moins un participant.", "error");
    elements.save.disabled = true; elements.save.textContent = "Enregistrement…";
    try {
      const data = await api("/api/academy-admin-data/planning/save", { method: "POST", body: JSON.stringify({ id: elements.id.value || undefined, templateId: elements.template.value, startsAt: new Date(elements.start.value).toISOString(), location: elements.location.value.trim(), notes: elements.notes.value.trim(), participants: [...selected] }) });
      showNotice(data.schedule.notificationStatus === "sent" ? "La formation est planifiée et la convocation a été publiée sur Discord." : "La formation est enregistrée, mais Discord n’a pas reçu la convocation. Vous pourrez la renvoyer.", data.schedule.notificationStatus === "sent" ? "success" : "error");
      resetForm(); await loadPlanning();
    } catch (error) { showNotice(error.message === "planning_table_missing" ? "Installez d’abord la table du planning dans Neon." : "Impossible de planifier cette formation.", "error"); }
    finally { elements.save.disabled = false; if (!elements.id.value) elements.save.textContent = "Planifier et envoyer sur Discord"; }
  });
  initialize();
})();
