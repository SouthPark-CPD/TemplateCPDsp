(() => {
  const body = document.body;
  const channelId = String(body.dataset.channelId || "");
  const fallbackLabel = String(body.dataset.channelLabel || "Canal de liaison");
  const messagesNode = document.getElementById("channel-messages");
  const channelNameNode = document.getElementById("channel-name");
  const channelMetaNode = document.getElementById("channel-meta");
  const refreshButton = document.getElementById("channel-refresh");
  const moreButton = document.getElementById("channel-more");
  const composer = document.getElementById("channel-composer");
  const messageInput = document.getElementById("channel-message");
  const filesInput = document.getElementById("channel-files");
  const fileList = document.getElementById("channel-file-list");
  const sendButton = document.getElementById("channel-send");
  const statusNode = document.getElementById("channel-compose-status");
  const mentionPicker = window.CPDMentionPicker?.init(document.querySelector("[data-mention-picker]"));
  let messages = [];
  let nextBefore = "";
  let hasMore = false;
  let loading = false;

  const escapeHtml = (value) => String(value ?? "").replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
  }[character]));
  const safeUrl = (value) => {
    try {
      const url = new URL(String(value || ""));
      return /^https?:$/.test(url.protocol) ? url.href : "";
    } catch { return ""; }
  };
  const formatTime = (value) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(date);
  };
  const initials = (name) => String(name || "CPD").trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "CPD";
  const authorName = (author) => author?.global_name || author?.globalName || author?.username || "Agent CPD";
  const avatarUrl = (author) => {
    if (!author?.id || !author?.avatar) return "";
    const extension = String(author.avatar).startsWith("a_") ? "gif" : "png";
    return `https://cdn.discordapp.com/avatars/${encodeURIComponent(author.id)}/${encodeURIComponent(author.avatar)}.${extension}?size=64`;
  };
  const renderText = (value, mentions = []) => {
    const mentionMap = new Map((Array.isArray(mentions) ? mentions : []).map((member) => [String(member.id), `@${authorName(member)}`]));
    const normalized = String(value ?? "").replace(/<@!?(\d+)>/g, (_, id) => mentionMap.get(id) || `@${id}`);
    const text = escapeHtml(normalized);
    const withBold = text.replace(/\*\*([^*\n]{1,120})\*\*/g, "<strong>$1</strong>");
    return withBold.replace(/(https?:\/\/[^\s<]+)/g, (match) => {
      const url = safeUrl(match);
      return url ? `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${match}</a>` : match;
    });
  };
  const fileData = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve({ name: file.name, type: file.type || "application/octet-stream", data: reader.result });
    reader.onerror = () => reject(new Error("file_read"));
    reader.readAsDataURL(file);
  });

  function render() {
    if (!messages.length) {
      messagesNode.innerHTML = '<p class="channel-empty">Aucun message dans ce canal pour le moment.</p>';
    } else {
      const sorted = [...messages].sort((a, b) => new Date(a.timestamp || 0) - new Date(b.timestamp || 0));
      messagesNode.innerHTML = sorted.map((message) => {
        const author = authorName(message.author);
        const avatar = safeUrl(avatarUrl(message.author));
        const attachments = Array.isArray(message.attachments) ? message.attachments : [];
        const embeds = Array.isArray(message.embeds) ? message.embeds : [];
        const attachmentHtml = attachments.map((attachment) => {
          const url = safeUrl(attachment.url);
          if (!url) return "";
          const isImage = String(attachment.content_type || attachment.type || "").startsWith("image/") || /\.(?:png|jpe?g|gif|webp)(?:\?|$)/i.test(url);
          return `<a class="message-attachment" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${isImage ? `<img src="${escapeHtml(url)}" alt="${escapeHtml(attachment.filename || "Image jointe")}" loading="lazy">` : ""}<span>↗ ${escapeHtml(attachment.filename || "Pièce jointe")}</span></a>`;
        }).join("");
        const embedHtml = embeds.slice(0, 3).map((embed) => {
          const url = safeUrl(embed.url);
          const image = safeUrl(embed.image?.url || embed.thumbnail?.url);
          const title = escapeHtml(embed.title || "");
          const description = escapeHtml(embed.description || "");
          if (!title && !description && !url && !image) return "";
          return `<div class="message-embed">${title ? `<strong>${title}</strong>` : ""}${description ? `<div>${description}</div>` : ""}${image ? `<img src="${escapeHtml(image)}" alt="" loading="lazy">` : ""}${url ? `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">Ouvrir le lien ↗</a>` : ""}</div>`;
        }).join("");
        return `<article class="message-card"><div class="message-avatar">${avatar ? `<img src="${escapeHtml(avatar)}" alt="">` : escapeHtml(initials(author))}</div><div><div class="message-head"><span class="message-author">${escapeHtml(author)}</span><time class="message-time" datetime="${escapeHtml(message.timestamp || "")}">${escapeHtml(formatTime(message.timestamp))}</time></div>${message.content ? `<p class="message-content">${renderText(message.content, message.mentions)}</p>` : ""}${attachmentHtml || embedHtml ? `<div class="message-attachments">${attachmentHtml}${embedHtml}</div>` : ""}</div></article>`;
      }).join("");
      messagesNode.scrollTop = messagesNode.scrollHeight;
    }
    moreButton.hidden = !hasMore;
  }

  function setStatus(text, type = "") {
    statusNode.textContent = text;
    statusNode.className = `compose-status${type ? ` ${type}` : ""}`;
  }

  async function load(reset = true) {
    if (loading || !channelId) return;
    loading = true;
    refreshButton.disabled = true;
    if (reset) {
      messagesNode.innerHTML = '<p class="channel-placeholder">Chargement des messages…</p>';
      nextBefore = "";
    }
    try {
      const query = new URLSearchParams({ channelId, limit: "100" });
      if (!reset && nextBefore) query.set("before", nextBefore);
      const response = await fetch(`/api/liaison/complaints?${query.toString()}`, { credentials: "same-origin", cache: "no-store" });
      const data = await response.json().catch(() => ({}));
      if (response.status === 401) { location.assign("/auth/login.html?error=login_required"); return; }
      if (!response.ok || !data.ok) throw new Error(data.code || "discord_unavailable");
      if (reset) messages = Array.isArray(data.messages) ? data.messages : [];
      else messages = [...messages, ...(Array.isArray(data.messages) ? data.messages : [])];
      hasMore = data.hasMore === true;
      nextBefore = String(data.nextBefore || "");
      channelNameNode.textContent = data.channel?.name || fallbackLabel;
      channelMetaNode.textContent = `${messages.length}${hasMore ? "+" : ""} message${messages.length > 1 ? "s" : ""} · actualisé à l’instant`;
      render();
      window.parent?.postMessage({ type: "liaison-updated", channelId }, location.origin);
    } catch (error) {
      messagesNode.innerHTML = `<p class="channel-placeholder channel-error">Impossible de charger les messages.<br><small>${escapeHtml(error.message || "discord_unavailable")}</small></p>`;
      channelMetaNode.textContent = "Canal indisponible";
    } finally {
      loading = false;
      refreshButton.disabled = false;
    }
  }

  filesInput.addEventListener("change", () => {
    const files = [...filesInput.files];
    if (files.length > 3 || files.some((file) => file.size > 3 * 1024 * 1024)) {
      filesInput.value = "";
      fileList.textContent = "Maximum : 3 fichiers de 3 Mo chacun.";
      return;
    }
    fileList.textContent = files.length ? files.map((file) => `${file.name} (${Math.ceil(file.size / 1024)} Ko)`).join(" · ") : "";
  });
  refreshButton.addEventListener("click", () => load(true));
  moreButton.addEventListener("click", () => load(false));
  composer.addEventListener("submit", async (event) => {
    event.preventDefault();
    const content = messageInput.value.trim();
    const files = [...filesInput.files];
    if (!content && !files.length) { setStatus("Écrivez un message ou ajoutez une pièce jointe.", "error"); return; }
    if (files.length > 3 || files.some((file) => file.size > 3 * 1024 * 1024) || files.reduce((sum, file) => sum + file.size, 0) > 8 * 1024 * 1024) { setStatus("Pièces jointes limitées à 3 fichiers et 8 Mo au total.", "error"); return; }
    sendButton.disabled = true;
    setStatus("Envoi en cours…");
    try {
      const attachments = await Promise.all(files.map(fileData));
      const response = await fetch("/api/liaison/complaints", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ channelId, message: content, attachments, mentions: mentionPicker?.getIds() || [] }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) throw new Error(data.code || "discord_unavailable");
      messageInput.value = "";
      filesInput.value = "";
      fileList.textContent = "";
      setStatus("Message envoyé.", "ok");
      await load(true);
      messageInput.focus();
    } catch (error) {
      setStatus(error.message === "file_too_large" ? "Fichier trop volumineux." : "Impossible d’envoyer le message.", "error");
    } finally { sendButton.disabled = false; }
  });
  load(true);
})();
