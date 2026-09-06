(() => {
  const form = document.getElementById("prosecutor-form"), submit = document.getElementById("submit-request"), status = document.getElementById("request-status"), date = document.getElementById("arrest-date"), agent = document.getElementById("case-agent"), preview = document.getElementById("thread-preview");
  const history = document.getElementById("prosecutor-history"), threadList = document.getElementById("prosecutor-threads"), threadDetail = document.getElementById("prosecutor-detail"), threadSearch = document.getElementById("prosecutor-search"), threadTotal = document.getElementById("prosecutor-total"), tabs = [...document.querySelectorAll("[data-prosecutor-tab]")];
  let requests = [], historyLoaded = false, activeThreadId = "", viewer = { id: "", displayName: "" };
  const mentions = window.CPDMentionPicker?.init(document.querySelector("[data-mention-picker]"));
  const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const safeUrl = value => { try { const url = new URL(String(value || "")); return /^https?:$/.test(url.protocol) ? url.href : ""; } catch { return ""; } };
  const formatDate = value => { const parsed = new Date(value); return Number.isNaN(parsed.getTime()) ? "Date inconnue" : new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(parsed); };
  const normalizedName = value => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim().toLowerCase();
  const initials = name => String(name || "CPD").trim().split(/\s+/).slice(0, 2).map(part => part[0]).join("").toUpperCase() || "CPD";
  const authorName = author => author?.displayName || author?.display_name || author?.nick || author?.global_name || author?.globalName || author?.username || "Agent CPD";
  const avatarUrl = author => author?.id && author?.avatar ? `https://cdn.discordapp.com/avatars/${encodeURIComponent(author.id)}/${encodeURIComponent(author.avatar)}.${String(author.avatar).startsWith("a_") ? "gif" : "png"}?size=64` : "";
  const formatTime = value => { const parsed = new Date(value); return Number.isNaN(parsed.getTime()) ? "" : new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" }).format(parsed); };
  const dayKey = value => { const parsed = new Date(value); return Number.isNaN(parsed.getTime()) ? "unknown" : `${parsed.getFullYear()}-${parsed.getMonth()}-${parsed.getDate()}`; };
  const formatDay = value => { const parsed = new Date(value); if (Number.isNaN(parsed.getTime())) return "Historique"; return new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(parsed); };
  const renderMessage = (value, members = []) => {
    const mentionMap = new Map((Array.isArray(members) ? members : []).map(member => [String(member.id), `@${authorName(member)}`]));
    const tokens = [];
    const normalized = String(value || "").replace(/<@!?(\d+)>/g, (_, id) => `%%MENTION_${tokens.push(mentionMap.get(id) || `@${id}`) - 1}%%`);
    let html = esc(normalized).replace(/^###\s+(.+)$/gm, '<span class="message-subtitle">$1</span>').replace(/^##\s+(.+)$/gm, '<span class="message-title">$1</span>').replace(/\*\*([^*\n]{1,180})\*\*/g, "<strong>$1</strong>");
    html = html.replace(/(https?:\/\/[^\s<]+)/g, match => { const url = safeUrl(match); return url ? `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${match}</a>` : match; });
    return html.replace(/%%MENTION_(\d+)%%/g, (_, index) => `<span class="message-mention">${esc(tokens[Number(index)] || "@membre")}</span>`);
  };
  const renderAttachments = message => {
    const items = (message.attachments || []).map(file => { const url = safeUrl(file.url); if (!url) return ""; const name = esc(file.filename || "Pièce jointe"); const image = String(file.content_type || "").startsWith("image/"); return image ? `<a class="chat-attachment image" href="${esc(url)}" target="_blank" rel="noopener noreferrer"><img src="${esc(url)}" alt="${name}" loading="lazy"><span>${name}</span></a>` : `<a class="chat-attachment file" href="${esc(url)}" target="_blank" rel="noopener noreferrer"><span class="attachment-icon">↗</span><span>${name}</span></a>`; }).join("");
    return items ? `<div class="chat-attachments">${items}</div>` : "";
  };
  const renderConversation = messages => {
    const sorted = [...(messages || [])].sort((a, b) => new Date(a.timestamp || 0) - new Date(b.timestamp || 0));
    if (!sorted.length) return '<div class="empty-state">Aucun message dans cette demande.</div>';
    let previousDay = "";
    return sorted.map(message => {
      const raw = String(message.content || ""), proxy = raw.match(/^\*\*([^*\n]{1,100})\*\*(?:\r?\n|$)/), name = proxy?.[1]?.trim() || authorName(message.author), content = proxy ? raw.slice(proxy[0].length) : raw;
      const dossier = /^\s*##\s+/m.test(content), own = !dossier && ((viewer.id && String(message.author?.id || "") === viewer.id && !message.author?.bot) || (viewer.displayName && normalizedName(name) === normalizedName(viewer.displayName)));
      const currentDay = dayKey(message.timestamp), separator = currentDay !== previousDay ? `<div class="chat-day"><span>${esc(formatDay(message.timestamp))}</span></div>` : "";
      previousDay = currentDay;
      const avatar = safeUrl(avatarUrl(message.author));
      return `${separator}<article class="chat-message${own ? " own" : ""}${dossier ? " dossier" : ""}"><div class="chat-avatar">${avatar && !proxy ? `<img src="${esc(avatar)}" alt="">` : esc(initials(dossier ? "CPD" : name))}</div><div class="chat-stack"><div class="chat-meta"><strong>${esc(dossier ? "Dossier initial" : name)}</strong>${own ? '<span class="message-you">Vous</span>' : ""}<time>${esc(formatTime(message.timestamp))}</time></div><div class="chat-bubble">${content ? `<div class="chat-copy">${renderMessage(content, message.mentions)}</div>` : ""}${renderAttachments(message)}</div></div></article>`;
    }).join("");
  };
  const setStatus = (message, type = "") => { status.hidden = false; status.className = `status ${type}`; status.innerHTML = message; };
  const today = new Date();
  date.value = today.toISOString().slice(0, 10);
  function updatePreview() { const fields = new FormData(form), rawDate = String(fields.get("arrestDate") || ""), [year, month, day] = rawDate.split("-"); const titleDate = year ? `${day}/${month}/${year}` : "00/00/0000"; preview.textContent = `${titleDate} - ${String(fields.get("suspect") || "Suspect").trim() || "Suspect"} - ${String(fields.get("charges") || "Chef d’accusation").trim() || "Chef d’accusation"}`.slice(0, 100); }
  form.addEventListener("input", updatePreview); updatePreview();
  function renderThreadList() {
    const query = String(threadSearch.value || "").trim().toLocaleLowerCase("fr");
    const filtered = requests.filter(item => !query || `${item.name} ${(item.tags || []).join(" ")}`.toLocaleLowerCase("fr").includes(query));
    threadTotal.textContent = `(${filtered.length})`;
    threadList.innerHTML = filtered.length ? filtered.map(item => `<button class="thread-card${item.id === activeThreadId ? " selected" : ""}" type="button" data-prosecutor-thread="${esc(item.id)}"><strong>${esc(item.name || "Demande sans titre")}</strong><span>${item.archived ? "Archivée" : "Active"} · ${esc(formatDate(item.updatedAt || item.createdAt))}${item.tags?.length ? ` · ${esc(item.tags.join(", "))}` : ""}</span></button>`).join("") : '<p class="empty-state">Aucune demande ne correspond à cette recherche.</p>';
  }
  async function loadHistory(force = false) {
    if (historyLoaded && !force) return;
    threadList.innerHTML = '<p class="empty-state">Chargement des demandes actives et archivées…</p>';
    try {
      const response = await fetch("/api/liaison/prosecutor-requests", { credentials: "same-origin", cache: "no-store" });
      const data = await response.json().catch(() => ({}));
      if (response.status === 401) return location.href = "/auth/login.html?error=login_required";
      if (!response.ok) throw new Error(data.code || "discord_unavailable");
      requests = (data.threads || []).sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0));
      historyLoaded = true;
      renderThreadList();
    } catch (error) {
      const message = error.message === "forum_read_forbidden" || error.message === "forum_read_disabled" ? "Le bot ou la configuration n’autorise pas la lecture de ce forum." : "Impossible de charger l’historique Discord.";
      threadList.innerHTML = `<p class="warning">${esc(message)}</p>`;
    }
  }
  async function openThread(threadId) {
    activeThreadId = threadId; renderThreadList();
    threadDetail.innerHTML = '<p class="empty-state">Chargement du dossier…</p>';
    try {
      const response = await fetch(`/api/liaison/prosecutor-requests?threadId=${encodeURIComponent(threadId)}`, { credentials: "same-origin", cache: "no-store" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.code || "discord_unavailable");
      const thread = requests.find(item => item.id === threadId) || data.thread || {};
      if (data.viewer) viewer = { id: String(data.viewer.id || ""), displayName: String(data.viewer.displayName || "") };
      threadDetail.innerHTML = `<header class="detail-head"><div><span class="detail-kicker">DEMANDE PROCUREUR</span><h3>${esc(thread.name || data.thread?.name || "Demande")}</h3><div class="detail-tags">${esc((thread.tags || []).join(" · ") || "Sans étiquette")}</div></div><span class="detail-state">${thread.archived ? "Archivée" : "Active"}</span></header><div class="messages" role="log" aria-label="Messages de la demande">${renderConversation(data.messages)}</div>`;
      const conversation = threadDetail.querySelector(".messages");
      requestAnimationFrame(() => { conversation.scrollTop = conversation.scrollHeight; });
    } catch {
      threadDetail.innerHTML = '<p class="warning">Impossible d’ouvrir cette demande. Vérifiez les permissions Discord du bot.</p>';
    }
  }
  function setTab(name) {
    const showHistory = name === "history";
    form.hidden = showHistory; history.hidden = !showHistory; status.hidden = true;
    tabs.forEach(tab => { const active = tab.dataset.prosecutorTab === name; tab.classList.toggle("active", active); tab.setAttribute("aria-selected", String(active)); });
    if (showHistory) loadHistory();
  }
  tabs.forEach(tab => tab.addEventListener("click", () => setTab(tab.dataset.prosecutorTab)));
  threadSearch.addEventListener("input", renderThreadList);
  document.getElementById("prosecutor-refresh").addEventListener("click", () => loadHistory(true));
  threadList.addEventListener("click", event => { const button = event.target.closest("[data-prosecutor-thread]"); if (button) openThread(button.dataset.prosecutorThread); });
  async function prefillAgent() { try { const response = await fetch("/api/auth/session", { credentials: "same-origin", cache: "no-store" }); const data = await response.json(); const name = data.user?.globalName || data.user?.username || ""; if (name && !agent.value) agent.value = data.user?.matricule ? `${name} · ${data.user.matricule}` : name; } catch { /* L’API validera la session à l’envoi. */ } }
  prefillAgent();
  form.addEventListener("submit", async event => { event.preventDefault(); if (!form.reportValidity()) return; submit.disabled = true; setStatus("Création de la demande…"); try { const payload = Object.fromEntries(new FormData(form).entries()); payload.mentions = mentions?.getIds() || []; const response = await fetch("/api/liaison/prosecutor-requests", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }); const data = await response.json().catch(() => ({})); if (response.status === 401) { location.href = "/auth/login.html?error=login_required"; return; } if (!response.ok) throw new Error(data.code || "discord_unavailable"); historyLoaded = false; setStatus(`Demande envoyée avec succès.${data.url ? ` <a href="${esc(data.url)}" target="_blank" rel="noopener">Ouvrir le fil Discord ↗</a>` : ""}`, "ok"); form.reset(); date.value = new Date().toISOString().slice(0, 10); mentions?.clear(); prefillAgent(); updatePreview(); window.parent.postMessage({ type: "liaison-updated" }, location.origin); } catch (error) { const message = { prosecutor_request_required_fields: "Remplissez l’identité du suspect, la date, l’agent, les chefs d’accusation et le rapport d’arrestation.", forum_forbidden: "Le bot Discord n’a pas les droits nécessaires sur ce forum.", liaison_access_denied: "Vous n’êtes pas autorisé à envoyer une demande procureur.", discord_unavailable: "Discord est momentanément indisponible." }; setStatus(message[error.message] || "Impossible d’envoyer la demande.", "error"); } finally { submit.disabled = false; } });
})();
