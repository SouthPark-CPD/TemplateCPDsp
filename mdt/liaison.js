(() => {
  const form = document.getElementById("complaint-form");
  const button = document.getElementById("submit-complaint");
  const status = document.getElementById("complaint-status");
  const description = document.getElementById("complaint-description");
  const counter = document.getElementById("description-count");
  const complaintMentionPicker = window.CPDMentionPicker?.init(document.querySelector("[data-mention-picker]"));
  const list = document.getElementById("complaint-list");
  const tabs = [...document.querySelectorAll("[data-tab]")];
  const threads = document.getElementById("threads");
  const detail = document.getElementById("thread-detail");
  const search = document.getElementById("thread-search");
  const statusFilter = document.getElementById("thread-status-filter");
  const tagFilter = document.getElementById("thread-tag-filter");
  const total = document.getElementById("thread-total");

  let allThreads = [];
  let availableTags = [];
  let activeThreadId = "";
  let viewer = { id: "", displayName: "" };

  const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[character]));
  const safeUrl = (value) => {
    try {
      const url = new URL(String(value || ""));
      return /^https?:$/.test(url.protocol) ? url.href : "";
    } catch { return ""; }
  };
  const normalizedName = (value) => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim().toLowerCase();
  const initials = (name) => String(name || "CPD").trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "CPD";
  const authorName = (author) => author?.displayName || author?.display_name || author?.nick || author?.global_name || author?.globalName || author?.username || "Agent CPD";
  const avatarUrl = (author) => {
    if (!author?.id || !author?.avatar) return "";
    const extension = String(author.avatar).startsWith("a_") ? "gif" : "png";
    return `https://cdn.discordapp.com/avatars/${encodeURIComponent(author.id)}/${encodeURIComponent(author.avatar)}.${extension}?size=64`;
  };
  const messageDate = (value) => {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  };
  const formatTime = (value) => {
    const date = messageDate(value);
    return date ? new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" }).format(date) : "";
  };
  const dayKey = (value) => {
    const date = messageDate(value);
    return date ? `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}` : "unknown";
  };
  const formatDay = (value) => {
    const date = messageDate(value);
    if (!date) return "Historique";
    const today = new Date();
    const startToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const startDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const distance = Math.round((startToday - startDate) / 86400000);
    if (distance === 0) return "Aujourd’hui";
    if (distance === 1) return "Hier";
    return new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", year: date.getFullYear() === today.getFullYear() ? undefined : "numeric" }).format(date);
  };

  const renderMessage = (value, members = []) => {
    const mentionMap = new Map((Array.isArray(members) ? members : []).map((member) => [
      String(member.id), `@${authorName(member)}`
    ]));
    const mentionTokens = [];
    const normalized = String(value ?? "").replace(/<@!?(\d+)>/g, (_, id) => {
      const index = mentionTokens.push(mentionMap.get(id) || `@${id}`) - 1;
      return `%%CPD_MENTION_${index}%%`;
    });
    let html = escapeHtml(normalized);
    html = html.replace(/^###\s+(.+)$/gm, '<span class="message-subtitle">$1</span>');
    html = html.replace(/^##\s+(.+)$/gm, '<span class="message-title">$1</span>');
    html = html.replace(/\*\*([^*\n]{1,180})\*\*/g, "<strong>$1</strong>");
    html = html.replace(/(https?:\/\/[^\s<]+)/g, (match) => {
      const url = safeUrl(match);
      return url ? `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${match}</a>` : match;
    });
    return html.replace(/%%CPD_MENTION_(\d+)%%/g, (_, index) => `<span class="message-mention">${escapeHtml(mentionTokens[Number(index)] || "@membre")}</span>`);
  };

  const messageIdentity = (message) => {
    const raw = String(message?.content || "");
    const proxy = raw.match(/^\*\*([^*\n]{1,100})\*\*(?:\r?\n|$)/);
    const name = proxy?.[1]?.trim() || authorName(message?.author);
    const content = proxy ? raw.slice(proxy[0].length) : raw;
    const system = /^(historique mdt|système|system)$/i.test(name);
    const dossier = /^\s*##\s+/m.test(content) || /^pièces jointes du dépôt/i.test(content.trim());
    const own = !system && !dossier && (
      (viewer.id && String(message?.author?.id || "") === viewer.id && !message?.author?.bot)
      || (viewer.displayName && normalizedName(name) === normalizedName(viewer.displayName))
    );
    return { name, content, system, dossier, own, proxied: Boolean(proxy && message?.author?.bot) };
  };

  const renderAttachments = (message) => {
    const attachments = Array.isArray(message?.attachments) ? message.attachments : [];
    if (!attachments.length) return "";
    const items = attachments.map((attachment) => {
      const url = safeUrl(attachment.url);
      if (!url) return "";
      const isImage = String(attachment.content_type || attachment.type || "").startsWith("image/") || /\.(?:png|jpe?g|gif|webp)(?:\?|$)/i.test(url);
      const name = escapeHtml(attachment.filename || "Pièce jointe");
      if (isImage) return `<a class="chat-attachment image" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer"><img src="${escapeHtml(url)}" alt="${name}" loading="lazy"><span>${name}</span></a>`;
      return `<a class="chat-attachment file" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer"><span class="attachment-icon" aria-hidden="true">↗</span><span>${name}</span></a>`;
    }).join("");
    return items ? `<div class="chat-attachments">${items}</div>` : "";
  };

  const renderConversation = (messages) => {
    const sorted = [...(Array.isArray(messages) ? messages : [])].sort((a, b) => new Date(a.timestamp || 0) - new Date(b.timestamp || 0));
    if (!sorted.length) return '<div class="empty-state">Aucune réponse dans ce dépôt pour le moment.</div>';
    let previousDay = "";
    return sorted.map((message) => {
      const identity = messageIdentity(message);
      const currentDay = dayKey(message.timestamp);
      const daySeparator = currentDay !== previousDay ? `<div class="chat-day"><span>${escapeHtml(formatDay(message.timestamp))}</span></div>` : "";
      previousDay = currentDay;
      const attachments = renderAttachments(message);
      if (identity.system) {
        return `${daySeparator}<div class="chat-system"><span aria-hidden="true">✓</span><p>${renderMessage(identity.content, message.mentions)}</p><time datetime="${escapeHtml(message.timestamp || "")}">${escapeHtml(formatTime(message.timestamp))}</time></div>`;
      }
      const avatar = identity.proxied ? "" : safeUrl(avatarUrl(message.author));
      return `${daySeparator}<article class="chat-message${identity.own ? " own" : ""}${identity.dossier ? " dossier" : ""}"><div class="chat-avatar">${avatar ? `<img src="${escapeHtml(avatar)}" alt="">` : escapeHtml(initials(identity.dossier ? "CPD" : identity.name))}</div><div class="chat-stack"><div class="chat-meta"><strong>${escapeHtml(identity.dossier ? "Dossier initial" : identity.name)}</strong>${identity.own ? '<span class="message-you">Vous</span>' : ""}<time datetime="${escapeHtml(message.timestamp || "")}">${escapeHtml(formatTime(message.timestamp))}</time></div><div class="chat-bubble">${identity.content ? `<div class="chat-copy">${renderMessage(identity.content, message.mentions)}</div>` : ""}${attachments}</div></div></article>`;
    }).join("");
  };

  const setStatus = (message, type) => {
    status.hidden = false;
    status.className = `status ${type || ""}`;
    status.innerHTML = message;
  };
  const updateCount = () => { counter.textContent = `${description.value.length} / 5000`; };
  description.addEventListener("input", updateCount);
  updateCount();

  const date = document.getElementById("complaint-date");
  if (date && !date.value) {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    date.value = now.toISOString().slice(0, 16);
  }

  const fileData = async (input) => Promise.all([...input.files].slice(0, 3).map((file) => new Promise((resolve, reject) => {
    if (file.size > 3 * 1024 * 1024) return reject(new Error("file_too_large"));
    const reader = new FileReader();
    reader.onload = () => resolve({ name: file.name, type: file.type || "application/octet-stream", data: String(reader.result).split(",")[1] || "" });
    reader.onerror = () => reject(new Error("file_read"));
    reader.readAsDataURL(file);
  })));

  async function prefillAgent() {
    try {
      const response = await fetch("/api/auth/session", { credentials: "same-origin", cache: "no-store" });
      const data = await response.json();
      const name = data.user?.globalName || data.user?.username || "";
      const parts = name.trim().split(/\s+/);
      const first = form.elements.authorFirstName;
      const last = form.elements.authorLastName;
      if (first && !first.value) first.value = parts.shift() || "";
      if (last && !last.value) last.value = parts.join(" ") || "";
      if (data.user?.matricule && form.elements.authorBadge) form.elements.authorBadge.value = data.user.matricule;
    } catch { /* Session errors are handled by the API when the form is sent. */ }
  }
  prefillAgent();

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!description.value.trim()) {
      setStatus("La description des faits est obligatoire.", "error");
      description.focus();
      return;
    }
    button.disabled = true;
    setStatus("Transmission du dépôt…");
    try {
      const payload = Object.fromEntries(new FormData(form).entries());
      payload.attachments = await fileData(document.getElementById("complaint-attachments"));
      payload.mentions = complaintMentionPicker?.getIds() || [];
      const response = await fetch("/api/liaison/complaints", {
        method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload)
      });
      const data = await response.json().catch(() => ({}));
      if (response.status === 401) { location.href = "/auth/login.html?error=login_required"; return; }
      if (!response.ok) throw new Error(data.code || "discord_unavailable");
      setStatus(`Dépôt enregistré sous <strong>${escapeHtml(data.complaintId)}</strong>.`, "ok");
      form.reset();
      complaintMentionPicker?.clear();
      updateCount();
      prefillAgent();
      window.parent.postMessage({ type: "liaison-updated" }, location.origin);
    } catch (error) {
      const messages = {
        description_required: "La description des faits est obligatoire.",
        file_too_large: "Une pièce jointe dépasse 3 Mo.",
        forum_forbidden: "Le bot Discord n’a pas les droits nécessaires sur le forum.",
        discord_unavailable: "Discord est momentanément indisponible."
      };
      setStatus(messages[error.message] || "Impossible d’enregistrer le dépôt.", "error");
    } finally { button.disabled = false; }
  });

  const seen = () => JSON.parse(localStorage.getItem("liaisonSeen") || "{}");
  const saveSeen = (value) => localStorage.setItem("liaisonSeen", JSON.stringify(value));

  function renderThreads() {
    const query = search.value.trim().toLowerCase();
    const selectedStatus = statusFilter.value;
    const selectedTag = tagFilter.value;
    const seenMap = seen();
    const filtered = allThreads.filter((thread) => (
      (!query || `${thread.name} ${(thread.tags || []).join(" ")}`.toLowerCase().includes(query))
      && (selectedStatus === "all" || (selectedStatus === "archived") === Boolean(thread.archived))
      && (selectedTag === "all" || (thread.tags || []).includes(selectedTag))
    ));
    total.textContent = `(${filtered.length})`;
    threads.innerHTML = filtered.map((thread) => {
      const unread = thread.lastMessageId && seenMap[thread.id] !== thread.lastMessageId;
      const tags = (thread.tags || []).map((tag) => `<span>${escapeHtml(tag)}</span>`).join("") || "<span>Sans tag</span>";
      return `<button class="thread-card${unread ? " unread" : ""}${activeThreadId === thread.id ? " selected" : ""}" data-id="${escapeHtml(thread.id)}"><span class="thread-top"><strong>${escapeHtml(thread.name)}</strong>${unread ? "<i>Nouveau</i>" : ""}</span><span class="thread-bottom"><span class="thread-state ${thread.archived ? "archived" : "active"}">${thread.archived ? "Archivé" : "Actif"}</span><span class="thread-tags">${tags}</span></span></button>`;
    }).join("") || '<p class="empty-state">Aucun dépôt ne correspond à ces filtres.</p>';
    threads.querySelectorAll("[data-id]").forEach((threadButton) => {
      threadButton.onclick = () => loadDetail(threadButton.dataset.id);
    });
  }

  async function loadThreads() {
    threads.innerHTML = '<p class="empty-state">Chargement des dépôts…</p>';
    try {
      const response = await fetch("/api/liaison/complaints", { credentials: "same-origin", cache: "no-store" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) throw new Error(data.code || `server_error_${response.status}`);
      allThreads = data.threads || [];
      availableTags = data.availableTags || [];
      tagFilter.innerHTML = '<option value="all">Tous les tags</option>' + availableTags.map((tag) => `<option value="${escapeHtml(tag.name)}">${escapeHtml(tag.name)}</option>`).join("");
      renderThreads();
      if (data.archiveError) threads.insertAdjacentHTML("afterbegin", '<p class="warning">Certaines archives Discord sont inaccessibles.</p>');
    } catch (error) {
      threads.innerHTML = `<p class="warning">Impossible de charger les dépôts.<br><small>${escapeHtml(error.message)}</small></p>`;
    }
  }

  async function loadDetail(id) {
    activeThreadId = id;
    renderThreads();
    detail.hidden = false;
    detail.innerHTML = '<p class="empty-state">Chargement de la conversation…</p>';
    const response = await fetch(`/api/liaison/complaints?threadId=${encodeURIComponent(id)}`, { credentials: "same-origin", cache: "no-store" });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      detail.innerHTML = '<p class="warning">Impossible de charger ce fil.</p>';
      return;
    }
    if (data.viewer) viewer = { id: String(data.viewer.id || ""), displayName: String(data.viewer.displayName || "") };
    const seenMap = seen();
    if (data.thread?.last_message_id) seenMap[id] = data.thread.last_message_id;
    saveSeen(seenMap);
    window.parent.postMessage({ type: "liaison-updated" }, location.origin);
    const selected = data.thread?.applied_tags || [];
    const tagNames = selected.map((tagId) => availableTags.find((tag) => tag.id === tagId)?.name || tagId);
    const archived = Boolean(data.thread?.thread_metadata?.archived);

    detail.innerHTML = `
      <div class="detail-head">
        <div><span class="detail-kicker">DOSSIER GOUVERNEMENT</span><h3>${escapeHtml(data.thread?.name || "Dépôt")}</h3><div class="detail-tags">${tagNames.map((name) => `<span>${escapeHtml(name)}</span>`).join("") || "<span>Sans tag</span>"}</div></div>
        <span class="detail-state ${archived ? "archived" : ""}">${archived ? "Archivé" : "Actif"}</span>
      </div>
      <div class="detail-tools"><label>Statut / tags<select id="detail-tags" multiple size="${Math.min(4, Math.max(2, availableTags.length))}">${availableTags.map((tag) => `<option value="${escapeHtml(tag.id)}" ${selected.includes(tag.id) ? "selected" : ""}>${escapeHtml(tag.name)}</option>`).join("")}</select></label><button id="save-thread-tags" class="secondary" type="button">Enregistrer</button><span id="tag-status" role="status"></span></div>
      <div class="messages" role="log" aria-label="Messages du dépôt">${renderConversation(data.messages)}</div>
      <form id="thread-message-form" class="thread-composer">
        <div class="mention-picker" data-mention-picker><div class="mention-picker-head"><div><span class="detail-kicker">MENTIONS</span><strong>Notifier des agents</strong></div><span class="mention-count" data-mention-count>Aucun agent sélectionné</span></div><div class="mention-control"><input class="mention-search" data-mention-search type="search" autocomplete="off" placeholder="Rechercher un agent à notifier…"></div><div class="mention-selected" data-mention-selected></div><div class="mention-options" data-mention-options hidden></div><p class="mention-help" data-mention-help>Sélection facultative : les agents choisis recevront une mention Discord.</p></div>
        <div class="thread-compose-row"><textarea name="message" maxlength="1800" placeholder="Écrire une réponse dans ce dépôt…" aria-label="Réponse"></textarea><label class="thread-file" title="Ajouter une pièce jointe"><span aria-hidden="true">↥</span><span>Fichier</span><input name="files" type="file" multiple accept="image/*,.pdf,.txt,.doc,.docx"></label><button class="primary" type="submit"><span aria-hidden="true">➤</span> Envoyer</button></div>
        <span class="composer-status" aria-live="polite"></span>
      </form>`;

    const conversation = detail.querySelector(".messages");
    requestAnimationFrame(() => { conversation.scrollTop = conversation.scrollHeight; });
    const detailMentionPicker = window.CPDMentionPicker?.init(detail.querySelector("[data-mention-picker]"));

    document.getElementById("save-thread-tags").onclick = async () => {
      const tagStatus = document.getElementById("tag-status");
      const ids = [...document.getElementById("detail-tags").selectedOptions].map((option) => option.value);
      tagStatus.textContent = "Enregistrement…";
      try {
        const updateResponse = await fetch("/api/liaison/complaints", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "update", threadId: id, appliedTags: ids }) });
        if (!updateResponse.ok) throw new Error();
        tagStatus.textContent = "Enregistré";
        loadThreads();
      } catch { tagStatus.textContent = "Impossible de modifier les tags."; }
    };

    document.getElementById("thread-message-form").onsubmit = async (event) => {
      event.preventDefault();
      const composer = event.currentTarget;
      const send = composer.querySelector("button[type=submit]");
      const composeStatus = composer.querySelector(".composer-status");
      const message = composer.elements.message.value.trim();
      if (!message && !composer.elements.files.files.length) return;
      send.disabled = true;
      composeStatus.textContent = "Envoi…";
      try {
        const sendResponse = await fetch("/api/liaison/complaints", {
          method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ threadId: id, message, mentions: detailMentionPicker?.getIds() || [], attachments: await fileData(composer.elements.files) })
        });
        const sent = await sendResponse.json().catch(() => ({}));
        if (!sendResponse.ok) throw new Error(sent.code || "discord_unavailable");
        await loadDetail(id);
        loadThreads();
      } catch (error) {
        composeStatus.textContent = error.message === "file_too_large" ? "Fichier trop volumineux." : "Envoi impossible.";
      } finally { send.disabled = false; }
    };
  }

  tabs.forEach((tab) => {
    tab.onclick = () => {
      tabs.forEach((item) => {
        const active = item === tab;
        item.classList.toggle("active", active);
        item.setAttribute("aria-selected", String(active));
      });
      const isList = tab.dataset.tab === "list";
      form.hidden = isList;
      list.hidden = !isList;
      if (isList) loadThreads();
    };
  });
  [search, statusFilter, tagFilter].forEach((control) => {
    control.addEventListener("input", renderThreads);
    control.addEventListener("change", renderThreads);
  });
  document.getElementById("refresh-complaints").onclick = loadThreads;
})();
