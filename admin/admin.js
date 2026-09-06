(() => {
  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];
  const clone = value => JSON.parse(JSON.stringify(value));
  const esc = value => String(value ?? "").replace(/[&<>'"]/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
  }[char]));
  const validId = value => /^\d{17,20}$/.test(String(value || "").trim());
  const ids = value => [...new Set(String(value || "").split(/[\s,;]+/).map(item => item.trim()).filter(validId))];
  const menuIcons = {
    grid: "Grille", users: "Membres", chart: "Graphique", book: "Document",
    inbox: "Dossier", clock: "Horloge", radio: "Radio", list: "Liste"
  };
  const liaisonIcons = { inbox: "Dossier", radio: "Radio", users: "Membres", book: "Document", list: "Liste" };
  const menuDefaults = {
    mdtItems: [
      { key: "rapide", label: "Accès rapide", icon: "grid", enabled: true, sortOrder: 10 },
      { key: "procedures", label: "Procédures", icon: "book", enabled: true, sortOrder: 20 },
      { key: "radio", label: "Radio", icon: "radio", enabled: true, sortOrder: 30 },
      { key: "reglement", label: "Règlement", icon: "list", enabled: true, sortOrder: 40 },
      { key: "tenues", label: "Tenues", icon: "users", enabled: true, sortOrder: 50 },
      { key: "organigramme", label: "Organigramme", icon: "chart", enabled: true, sortOrder: 60 }
    ],
    academyItems: [
      { key: "pa", label: "Tableau de bord", icon: "grid", enabled: true, sortOrder: 10 },
      { key: "suivi", label: "Suivi pédagogique", icon: "chart", enabled: true, sortOrder: 20 },
      { key: "formations", label: "Formations", icon: "book", enabled: true, sortOrder: 30 },
      { key: "recrutements", label: "Recrutements", icon: "inbox", enabled: true, sortOrder: 40 },
      { key: "activite", label: "Historique", icon: "clock", enabled: true, sortOrder: 50 }
    ]
  };
  let state = { config: null, history: [], administrators: [], catalog: {}, meta: null, user: null, dirty: false };

  function notice(message, error = false) {
    const element = $("#notice");
    element.textContent = message;
    element.className = "notice" + (error ? " error" : "");
    element.hidden = false;
    clearTimeout(notice.timer);
    notice.timer = setTimeout(() => { element.hidden = true; }, 7000);
  }

  function markDirty() {
    state.dirty = true;
    $("#dirty").textContent = "Modifications non publiées";
  }

  async function json(url, options = {}) {
    const response = await fetch(url, { credentials: "same-origin", cache: "no-store", ...options });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.code || ("HTTP " + response.status));
    return data;
  }

  function serverOptions(selected) {
    return (state.config?.servers || []).map(server =>
      '<option value="' + esc(server.key) + '" ' + (server.key === selected ? "selected" : "") + ">" +
      esc(server.label) + " · " + esc(server.guildId || "ID manquant") + "</option>"
    ).join("");
  }

  function serverForKey(key) {
    return (state.config?.servers || []).find(server => server.key === key);
  }

  function catalogForKey(key) {
    const server = serverForKey(key);
    return server?.guildId ? state.catalog[server.guildId] : null;
  }

  function channelChoices(channel, mode = "liaison") {
    const catalog = catalogForKey(channel.guildKey);
    if (!catalog) {
      return '<option value="' + esc(channel.channelId || "") + '" selected>' +
        esc(channel.channelId || "Catalogue à charger") + "</option>";
    }
    let channels = Array.isArray(catalog.channels) ? catalog.channels : [];
    if (mode === "notification") channels = channels.filter(item => item.type !== "forum");
    if (mode === "forum") channels = channels.filter(item => item.type === "forum");
    if (mode === "text") channels = channels.filter(item => item.type !== "forum");
    const current = String(channel.channelId || "");
    let html = '<option value="">Choisir un salon Discord…</option>';
    if (current && !channels.some(item => String(item.id) === current)) {
      html += '<option value="' + esc(current) + '" selected>Salon actuel · ' + esc(current) + "</option>";
    }
    html += channels.map(item =>
      '<option value="' + esc(item.id) + '" ' + (String(item.id) === current ? "selected" : "") + ">" +
      "# " + esc(item.name) + " · " + esc(item.category || "Sans catégorie") + " · " +
      (item.type === "forum" ? "forum" : "texte") + "</option>"
    ).join("");
    return html;
  }

  async function loadCatalog(guildId) {
    if (!guildId) return null;
    if (state.catalog[guildId]) return state.catalog[guildId];
    const data = await json("/api/admin/discord-catalog?guildId=" + encodeURIComponent(guildId));
    state.catalog[guildId] = data;
    return data;
  }

  function renderServers() {
    $("#server-list").innerHTML = (state.config.servers || []).map((server, index) =>
      '<article class="server-card" data-server="' + index + '">' +
      '<div class="card-head"><strong>' + esc(server.label || "Serveur") + '</strong>' +
      '<button class="remove" data-remove-server type="button" ' + (state.config.servers.length < 2 ? "disabled" : "") + '>Retirer</button></div>' +
      '<div class="field-grid">' +
      '<label class="field">Nom affiché<input data-f="label" value="' + esc(server.label) + '" maxlength="80"></label>' +
      '<label class="field">Clé interne<input data-f="key" value="' + esc(server.key) + '" maxlength="40"></label>' +
      '<label class="field span-2">ID du serveur<input data-f="guildId" value="' + esc(server.guildId) + '" inputmode="numeric" maxlength="20"></label>' +
      '<label class="switch span-2"><input data-f="enabled" type="checkbox" ' + (server.enabled ? "checked" : "") + '> Serveur actif</label>' +
      "</div></article>"
    ).join("");
  }

  function renderLiaisons() {
    const channels = state.config.liaison.channels || [];
    const iconOptions = Object.entries(liaisonIcons).map(([value, label]) =>
      '<option value="' + value + '">' + label + "</option>"
    ).join("");
    $("#liaison-list").innerHTML = channels.map((channel, index) =>
      '<article class="liaison-card" data-liaison="' + index + '" data-disabled="' + (!channel.enabled) + '">' +
      '<div class="liaison-title"><div><span class="liaison-badge">LIAISON ' + String(index + 1).padStart(2, "0") + "</span>" +
      '<strong>' + esc(channel.label || "Nouvelle liaison") + "</strong><small>" + esc(channel.channelId || "Aucun salon sélectionné") + "</small></div>" +
      '<button class="remove" data-remove-liaison type="button">Supprimer</button></div>' +
      '<div class="liaison-form">' +
      '<label class="field">Nom dans le MDT<input data-f="label" value="' + esc(channel.label) + '" maxlength="90"></label>' +
      '<label class="field">Clé technique<input data-f="key" value="' + esc(channel.key) + '" maxlength="40"></label>' +
      '<label class="field">Serveur<select data-f="guildKey">' + serverOptions(channel.guildKey) + "</select></label>" +
      '<label class="field">Salon / forum<select data-f="channelId">' + channelChoices(channel, channel.type) + "</select></label>" +
      '<label class="field">Type<select data-f="type"><option value="text" ' + (channel.type === "text" ? "selected" : "") + '>Canal classique</option><option value="forum" ' + (channel.type === "forum" ? "selected" : "") + ">Forum</option></select></label>" +
      '<label class="field">Icône<select data-f="icon">' + Object.entries(liaisonIcons).map(([value, label]) =>
        '<option value="' + value + '" ' + (channel.icon === value ? "selected" : "") + ">" + label + "</option>"
      ).join("") + "</select></label>" +
      '<label class="field">Ordre<input data-f="sortOrder" type="number" min="0" max="9999" value="' + (Number(channel.sortOrder) || 0) + '"></label>' +
      '<div class="switches"><label class="switch"><input data-f="enabled" type="checkbox" ' + (channel.enabled ? "checked" : "") + "> Visible</label>" +
      '<label class="switch"><input data-f="canRead" type="checkbox" ' + (channel.canRead ? "checked" : "") + "> Lecture</label>" +
      '<label class="switch"><input data-f="canWrite" type="checkbox" ' + (channel.canWrite ? "checked" : "") + "> Écriture</label>" +
      '<label class="switch"><input data-f="canUpload" type="checkbox" ' + (channel.canUpload ? "checked" : "") + "> Fichiers</label>" +
      '<label class="switch"><input data-f="canMention" type="checkbox" ' + (channel.canMention ? "checked" : "") + "> Mentions</label></div>" +
      '<label class="field full">Rôles autorisés sur cette liaison<textarea data-f="allowedRoleIds" placeholder="Vide = tous les agents connectés">' + esc((channel.allowedRoleIds || []).join("\n")) + "</textarea></label>" +
      '<div class="span-2"><button class="button" data-load-liaison-roles type="button">Charger les rôles du serveur</button><div class="liaison-role-picker" data-liaison-role-picker></div></div>' +
      '<label class="field full">Utilisateurs autorisés individuellement<textarea data-f="allowedUserIds" placeholder="Un ID Discord par ligne">' + esc((channel.allowedUserIds || []).join("\n")) + "</textarea></label>" +
      "</div></article>"
    ).join("") || '<p class="empty">Aucune liaison. Ajoute la première rubrique du MDT.</p>';
  }

  function renderAccess() {
    const names = { police: "Connexion policier", academy: "Police Academy", admin: "Accès technique (secours)" };
    $("#access-list").innerHTML = Object.entries(state.config.access || {}).map(([key, access]) =>
      '<article class="access-card" data-access="' + key + '"><h3>' + esc(names[key] || access.label) + "</h3>" +
      '<div class="field-grid"><label class="field">Serveur contrôlé<select data-f="guildKey">' + serverOptions(access.guildKey) + "</select></label>" +
      '<label class="field">Condition<select data-f="mode"><option value="any" ' + (access.mode !== "all" ? "selected" : "") + '>Au moins un rôle</option><option value="all" ' + (access.mode === "all" ? "selected" : "") + ">Tous les rôles</option></select></label>" +
      '<label class="field span-2">Rôles autorisés<textarea data-f="roleIds" placeholder="Un ID par ligne">' + esc((access.roleIds || []).join("\n")) + "</textarea></label>" +
      '<label class="field span-2">IDs autorisés individuellement<textarea data-f="userIds" placeholder="Un ID par ligne">' + esc((access.userIds || []).join("\n")) + "</textarea></label>" +
      '<div class="span-2"><button class="button" data-load-roles type="button">Charger les rôles du serveur</button><div class="role-picker" data-role-picker></div></div>' +
      "</div></article>"
    ).join("");
  }

  function renderMenuEditor(id, key) {
    const items = state.config.ui?.[key] || menuDefaults[key] || [];
    const iconOptions = Object.entries(menuIcons).map(([value, label]) =>
      '<option value="' + value + '">' + label + "</option>"
    ).join("");
    $("#" + id).innerHTML = items.map((item, index) =>
      '<div class="menu-item-editor" data-menu-item="' + key + '" data-index="' + index + '">' +
      '<span class="menu-item-number">' + String(index + 1).padStart(2, "0") + "</span>" +
      '<label class="field">Libellé<input data-f="label" value="' + esc(item.label) + '" maxlength="70"></label>' +
      '<label class="field">Icône<select data-f="icon">' + iconOptions.replace('value="' + item.icon + '"', 'value="' + item.icon + '" selected') + "</select></label>" +
      '<label class="field menu-order">Ordre<input data-f="sortOrder" type="number" min="0" max="9999" value="' + (Number(item.sortOrder) || 0) + '"></label>' +
      '<label class="switch menu-visible"><input data-f="enabled" type="checkbox" ' + (item.enabled !== false ? "checked" : "") + "> Visible</label>" +
      "</div>"
    ).join("");
  }

  function renderGeneral() {
    const ui = state.config.ui || {};
    const sections = ui.sections || {};
    $("#site-title").value = ui.siteTitle || "";
    $("#department-name").value = ui.departmentName || "";
    $("#department-subtitle").value = ui.departmentSubtitle || "";
    $("#guide-url").value = ui.guideUrl || "";
    ["mdt", "academy", "liaison"].forEach(key => {
      const card = $('[data-section="' + key + '"]');
      const section = sections[key] || {};
      card.querySelector('[data-f="label"]').value = section.label || "";
      card.querySelector('[data-f="enabled"]').checked = section.enabled !== false;
      card.querySelector('[data-f="open"]').checked = section.open !== false;
    });
    renderMenuEditor("mdt-menu-editor", "mdtItems");
    renderMenuEditor("academy-menu-editor", "academyItems");
    const notifications = state.config.notifications || {};
    $("#show-badges").checked = notifications.showBadges !== false;
    $("#show-academy-badge").checked = notifications.showAcademyBadge !== false;
    $("#show-liaison-badge").checked = notifications.showLiaisonBadge !== false;
    $("#refresh-seconds").value = Number(notifications.refreshSeconds) || 15;
  }

  function renderLiaisonSettings() {
    const liaison = state.config.liaison || {};
    $("#section-label").value = liaison.sectionLabel || "";
    const channels = liaison.channels || [];
    $("#complaint-key").innerHTML = channels.filter(channel => channel.type === "forum").map(channel =>
      '<option value="' + esc(channel.key) + '" ' + (channel.key === liaison.complaintKey ? "selected" : "") + ">" +
      esc(channel.label) + " · " + esc(channel.channelId) + "</option>"
    ).join("") || '<option value="">Aucun forum configuré</option>';
    const limits = liaison.limits || {};
    $("#message-max-length").value = Math.min(1800, Number(limits.messageMaxLength) || 1800);
    $("#max-attachments").value = Number.isFinite(Number(limits.maxAttachments)) ? Number(limits.maxAttachments) : 3;
    $("#max-attachment-mb").value = Number(limits.maxAttachmentMb) || 3;
    $("#max-total-upload-mb").value = Number(limits.maxTotalUploadMb) || 8;
    $("#forum-auto-archive").value = String(Number(limits.forumAutoArchiveMinutes) || 10080);
  }

  function renderRecruitment() {
    const recruitment = state.config.recruitment || {};
    $("#recruitment-enabled").checked = recruitment.enabled !== false;
    $("#recruitment-notification-enabled").checked = recruitment.notificationEnabled !== false;
    $("#recruitment-title").value = recruitment.title || "";
    $("#recruitment-intro").value = recruitment.intro || "";
    $("#recruitment-closed-message").value = recruitment.closedMessage || "";
    $("#recruitment-submit-label").value = recruitment.submitLabel || "";
    $("#recruitment-notification-guild").innerHTML = serverOptions(recruitment.notificationGuildKey);
    $("#recruitment-notification-channel").innerHTML = channelChoices({
      guildKey: recruitment.notificationGuildKey,
      channelId: recruitment.notificationChannelId
    }, "notification");
  }

  function renderAdmins() {
    $("#admin-list").innerHTML = state.administrators.map(admin =>
      '<div class="admin-row"><div><strong>' + esc(admin.displayName || admin.discordId) + "</strong><small>" +
      esc(admin.discordId) + (admin.owner ? " · propriétaire" : " · accès ajouté depuis le panel") + "</small></div>" +
      (admin.owner ? '<span class="owner-label">PROPRIÉTAIRE</span>' :
        '<button class="remove" data-remove-admin="' + esc(admin.discordId) + '" type="button">Révoquer</button>') +
      "</div>"
    ).join("") || '<p class="empty">Aucun administrateur supplémentaire.</p>';
  }

  function renderHistory() {
    $("#history-list").innerHTML = state.history.length ? state.history.map(history =>
      '<div class="history-row"><div><strong>Version ' + esc(history.version) + "</strong><small>" +
      esc(history.summary || "Modification") + " · " + esc(history.changedByName || "Système") + " · " +
      new Date(history.createdAt).toLocaleString("fr-FR") + '</small></div><button class="button" data-restore="' +
      esc(history.id) + '" type="button">Restaurer</button></div>'
    ).join("") : '<p class="empty">Aucune ancienne version.</p>';
  }

  function renderMeta() {
    $("#version").textContent = state.meta?.version ?? "—";
    $("#stat-version").textContent = state.meta?.version ?? "—";
    $("#updated").textContent = state.meta?.updatedAt
      ? (state.meta.updatedByName || "Administrateur") + " · " + new Date(state.meta.updatedAt).toLocaleString("fr-FR")
      : "Configuration initiale";
    $("#actor-name").textContent = state.user?.displayName || "Administrateur";
    $("#stat-servers").textContent = state.config.servers.length;
    $("#stat-liaisons").textContent = state.config.liaison.channels.filter(channel => channel.enabled).length;
    $("#stat-admins").textContent = state.administrators.length;
  }

  function render() {
    renderGeneral();
    renderLiaisonSettings();
    renderServers();
    renderLiaisons();
    renderAccess();
    renderRecruitment();
    renderAdmins();
    renderHistory();
    renderMeta();
    state.dirty = false;
    $("#dirty").textContent = "Aucune modification en attente";
  }

  function collectMenuItems(key) {
    const previous = state.config.ui?.[key] || [];
    return $$('[data-menu-item="' + key + '"]').map(card => {
      const old = previous[Number(card.dataset.index)] || {};
      return {
        key: old.key || "",
        label: card.querySelector('[data-f="label"]').value,
        icon: card.querySelector('[data-f="icon"]').value,
        sortOrder: Number(card.querySelector('[data-f="sortOrder"]').value) || 0,
        enabled: card.querySelector('[data-f="enabled"]').checked
      };
    });
  }

  function collect() {
    const config = clone(state.config);
    config.servers = $$("[data-server]").map(card => ({
      key: card.querySelector('[data-f="key"]').value,
      label: card.querySelector('[data-f="label"]').value,
      guildId: card.querySelector('[data-f="guildId"]').value,
      enabled: card.querySelector('[data-f="enabled"]').checked
    }));
    config.liaison = { ...config.liaison };
    config.liaison.sectionLabel = $("#section-label").value;
    config.liaison.complaintKey = $("#complaint-key").value;
    config.liaison.limits = {
      messageMaxLength: Number($("#message-max-length").value),
      maxAttachments: Number($("#max-attachments").value),
      maxAttachmentMb: Number($("#max-attachment-mb").value),
      maxTotalUploadMb: Number($("#max-total-upload-mb").value),
      forumAutoArchiveMinutes: Number($("#forum-auto-archive").value)
    };
    config.liaison.channels = $$("[data-liaison]").map(card => {
      const read = name => card.querySelector('[data-f="' + name + '"]');
      return {
        key: read("key").value,
        label: read("label").value,
        channelId: read("channelId").value,
        guildKey: read("guildKey").value,
        type: read("type").value,
        icon: read("icon").value,
        sortOrder: Number(read("sortOrder").value) || 0,
        enabled: read("enabled").checked,
        canRead: read("canRead").checked,
        canWrite: read("canWrite").checked,
        canUpload: read("canUpload").checked,
        canMention: read("canMention").checked,
        allowedRoleIds: ids(read("allowedRoleIds").value),
        allowedUserIds: ids(read("allowedUserIds").value)
      };
    });
    config.access = {};
    $$("[data-access]").forEach(card => {
      const key = card.dataset.access;
      const read = name => card.querySelector('[data-f="' + name + '"]');
      config.access[key] = {
        label: state.config.access[key]?.label || key,
        guildKey: read("guildKey").value,
        mode: read("mode").value,
        roleIds: ids(read("roleIds").value),
        userIds: ids(read("userIds").value)
      };
    });
    const sections = {};
    $$("[data-section]").forEach(card => {
      sections[card.dataset.section] = {
        label: card.querySelector('[data-f="label"]').value,
        enabled: card.querySelector('[data-f="enabled"]').checked,
        open: card.querySelector('[data-f="open"]').checked
      };
    });
    config.ui = {
      siteTitle: $("#site-title").value,
      departmentName: $("#department-name").value,
      departmentSubtitle: $("#department-subtitle").value,
      guideUrl: $("#guide-url").value,
      sections,
      mdtItems: collectMenuItems("mdtItems"),
      academyItems: collectMenuItems("academyItems")
    };
    config.notifications = {
      showBadges: $("#show-badges").checked,
      showAcademyBadge: $("#show-academy-badge").checked,
      showLiaisonBadge: $("#show-liaison-badge").checked,
      refreshSeconds: Number($("#refresh-seconds").value)
    };
    config.recruitment = {
      enabled: $("#recruitment-enabled").checked,
      notificationEnabled: $("#recruitment-notification-enabled").checked,
      title: $("#recruitment-title").value,
      intro: $("#recruitment-intro").value,
      closedMessage: $("#recruitment-closed-message").value,
      submitLabel: $("#recruitment-submit-label").value,
      notificationGuildKey: $("#recruitment-notification-guild").value,
      notificationChannelId: $("#recruitment-notification-channel").value
    };
    return config;
  }

  async function load() {
    const data = await json("/api/admin/configuration");
    state = {
      ...state,
      config: data.config,
      history: data.history || [],
      administrators: data.administrators || [],
      meta: data.meta,
      user: data.user,
      catalog: {}
    };
    await Promise.all(state.config.servers.filter(server => server.guildId).map(server =>
      loadCatalog(server.guildId).catch(() => null)
    ));
    render();
  }

  async function save() {
    try {
      await json("/api/admin/configuration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          operation: "save",
          config: collect(),
          summary: $("#summary").value
        })
      });
      $("#summary").value = "";
      notice("Configuration publiée. Les nouveaux réglages sont actifs.");
      await load();
    } catch (error) {
      notice("Impossible de publier : " + error.message, true);
    }
  }

  async function diagnostic() {
    const button = $('[data-action="diagnostic"]');
    button.disabled = true;
    $("#diagnostic-results").innerHTML = '<p class="empty">Tests Discord en cours…</p>';
    try {
      const data = await json("/api/admin/discord-diagnostic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config: collect() })
      });
      $("#diag-bot").textContent = data.botConfigured ? "Configuré" : "Manquant";
      $("#diag-bot").className = data.botConfigured ? "status-ok" : "status-error";
      $("#diag-db").textContent = data.databaseConfigured ? "Configurée" : "Manquante";
      $("#diag-db").className = data.databaseConfigured ? "status-ok" : "status-error";
      $("#diag-duration").textContent = (data.durationMs || 0) + " ms";
      const rows = [...(data.servers || []).map(item => ({ ...item, kind: "Serveur" })),
        ...(data.channels || []).map(item => ({ ...item, kind: item.type === "forum" ? "Forum" : "Canal" }))];
      $("#diagnostic-results").innerHTML = rows.map(item =>
        '<div class="diagnostic-row"><div><strong>' + esc(item.kind) + " · " + esc(item.label) + "</strong><small>" +
        esc(item.discordName || item.id) + (item.readStatus ? " · lecture " + esc(item.readStatus) : "") +
        '</small></div><span class="' + (item.ok ? "status-ok" : "status-error") + '">' +
        (item.ok ? "Opérationnel" : esc(item.code || "Erreur") + " · HTTP " + (item.status || "—")) + "</span></div>"
      ).join("") || '<p class="empty">Aucun élément à tester.</p>';
    } catch (error) {
      notice("Diagnostic impossible : " + error.message, true);
    } finally {
      button.disabled = false;
    }
  }

  async function addAdmin() {
    const id = $("#admin-id").value.trim();
    if (!validId(id)) return notice("Entre un ID Discord valide de 17 à 20 chiffres.", true);
    try {
      await json("/api/admin/configuration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ operation: "add-admin", discordId: id })
      });
      $("#admin-id").value = "";
      notice("Accès administrateur ajouté.");
      await load();
    } catch (error) {
      notice("Impossible d’ajouter cet accès : " + error.message, true);
    }
  }

  async function loadRoles(card) {
    const guild = serverForKey(card.querySelector('[data-f="guildKey"]').value);
    if (!guild?.guildId) return notice("Renseigne d’abord l’ID du serveur Discord.", true);
    try {
      const catalog = await loadCatalog(guild.guildId);
      card.querySelector("[data-role-picker]").innerHTML =
        '<select data-role-choice><option value="">Ajouter un rôle…</option>' +
        (catalog.roles || []).filter(role => !role.managed).map(role =>
          '<option value="' + esc(role.id) + '">' + esc(role.name) + "</option>"
        ).join("") + "</select>";
    } catch (error) {
      notice("Catalogue indisponible : " + error.message, true);
    }
  }

  async function loadLiaisonRoles(card) {
    const guild = serverForKey(card.querySelector('[data-f="guildKey"]').value);
    if (!guild?.guildId) return notice("Renseigne d’abord l’ID du serveur Discord.", true);
    try {
      const catalog = await loadCatalog(guild.guildId);
      card.querySelector("[data-liaison-role-picker]").innerHTML =
        '<select data-liaison-role-choice><option value="">Ajouter un rôle…</option>' +
        (catalog.roles || []).filter(role => !role.managed).map(role =>
          '<option value="' + esc(role.id) + '">' + esc(role.name) + "</option>"
        ).join("") + "</select>";
    } catch (error) {
      notice("Catalogue indisponible : " + error.message, true);
    }
  }

  function addServer() {
    state.config = clone(state.config);
    let index = state.config.servers.length + 1;
    let key = "server-" + index;
    while (state.config.servers.some(server => server.key === key)) key = "server-" + (++index);
    state.config.servers.push({ key, label: "Nouveau serveur", guildId: "", enabled: true });
    renderServers();
    renderLiaisons();
    renderAccess();
    renderRecruitment();
    markDirty();
  }

  function addLiaison() {
    state.config = clone(state.config);
    let index = state.config.liaison.channels.length + 1;
    let key = "liaison-" + index;
    while (state.config.liaison.channels.some(channel => channel.key === key)) key = "liaison-" + (++index);
    state.config.liaison.channels.push({
      key, label: "Nouvelle liaison", channelId: "", guildKey: state.config.servers[0]?.key || "",
      type: "text", icon: "users", enabled: true, canRead: true, canWrite: true,
      canUpload: true, canMention: true, allowedRoleIds: [], allowedUserIds: [],
      sortOrder: (state.config.liaison.channels.length + 1) * 10
    });
    renderLiaisonSettings();
    renderLiaisons();
    markDirty();
  }

  document.addEventListener("click", async event => {
    const tab = event.target.closest("[data-tab]");
    if (tab) {
      $$("[data-tab]").forEach(item => item.classList.toggle("active", item === tab));
      $$("[data-panel]").forEach(item => item.classList.toggle("active", item.dataset.panel === tab.dataset.tab));
      return;
    }
    const action = event.target.closest("[data-action]")?.dataset.action;
    if (action === "save") return save();
    if (action === "reload" || action === "refresh") return load().catch(error => notice(error.message, true));
    if (action === "add-admin") return addAdmin();
    if (action === "diagnostic") return diagnostic();
    if (action === "add-server") return addServer();
    if (action === "add-channel") return addLiaison();
    const removeLiaison = event.target.closest("[data-remove-liaison]");
    if (removeLiaison) {
      if (!confirm("Supprimer cette liaison de la prochaine configuration ?")) return;
      const index = Number(removeLiaison.closest("[data-liaison]").dataset.liaison);
      state.config = clone(state.config);
      state.config.liaison.channels.splice(index, 1);
      renderLiaisonSettings();
      renderLiaisons();
      markDirty();
      return;
    }
    const removeServer = event.target.closest("[data-remove-server]");
    if (removeServer) {
      if (state.config.servers.length < 2) return notice("Garde au moins un serveur configuré.", true);
      if (!confirm("Retirer ce serveur de la configuration ?")) return;
      const index = Number(removeServer.closest("[data-server]").dataset.server);
      state.config = clone(state.config);
      state.config.servers.splice(index, 1);
      renderServers();
      renderLiaisons();
      renderAccess();
      renderRecruitment();
      markDirty();
      return;
    }
    const removeAdmin = event.target.closest("[data-remove-admin]");
    if (removeAdmin && confirm("Révoquer cet accès administrateur ?")) {
      try {
        await json("/api/admin/configuration", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ operation: "remove-admin", discordId: removeAdmin.dataset.removeAdmin })
        });
        notice("Accès révoqué.");
        await load();
      } catch (error) {
        notice("Impossible de révoquer : " + error.message, true);
      }
      return;
    }
    const restore = event.target.closest("[data-restore]");
    if (restore && confirm("Restaurer cette version ? La version actuelle sera conservée.")) {
      try {
        await json("/api/admin/configuration", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ operation: "restore", historyId: restore.dataset.restore })
        });
        notice("Version restaurée.");
        await load();
      } catch (error) {
        notice("Restauration impossible : " + error.message, true);
      }
      return;
    }
    const loadRoleButton = event.target.closest("[data-load-roles]");
    if (loadRoleButton) return loadRoles(loadRoleButton.closest("[data-access]"));
    const loadLiaisonRoleButton = event.target.closest("[data-load-liaison-roles]");
    if (loadLiaisonRoleButton) return loadLiaisonRoles(loadLiaisonRoleButton.closest("[data-liaison]"));
  });

  document.addEventListener("change", async event => {
    const target = event.target;
    if (target.matches('[data-role-choice]') && target.value) {
      const card = target.closest("[data-access]");
      const roles = card.querySelector('[data-f="roleIds"]');
      roles.value = [...ids(roles.value), target.value].join("\n");
      target.value = "";
      markDirty();
      return;
    }
    if (target.matches('[data-liaison-role-choice]') && target.value) {
      const card = target.closest("[data-liaison]");
      const roles = card.querySelector('[data-f="allowedRoleIds"]');
      roles.value = [...ids(roles.value), target.value].join("\n");
      target.value = "";
      markDirty();
      return;
    }
    if (target.matches('[data-f="guildKey"]') && target.closest("[data-liaison]")) {
      const card = target.closest("[data-liaison]");
      const index = Number(card.dataset.liaison);
      const original = state.config.liaison.channels[index] || {};
      const channelSelect = card.querySelector('[data-f="channelId"]');
      try {
        await loadCatalog(serverForKey(target.value)?.guildId);
        channelSelect.innerHTML = channelChoices({ ...original, guildKey: target.value, channelId: "" });
      } catch (error) {
        notice("Impossible de charger les salons : " + error.message, true);
      }
    }
    if (target.matches('[data-f="type"]') && target.closest("[data-liaison]")) {
      const card = target.closest("[data-liaison]");
      const channelSelect = card.querySelector('[data-f="channelId"]');
      channelSelect.innerHTML = channelChoices({ guildKey: card.querySelector('[data-f="guildKey"]').value, channelId: "" }, target.value);
    }
    if (target.id === "recruitment-notification-guild") {
      try {
        await loadCatalog(serverForKey(target.value)?.guildId);
        $("#recruitment-notification-channel").innerHTML = channelChoices({ guildKey: target.value, channelId: "" }, "notification");
      } catch (error) {
        notice("Impossible de charger les salons : " + error.message, true);
      }
    }
    if (target.closest(".tab")) markDirty();
  });

  document.addEventListener("input", event => {
    if (event.target.closest(".tab")) markDirty();
  });
  window.addEventListener("beforeunload", event => {
    if (!state.dirty) return;
    event.preventDefault();
    event.returnValue = "";
  });
  load().catch(error => notice("Impossible de charger le panel : " + error.message, true));
})();
