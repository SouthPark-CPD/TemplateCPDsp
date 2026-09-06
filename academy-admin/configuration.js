(() => {
  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];
  const escape = value => String(value ?? "").replace(/[&<>'"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]));
  const ids = value => [...new Set(String(value || "").split(/[\s,;]+/).map(v => v.trim()).filter(v => /^\d{17,20}$/.test(v)))];
  let config = null;
  let history = [];
  let dirty = false;

  function alert(message, error = false) { const node = $("#config-alert"); node.textContent = message; node.className = `config-alert${error ? " error" : ""}`; node.hidden = false; clearTimeout(alert.timer); alert.timer = setTimeout(() => node.hidden = true, 6000); }
  function markDirty() { dirty = true; $("#dirty-state").textContent = "Modifications non publiées"; renderMenuPreview(); }
  function serverOptions(selected) { return config.servers.map(s => `<option value="${escape(s.key)}" ${s.key === selected ? "selected" : ""}>${escape(s.label)}</option>`).join(""); }

  function renderServers() {
    $("#server-list").innerHTML = config.servers.map((server, index) => `<article class="server-card" data-server="${index}"><div class="card-head"><strong>${escape(server.label)}</strong><button class="mini danger" data-remove-server type="button" ${config.servers.length === 1 ? "disabled" : ""}>Retirer</button></div><div class="field-grid"><label class="field">Clé interne<input data-field="key" value="${escape(server.key)}" maxlength="40"></label><label class="field">Nom affiché<input data-field="label" value="${escape(server.label)}" maxlength="80"></label><label class="field span-2">Identifiant du serveur Discord<input data-field="guildId" value="${escape(server.guildId)}" inputmode="numeric" maxlength="20"></label><label class="switch span-2"><input data-field="enabled" type="checkbox" ${server.enabled ? "checked" : ""}> Serveur actif</label></div></article>`).join("");
  }

  function renderChannels() {
    $("#channel-list").innerHTML = config.liaison.channels.map((channel, index) => `<article class="channel-card" data-channel="${index}"><div class="channel-title"><strong>${escape(channel.label)}</strong><button class="mini danger" data-remove-channel type="button">Retirer</button></div><label class="field">Clé<input data-field="key" value="${escape(channel.key)}" maxlength="40"></label><label class="field">Nom dans le MDT<input data-field="label" value="${escape(channel.label)}" maxlength="90"></label><label class="field">Type<select data-field="type"><option value="text" ${channel.type === "text" ? "selected" : ""}>Canal classique</option><option value="forum" ${channel.type === "forum" ? "selected" : ""}>Forum / plaintes</option></select></label><label class="field">Serveur<select data-field="guildKey">${serverOptions(channel.guildKey)}</select></label><label class="field">Ordre<input data-field="sortOrder" type="number" min="0" max="9999" value="${Number(channel.sortOrder)}"></label><label class="field span-2">Identifiant du canal Discord<input data-field="channelId" value="${escape(channel.channelId)}" maxlength="20" inputmode="numeric"></label><label class="field">Icône<select data-field="icon"><option value="inbox">Dossier</option><option value="radio">Radio</option><option value="users">Membres</option><option value="book">Document</option><option value="list">Liste</option></select></label><div class="channel-options"><label class="switch"><input data-field="enabled" type="checkbox" ${channel.enabled ? "checked" : ""}> Visible</label><label class="switch"><input data-field="canRead" type="checkbox" ${channel.canRead ? "checked" : ""}> Lecture</label><label class="switch"><input data-field="canWrite" type="checkbox" ${channel.canWrite ? "checked" : ""}> Écriture</label><label class="switch"><input data-field="canUpload" type="checkbox" ${channel.canUpload ? "checked" : ""}> Fichiers</label><label class="switch"><input data-field="canMention" type="checkbox" ${channel.canMention ? "checked" : ""}> Mentions</label></div></article>`).join("");
    $$("[data-channel]").forEach((card, index) => card.querySelector('[data-field="icon"]').value = config.liaison.channels[index].icon);
  }

  function renderAccess() {
    const titles = { police: "Connexion policier", academy: "Police Academy", admin: "Administration du MDT" };
    $("#access-list").innerHTML = Object.entries(config.access).map(([key, access]) => `<article class="access-card" data-access="${escape(key)}"><div class="card-head"><strong>${titles[key] || escape(access.label)}</strong><span>${key === "admin" ? "Sensible" : "Accès"}</span></div><div class="field-grid"><label class="field">Serveur contrôlé<select data-field="guildKey">${serverOptions(access.guildKey)}</select></label><label class="field">Condition<select data-field="mode"><option value="any" ${access.mode !== "all" ? "selected" : ""}>Au moins un rôle</option><option value="all" ${access.mode === "all" ? "selected" : ""}>Tous les rôles</option></select></label><label class="field span-2">Identifiants des rôles<textarea data-field="roleIds" placeholder="Un ID par ligne">${escape((access.roleIds || []).join("\n"))}</textarea></label><label class="field span-2">Utilisateurs autorisés individuellement<textarea data-field="userIds" placeholder="IDs Discord facultatifs">${escape((access.userIds || []).join("\n"))}</textarea></label></div></article>`).join("");
  }

  function collect() {
    const servers = $$("[data-server]").map(card => ({ key: card.querySelector('[data-field="key"]').value, label: card.querySelector('[data-field="label"]').value, guildId: card.querySelector('[data-field="guildId"]').value, enabled: card.querySelector('[data-field="enabled"]').checked }));
    const access = {};
    $$("[data-access]").forEach(card => { const key = card.dataset.access; access[key] = { label: config.access[key].label, guildKey: card.querySelector('[data-field="guildKey"]').value, mode: card.querySelector('[data-field="mode"]').value, roleIds: ids(card.querySelector('[data-field="roleIds"]').value), userIds: ids(card.querySelector('[data-field="userIds"]').value) }; });
    const channels = $$("[data-channel]").map(card => { const value = name => card.querySelector(`[data-field="${name}"]`); return { key:value("key").value,label:value("label").value,channelId:value("channelId").value,guildKey:value("guildKey").value,type:value("type").value,icon:value("icon").value,sortOrder:Number(value("sortOrder").value)||0,enabled:value("enabled").checked,canRead:value("canRead").checked,canWrite:value("canWrite").checked,canUpload:value("canUpload").checked,canMention:value("canMention").checked }; });
    return { servers, access, liaison: { sectionLabel: $("#section-label").value, channels } };
  }

  function renderMenuPreview() {
    if (!config) return;
    let snapshot;
    try { snapshot = collect(); } catch { snapshot = config; }
    $("#menu-preview").innerHTML = snapshot.liaison.channels.slice().sort((a,b)=>a.sortOrder-b.sortOrder).map(item => `<div class="menu-item${item.enabled ? "" : " off"}"><span>${escape(item.label || "Sans nom")}</span><span class="menu-order">${String(item.sortOrder).padStart(2,"0")}${item.type === "forum" ? " · forum" : ""}</span></div>`).join("") || '<p class="empty">Aucun canal.</p>';
  }

  function renderHistory() {
    $("#history-list").innerHTML = history.length ? history.map(item => `<article class="history-row"><div><strong>Version ${item.version}</strong><small>${escape(item.summary || "Modification de la configuration")} · ${escape(item.changedByName || "Système")} · ${new Date(item.createdAt).toLocaleString("fr-FR")}</small></div><button class="secondary mini" data-restore="${escape(item.id)}" type="button">Restaurer</button></article>`).join("") : '<p class="empty">Aucune ancienne version pour le moment.</p>';
  }

  function renderAll(data) {
    config = data.config; history = data.history || []; dirty = false;
    $("#config-version").textContent = String(data.meta?.version ?? "—");
    $("#config-updated").textContent = data.meta?.updatedAt ? `${data.meta.updatedByName || "Administrateur"} · ${new Date(data.meta.updatedAt).toLocaleString("fr-FR")}` : "Configuration initiale";
    $("#section-label").value = config.liaison.sectionLabel;
    renderServers(); renderChannels(); renderAccess(); renderMenuPreview(); renderHistory();
    $("#dirty-state").textContent = "Aucune modification en attente";
  }

  async function load() {
    const response = await fetch("/api/admin/configuration", { credentials:"same-origin", cache:"no-store" });
    const data = await response.json().catch(() => ({}));
    if (response.status === 401) return location.replace("/academy-auth/login.html?error=login_required");
    if (!response.ok) throw new Error(data.code || "configuration_unavailable");
    renderAll(data);
  }

  async function save() {
    const button = $("#save-config"); button.disabled = true;
    try { const response = await fetch("/api/admin/configuration", { method:"POST", credentials:"same-origin", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ operation:"save", config:collect(), summary:$("#change-summary").value }) }); const data=await response.json().catch(()=>({})); if(!response.ok)throw new Error(data.code||"save_failed"); $("#change-summary").value=""; alert("Configuration publiée. La tablette utilisera les nouveaux réglages."); await load(); }
    catch(error){alert(error.message === "admin_lockout" ? "Sauvegarde refusée : cette règle te retirerait l’accès administrateur." : `Impossible d’enregistrer : ${error.message}`, true);} finally{button.disabled=false;}
  }

  async function diagnose() {
    const button=$("#run-diagnostic");button.disabled=true;$("#diagnostic-results").innerHTML='<p class="empty">Tests Discord en cours…</p>';
    try{const response=await fetch("/api/admin/discord-diagnostic",{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify({config:collect()})});const data=await response.json().catch(()=>({}));if(!response.ok)throw new Error(data.code||"diagnostic_failed");$("#diag-bot").textContent=data.botConfigured?"Configuré":"Manquant";$("#diag-bot").className=data.botConfigured?"status-ok":"status-error";$("#diag-db").textContent=data.databaseConfigured?"Configurée":"Manquante";$("#diag-db").className=data.databaseConfigured?"status-ok":"status-error";$("#diag-duration").textContent=`${data.durationMs} ms`;const rows=[...data.servers.map(x=>({...x,kind:"Serveur"})),...data.channels.map(x=>({...x,kind:x.type==="forum"?"Forum":"Canal"}))];$("#diagnostic-results").innerHTML=rows.map(x=>`<article class="diagnostic-row"><div><strong>${escape(x.kind)} · ${escape(x.label)}</strong><small>${escape(x.discordName||x.id)}${x.readStatus?` · lecture ${escape(x.readStatus)}`:""}</small></div><span class="${x.ok?"status-ok":"status-error"}">${x.ok?"Opérationnel":`${escape(x.code||"Erreur")} · HTTP ${x.status||"—"}`}</span></article>`).join("");}catch(error){alert(`Diagnostic impossible : ${error.message}`,true);}finally{button.disabled=false;}
  }

  document.addEventListener("input", event => { if(event.target.closest(".config-page") && !event.target.closest(".config-tabs")) markDirty(); });
  document.addEventListener("change", event => { if(event.target.closest(".config-page")) markDirty(); });
  document.addEventListener("click", async event => {
    const tab=event.target.closest("[data-panel]");if(tab){$$('[data-panel]').forEach(x=>x.classList.toggle('active',x===tab));$$('[data-config-panel]').forEach(x=>{const active=x.dataset.configPanel===tab.dataset.panel;x.classList.toggle('active',active);x.hidden=!active;});return;}
    const removeServer=event.target.closest("[data-remove-server]");if(removeServer){const index=Number(removeServer.closest("[data-server]").dataset.server);config=collect();config.servers.splice(index,1);renderServers();renderChannels();renderAccess();markDirty();return;}
    const removeChannel=event.target.closest("[data-remove-channel]");if(removeChannel){const index=Number(removeChannel.closest("[data-channel]").dataset.channel);config=collect();config.liaison.channels.splice(index,1);renderChannels();markDirty();return;}
    const restore=event.target.closest("[data-restore]");if(restore&&confirm("Restaurer cette ancienne configuration ? La configuration actuelle sera conservée dans l’historique.")){restore.disabled=true;try{const response=await fetch("/api/admin/configuration",{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify({operation:"restore",historyId:restore.dataset.restore})});const data=await response.json().catch(()=>({}));if(!response.ok)throw new Error(data.code||"restore_failed");alert("Ancienne configuration restaurée.");await load();}catch(error){alert(`Restauration impossible : ${error.message}`,true);}finally{restore.disabled=false;}}
  });
  $("#add-server").addEventListener("click",()=>{config=collect();config.servers.push({key:`server-${config.servers.length+1}`,label:"Nouveau serveur",guildId:"",enabled:true});renderServers();renderChannels();renderAccess();markDirty();});
  $("#add-channel").addEventListener("click",()=>{config=collect();config.liaison.channels.push({key:`liaison-${config.liaison.channels.length+1}`,label:"Nouveau canal",channelId:"",guildKey:config.servers[0]?.key||"cpd",type:"text",icon:"users",enabled:true,canRead:true,canWrite:true,canUpload:true,canMention:true,sortOrder:(config.liaison.channels.length+1)*10});renderChannels();markDirty();});
  $("#save-config").addEventListener("click",save);$("#reload-config").addEventListener("click",()=>{if(!dirty||confirm("Annuler toutes les modifications non publiées ?"))load().catch(e=>alert(e.message,true));});$("#run-diagnostic").addEventListener("click",diagnose);
  load().catch(error=>alert(error.message === "admin_role_required" ? "Ton compte n’a pas accès à la configuration." : `Impossible de charger le panel : ${error.message}`,true));
})();
