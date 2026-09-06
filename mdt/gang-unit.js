(() => {
  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];
  const state = { gangs: [], territories: [], markers: [], individuals: [], reports: [], operations: [], watchlist: [] };
  const mapState = { zoom: 1, pan: { x: 0, y: 0 }, mode: "pan", draft: [], polygon: [], selectedId: "", editingTerritoryId: "", pointers: new Map(), gesture: null, start: null, editVertex: null, savingTerritory: false };
  const esc = value => String(value ?? "").replace(/[&<>'"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[c]));
  const notice = (message, error = false) => { const box = $("#notice"); box.textContent = message; box.className = "notice" + (error ? " error" : ""); box.hidden = false; clearTimeout(notice.timer); notice.timer = setTimeout(() => { box.hidden = true; }, 5500); };
  const label = (value, map) => map[value] || value || "—";
  const fmtDate = value => value ? new Date(value).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" }) : "Date non renseignée";
  const threat = value => label(value, { faible: "Faible", moderee: "Modérée", elevee: "Élevée", critique: "Critique" });
  const territoryStatus = value => label(value, { controle: "Contrôlé", dispute: "Disputé", conteste: "Contesté", abandonne: "Abandonné" });
  async function api(url, options = {}) { const response = await fetch(url, { credentials: "same-origin", cache: "no-store", ...options }); const data = await response.json().catch(() => ({})); if (!response.ok) throw new Error(data.code || "request_failed"); return data; }
  const json = payload => ({ method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });

  const views = new Set(["dashboard", "map", "gangs", "intel", "operations"]);
  const viewLabels = { dashboard: "Vue d’ensemble", map: "Carte tactique", gangs: "Dossiers gangs & individus", intel: "Surveillance & renseignement", operations: "Opérations" };
  const query = new URLSearchParams(location.search);
  const legacyView = query.get("view");
  let gangSubView = query.get("sub") === "individuals" || legacyView === "individuals" ? "individuals" : "gangs";
  let intelSubView = query.get("sub") === "watchlist" || legacyView === "watchlist" ? "watchlist" : "reports";
  const requestedView = legacyView === "individuals" ? "gangs" : legacyView === "reports" || legacyView === "watchlist" ? "intel" : (views.has(legacyView) ? legacyView : "dashboard");
  function setTab(name) { const safe = views.has(name) ? name : "dashboard"; $$("[data-panel]").forEach(panel => { const active = panel.dataset.panel === safe || (safe === "gangs" && panel.dataset.panel === gangSubView) || (safe === "intel" && panel.dataset.panel === intelSubView); panel.classList.toggle("active", active); }); const gangHeader = safe === "gangs" ? $(`[data-panel='${gangSubView}'] .module-head`) : null; if (gangHeader) { gangHeader.after(gangTabs); gangTabs.hidden = false; } else gangTabs.hidden = true; document.body.classList.toggle("gang-map-view", safe === "map"); $("#gang-view-label").textContent = viewLabels[safe]; $$("[data-gang-sub]").forEach(button => button.classList.toggle("primary", button.dataset.gangSub === gangSubView)); $$("[data-intel-sub]").forEach(button => button.classList.toggle("primary", button.dataset.intelSub === intelSubView)); if (safe === "map") requestAnimationFrame(() => { layoutMapStage(); applyMapTransform(); }); }
  function goView(name, sub = "") { const url = new URL(location.href); url.searchParams.set("view", name); if (sub) url.searchParams.set("sub", sub); else url.searchParams.delete("sub"); location.assign(url.pathname + url.search); }
  $$("[data-open-tab]").forEach(button => button.addEventListener("click", () => goView(button.dataset.openTab)));
  const gangTabs = document.createElement("div");
  gangTabs.className = "inner-tabs";
  gangTabs.hidden = true;
  gangTabs.innerHTML = '<button class="button" data-gang-sub="gangs" type="button">Dossiers gangs</button><button class="button" data-gang-sub="individuals" type="button">Individus</button>';
  $("[data-panel='gangs'] .module-head").after(gangTabs);
  const intelTabs = document.createElement("div");
  intelTabs.className = "inner-tabs";
  intelTabs.innerHTML = '<button class="button" data-intel-sub="reports" type="button">Renseignement</button><button class="button" data-intel-sub="watchlist" type="button">Surveillance</button>';
  $("[data-panel='reports'] .module-head").after(intelTabs);
  $("[data-panel='watchlist'] .module-head").after(intelTabs.cloneNode(true));
  $$('[data-gang-sub]').forEach(button => button.addEventListener("click", () => { gangSubView = button.dataset.gangSub; setTab("gangs"); }));
  $$('[data-intel-sub]').forEach(button => button.addEventListener("click", () => { intelSubView = button.dataset.intelSub; setTab("intel"); }));
  const markerDialog = document.createElement("dialog");
  markerDialog.className = "marker-dialog";
  markerDialog.innerHTML = '<form method="dialog" id="marker-form"><div class="panel-head"><div><span class="eyebrow">REPÈRE TACTIQUE</span><h2 id="marker-form-title">Nouveau repère</h2></div><button class="text-button" value="cancel" formnovalidate type="submit">Fermer</button></div><input id="marker-id" type="hidden"><input id="marker-x" type="hidden"><input id="marker-y" type="hidden"><label>Titre<input id="marker-title" maxlength="160" required placeholder="Ex. Planque repérée"></label><div class="form-grid"><label>Type / symbole<select id="marker-type"><option value="hideout">⌂ Planque</option><option value="deal">◆ Point de deal</option><option value="vehicle">▣ Véhicule</option><option value="incident">! Incident</option><option value="meeting">● Rendez-vous</option><option value="operation">✦ Opération</option><option value="interest">• Point d’intérêt</option></select></label><label>Gang associé<input id="marker-gang" maxlength="120"></label></div><label>Notes<textarea id="marker-notes" maxlength="3000"></textarea></label><div class="form-actions"><button class="button" value="cancel" formnovalidate type="submit">Annuler</button><button class="button primary" id="marker-save" value="default" type="submit">Enregistrer</button></div></form>';
  document.body.append(markerDialog);
  const markerDetails = document.createElement("dialog");
  markerDetails.className = "marker-dialog";
  markerDetails.innerHTML = '<div class="panel-head"><div><span class="eyebrow">REPÈRE TACTIQUE</span><h2 id="marker-detail-title"></h2></div><button class="text-button" id="marker-detail-close" type="button">Fermer</button></div><dl class="marker-details"><dt>Type</dt><dd id="marker-detail-type"></dd><dt>Gang associé</dt><dd id="marker-detail-gang"></dd><dt>Notes</dt><dd id="marker-detail-notes"></dd></dl><div class="form-actions"><button class="text-button archive-button" id="marker-detail-archive" type="button">Archiver</button><button class="button" id="marker-detail-edit" type="button">Modifier</button><button class="button primary" id="marker-detail-ok" type="button">Fermer</button></div>';
  document.body.append(markerDetails);
  function openMarkerDetails(item) { $("#marker-detail-title").textContent = item.title; $("#marker-detail-type").textContent = label(item.markerType, { hideout: "Planque", deal: "Point de deal", vehicle: "Véhicule", incident: "Incident", meeting: "Rendez-vous", operation: "Opération", interest: "Point d’intérêt" }); $("#marker-detail-gang").textContent = item.gangName || "Non renseigné"; $("#marker-detail-notes").textContent = item.notes || "Aucune note."; $("#marker-detail-archive").onclick = () => { markerDetails.close(); archive("marker", item.id); }; $("#marker-detail-edit").onclick = () => { markerDetails.close(); openMarkerDialog(item, item); }; if (!markerDetails.open) markerDetails.showModal(); }
  $("#marker-detail-close").addEventListener("click", () => markerDetails.close());
  $("#marker-detail-ok").addEventListener("click", () => markerDetails.close());
  const markerListDialog = document.createElement("dialog");
  markerListDialog.className = "marker-dialog";
  markerListDialog.innerHTML = '<div class="panel-head"><div><span class="eyebrow">REPÈRES TACTIQUES</span><h2>Repères enregistrés</h2></div><button class="text-button" id="marker-list-close" type="button">Fermer</button></div><div id="marker-list-content" class="marker-list"></div>';
  document.body.append(markerListDialog);
  function openMarkerList() { $("#marker-list-content").innerHTML = state.markers.length ? state.markers.map(item => `<button class="marker-list-item" data-marker-list-id="${esc(item.id)}" type="button"><strong>${esc(item.title)}</strong><small>${esc(label(item.markerType, { hideout: "Planque", deal: "Point de deal", vehicle: "Véhicule", incident: "Incident", meeting: "Rendez-vous", operation: "Opération", interest: "Point d’intérêt" }))}${item.gangName ? ` · ${esc(item.gangName)}` : ""}</small></button>`).join("") : '<p class="empty">Aucun repère enregistré.</p>'; if (!markerListDialog.open) markerListDialog.showModal(); }
  $("#marker-list-close").addEventListener("click", () => markerListDialog.close());
  markerListDialog.addEventListener("click", event => { const button = event.target.closest("[data-marker-list-id]"); if (!button) return; const item = state.markers.find(entry => entry.id === button.dataset.markerListId); if (item) { markerListDialog.close(); openMarkerDetails(item); } });
  function openMarkerDialog(point, item = null) { $("#marker-form").reset(); $("#marker-form-title").textContent = item ? "Modifier le repère" : "Nouveau repère"; $("#marker-id").value = item?.id || ""; $("#marker-x").value = point.x; $("#marker-y").value = point.y; $("#marker-title").value = item?.title || ""; $("#marker-type").value = item?.markerType || "interest"; $("#marker-gang").value = item?.gangName || ""; $("#marker-notes").value = item?.notes || ""; if (!markerDialog.open) markerDialog.showModal(); setMapMode("pan"); }
  $("#marker-form").addEventListener("submit", async event => { if (event.submitter?.value === "cancel") return; event.preventDefault(); try { await api("/api/gang-unit/marker/save", json({ id: $("#marker-id").value, title: $("#marker-title").value, markerType: $("#marker-type").value, gangName: $("#marker-gang").value, notes: $("#marker-notes").value, x: Number($("#marker-x").value), y: Number($("#marker-y").value) })); markerDialog.close(); notice("Repère enregistré."); await load(); } catch { notice("Impossible d’enregistrer ce repère.", true); } });

  function renderDashboard() {
    $("#stat-gangs").textContent = state.gangs.length;
    $("#stat-territories").textContent = state.territories.length;
    $("#stat-individuals").textContent = state.individuals.length;
    $("#stat-alerts").textContent = state.watchlist.filter(item => item.priority === "urgente" || item.priority === "haute").length;
    $("#dashboard-watchlist").innerHTML = state.watchlist.slice(0, 5).map(item => card(item.targetName, `${label(item.targetType, { individual: "Individu", gang: "Gang", vehicle: "Véhicule", location: "Lieu" })} · ${item.assignedTo || "Non attribué"}`, item.priority, "watchlist", item.id)).join("") || empty("Aucune surveillance active.");
  }
  function empty(message) { return `<p class="empty">${esc(message)}</p>`; }
  function card(title, subtitle, badge, type, id) { return `<article class="card" data-card-type="${esc(type)}" data-card-id="${esc(id)}"><div><h3>${esc(title)}</h3><p>${esc(subtitle || "Aucun détail")}</p></div>${badge ? `<span class="badge ${esc(badge)}">${esc(label(badge, { urgente: "Urgente", haute: "Haute", normale: "Normale", faible: "Faible", moderee: "Modérée", elevee: "Élevée", critique: "Critique", active: "Active", planifiee: "Planifiée", terminee: "Terminée", suspendue: "Suspendue" }))}</span>` : ""}</article>`; }
  function renderLists() {
    $("#gang-list").innerHTML = state.gangs.map(item => card(item.name, `${threat(item.threatLevel)} · ${item.status || "Actif"}`, item.threatLevel, "gang", item.id)).join("") || empty("Aucun gang renseigné.");
    $("#individual-list").innerHTML = state.individuals.map(item => card(item.displayName, `${item.gangName || "Gang non renseigné"}${item.roleTitle ? ` · ${item.roleTitle}` : ""}`, item.threatLevel, "individual", item.id)).join("") || empty("Aucun individu renseigné.");
    $("#operation-list").innerHTML = state.operations.map(item => card(item.codeName, `${item.location || "Lieu non renseigné"}${item.startsAt ? ` · ${fmtDate(item.startsAt)}` : ""}`, item.status, "operation", item.id)).join("") || empty("Aucune opération active ou planifiée.");
    $("#watchlist-list").innerHTML = state.watchlist.map(item => card(item.targetName, `${item.reason || "Aucun motif"}${item.assignedTo ? ` · ${item.assignedTo}` : ""}`, item.priority, "watchlist", item.id)).join("") || empty("Aucune cible à surveiller.");
    $("#report-list").innerHTML = state.reports.map(item => `<article class="report-card"><header><h3>${esc(item.title)}</h3><span class="badge">${esc(item.category)} · ${esc(label(item.reliability, { fiable: "Fiable", a_confirmer: "À confirmer", incertaine: "Incertaine" }))}</span></header><time>${esc(item.createdByName || "Agent")} · ${fmtDate(item.createdAt)}</time><p>${esc(item.content)}</p></article>`).join("") || empty("Aucun rapport publié.");
    $("#territory-list").innerHTML = state.territories.map(item => card(item.name, `${item.gangName} · ${territoryStatus(item.status)}`, "", "territory", item.id)).join("") || empty("Aucun territoire actif.");
    const gangOptions = state.gangs.map(item => `<option value="${esc(item.id)}">${esc(item.name)}</option>`).join("");
    $("#individual-gang").innerHTML = '<option value="">Non renseigné</option>' + gangOptions;
    $("#gang-datalist").innerHTML = state.gangs.map(item => `<option value="${esc(item.name)}"></option>`).join("");
    $("#report-territory").innerHTML = '<option value="">Non lié</option>' + state.territories.map(item => `<option value="${esc(item.id)}">${esc(item.name)} · ${esc(item.gangName)}</option>`).join("");
  }

  const viewport = $("#map-viewport"), stage = $("#map-stage"), map = $("#territory-map"), layer = $("#territory-layer"), draftLayer = $("#draft-layer");
  function layoutMapStage() { const rect = viewport.getBoundingClientRect(), ratio = 1493 / 1287; if (!rect.width || !rect.height) return; const width = Math.min(rect.width, rect.height * ratio), height = width / ratio; stage.style.width = `${width}px`; stage.style.height = `${height}px`; stage.style.left = `${(rect.width - width) / 2}px`; stage.style.top = `${(rect.height - height) / 2}px`; }
  function applyMapTransform() { stage.style.transform = `translate(${mapState.pan.x}px, ${mapState.pan.y}px) scale(${mapState.zoom})`; }
  function mapPoint(event) { const svgPoint = map.createSVGPoint(); svgPoint.x = event.clientX; svgPoint.y = event.clientY; const matrix = map.getScreenCTM(); if (!matrix) return { x: -1, y: -1 }; const point = svgPoint.matrixTransform(matrix.inverse()); return { x: Number((point.x / 10).toFixed(3)), y: Number((point.y / 10).toFixed(3)) }; }
  function pointString(points) { return points.map(point => `${point.x * 10},${point.y * 10}`).join(" "); }
  function renderMap() {
    layer.innerHTML = state.territories.map(item => {
      const selected = item.id === mapState.selectedId;
      const points = selected && mapState.polygon.length ? mapState.polygon : item.polygon;
      const vertices = selected ? `<g>${points.map((point, index) => `<circle class="territory-vertex" data-vertex="${index}" cx="${point.x * 10}" cy="${point.y * 10}" r="2.4"></circle>`).join("")}</g>` : "";
      return `<polygon class="territory-shape ${selected ? "selected" : ""}" data-territory-id="${esc(item.id)}" points="${pointString(points)}" fill="${esc(item.color)}66" stroke="${esc(item.color)}"></polygon>${vertices}`;
    }).join("");
    if (!mapState.selectedId && mapState.polygon.length >= 3) {
      const points = mapState.polygon;
      layer.insertAdjacentHTML("beforeend", `<polygon class="territory-shape selected territory-preview" points="${pointString(points)}" fill="#c9575766" stroke="#e5c66e"></polygon><g>${points.map((point, index) => `<circle class="territory-vertex" data-vertex="${index}" cx="${point.x * 10}" cy="${point.y * 10}" r="2.4"></circle>`).join("")}</g>`);
    }
    const markerIcons = { hideout: "⌂", deal: "◆", vehicle: "▣", incident: "!", meeting: "●", operation: "✦", interest: "•" };
    layer.insertAdjacentHTML("beforeend", state.markers.map(item => `<g class="map-marker marker-${esc(item.markerType)}" data-marker-id="${esc(item.id)}" transform="translate(${item.x * 10} ${item.y * 10})" role="button" tabindex="0" aria-label="Ouvrir le repère ${esc(item.title)}"><circle class="marker-hit" r="13"></circle><circle r="7"></circle><text text-anchor="middle" dominant-baseline="central">${esc(markerIcons[item.markerType] || "•")}</text></g>`).join(""));
    const draft = mapState.draft;
    draftLayer.innerHTML = draft.length ? `<polyline class="draft-line" points="${pointString(draft)}"></polyline>${draft.map((point, index) => `<circle class="draft-point" data-draft-vertex="${index}" cx="${point.x * 10}" cy="${point.y * 10}" r="3.2"></circle>`).join("")}` : "";
    $("#draw-count").textContent = `${draft.length} point${draft.length > 1 ? "s" : ""}`;
    if (typeof markerListButton !== "undefined") markerListButton.textContent = `Repères (${state.markers.length})`;
  }
  function zoom(next, clientX, clientY) {
    const r = viewport.getBoundingClientRect(), old = mapState.zoom, value = Math.min(12, Math.max(1, next));
    if (value === old) return;
    const localX = Number.isFinite(clientX) ? clientX - r.left : r.width / 2, localY = Number.isFinite(clientY) ? clientY - r.top : r.height / 2;
    const mapX = (localX - mapState.pan.x) / old, mapY = (localY - mapState.pan.y) / old;
    mapState.zoom = value; mapState.pan.x = localX - mapX * value; mapState.pan.y = localY - mapY * value; applyMapTransform();
  }
  function resetMap() { mapState.zoom = 1; mapState.pan = { x: 0, y: 0 }; applyMapTransform(); }
  addEventListener("resize", () => { layoutMapStage(); applyMapTransform(); });
  function setMapMode(mode) { mapState.mode = mode; viewport.classList.toggle("drawing", mode === "draw" || mode === "marker"); $("#map-draw").classList.toggle("primary", mode === "draw"); $("#map-pan").classList.toggle("primary", mode === "pan"); markerButton.classList.toggle("primary", mode === "marker"); $("#draw-actions").hidden = mode !== "draw"; $("#map-help").textContent = mode === "draw" ? "1. Clique pour poser les sommets. 2. Fais glisser un sommet pour l’ajuster. 3. Termine puis enregistre." : mode === "marker" ? "Clique à l’emplacement du repère. Choisis ensuite son symbole et ses informations." : "Glisse pour déplacer la carte, pince ou utilise +/− pour zoomer. Clique sur un repère pour ouvrir sa fiche."; }
  $("#map-pan").addEventListener("click", () => setMapMode("pan"));
  const markerButton = document.createElement("button"); markerButton.type = "button"; markerButton.className = "button"; markerButton.textContent = "Ajouter un repère"; $("#map-pan").before(markerButton);
  const markerListButton = document.createElement("button"); markerListButton.type = "button"; markerListButton.className = "button"; markerListButton.textContent = "Repères (0)"; $("#map-pan").before(markerListButton);
  markerButton.addEventListener("click", () => setMapMode("marker"));
  markerListButton.addEventListener("click", openMarkerList);
  $("#map-draw").addEventListener("click", () => { mapState.draft = []; setMapMode("draw"); renderMap(); });
  $("#map-zoom-in").addEventListener("click", () => zoom(mapState.zoom * 1.25)); $("#map-zoom-out").addEventListener("click", () => zoom(mapState.zoom / 1.25)); $("#map-reset").addEventListener("click", resetMap);
  $("#draw-undo").addEventListener("click", () => { mapState.draft.pop(); renderMap(); }); $("#draw-clear").addEventListener("click", () => { mapState.draft = []; renderMap(); }); $("#draw-cancel").addEventListener("click", () => { mapState.draft = []; setMapMode("pan"); renderMap(); });
  $("#draw-finish").addEventListener("click", () => { if (mapState.draft.length < 3) return notice("Un territoire doit posséder au moins trois points.", true); mapState.polygon = mapState.draft.map(point => ({ ...point })); mapState.draft = []; openTerritory(null); setMapMode("pan"); renderMap(); });
  viewport.addEventListener("wheel", event => { event.preventDefault(); zoom(mapState.zoom * (event.deltaY < 0 ? 1.16 : .86), event.clientX, event.clientY); }, { passive: false });
  viewport.addEventListener("pointerdown", event => { viewport.setPointerCapture?.(event.pointerId); mapState.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY }); if (mapState.pointers.size === 2) { const pts = [...mapState.pointers.values()]; mapState.gesture = { distance: Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y), zoom: mapState.zoom }; return; } mapState.start = { x: event.clientX, y: event.clientY, panX: mapState.pan.x, panY: mapState.pan.y, moved: false }; viewport.classList.add("panning"); });
  viewport.addEventListener("pointermove", event => {
    if (mapState.editVertex !== null && mapState.pointers.has(event.pointerId)) { const point = mapPoint(event), points = mapState.editVertex.source === "draft" ? mapState.draft : mapState.polygon; if (point.x >= 0 && point.x <= 100 && point.y >= 0 && point.y <= 100) { points[mapState.editVertex.index] = point; renderMap(); } return; }
    if (mapState.dragTerritory && mapState.pointers.has(event.pointerId)) { const point = mapPoint(event), dx = point.x - mapState.dragTerritory.start.x, dy = point.y - mapState.dragTerritory.start.y; if (Number.isFinite(dx) && Number.isFinite(dy)) { mapState.dragTerritory.moved = mapState.dragTerritory.moved || Math.hypot(dx, dy) > .05; mapState.polygon = mapState.dragTerritory.polygon.map(vertex => ({ x: Math.max(0, Math.min(100, Number((vertex.x + dx).toFixed(3)))), y: Math.max(0, Math.min(100, Number((vertex.y + dy).toFixed(3)))) })); renderMap(); } return; }
    if (mapState.pointers.has(event.pointerId)) mapState.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (mapState.pointers.size === 2 && mapState.gesture) { const pts = [...mapState.pointers.values()]; const distance = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y); zoom(mapState.gesture.zoom * distance / Math.max(1, mapState.gesture.distance), (pts[0].x + pts[1].x) / 2, (pts[0].y + pts[1].y) / 2); return; }
    if (!mapState.start) return;
    const dx = event.clientX - mapState.start.x, dy = event.clientY - mapState.start.y; if (Math.hypot(dx, dy) > 4) mapState.start.moved = true; mapState.pan.x = mapState.start.panX + dx; mapState.pan.y = mapState.start.panY + dy; applyMapTransform();
  });
  function releasePointer(event) { const start = mapState.start, territoryId = mapState.pendingTerritoryId, released = event.type === "pointerup"; if (mapState.editVertex !== null) { mapState.editVertex = null; renderMap(); } else if (mapState.dragTerritory) { mapState.dragTerritory = null; renderMap(); } else if (released && mapState.mode === "pan" && territoryId && start && !start.moved && mapState.pointers.size === 1) { const item = state.territories.find(entry => entry.id === territoryId); if (item) { mapState.territoryOpenedAt = Date.now(); openTerritory(item); } } else if (released && (mapState.mode === "draw" || mapState.mode === "marker") && start && !start.moved && mapState.pointers.size === 1) { const point = mapPoint(event); if (point.x >= 0 && point.x <= 100 && point.y >= 0 && point.y <= 100) { if (mapState.mode === "draw") { mapState.draft.push(point); renderMap(); } else openMarkerDialog(point); } } mapState.pendingTerritoryId = ""; mapState.pointers.delete(event.pointerId); if (mapState.pointers.size < 2) mapState.gesture = null; mapState.start = null; viewport.classList.remove("panning"); }
  viewport.addEventListener("pointerup", releasePointer); viewport.addEventListener("pointercancel", releasePointer);
  function markerFromEvent(event) { const marker = event.target.closest?.("[data-marker-id]"); return marker ? state.markers.find(item => item.id === marker.dataset.markerId) : null; }
  function openClickedMarker(event) { if (mapState.mode === "draw" || mapState.mode === "marker") return false; const item = markerFromEvent(event); if (!item) return false; if (mapState.start?.moved) return true; mapState.markerOpenedAt = Date.now(); openMarkerDetails(item); return true; }
  layer.addEventListener("pointerup", event => { openClickedMarker(event); });
  layer.addEventListener("click", event => { if (Date.now() - (mapState.markerOpenedAt || 0) < 500 && markerFromEvent(event)) return; if (Date.now() - (mapState.territoryOpenedAt || 0) < 500 && event.target.closest("[data-territory-id]")) return; if (openClickedMarker(event)) return; if (mapState.mode === "draw" || mapState.mode === "marker") return; const polygon = event.target.closest("[data-territory-id]"); if (polygon) openTerritory(state.territories.find(item => item.id === polygon.dataset.territoryId)); });
  layer.addEventListener("keydown", event => { if (event.key !== "Enter" && event.key !== " ") return; const item = markerFromEvent(event); if (!item) return; event.preventDefault(); openMarkerDetails(item); });
  function beginVertexMove(event, source, index) { event.preventDefault(); event.stopPropagation(); map.setPointerCapture?.(event.pointerId); mapState.editVertex = { source, index: Number(index) }; mapState.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY }); }
  function beginTerritoryMove(event, territoryId) { const point = mapPoint(event); if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) return; event.preventDefault(); event.stopPropagation(); viewport.setPointerCapture?.(event.pointerId); mapState.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY }); mapState.dragTerritory = { id: territoryId, start: point, polygon: mapState.polygon.map(vertex => ({ ...vertex })), moved: false }; }
  layer.addEventListener("pointerdown", event => { const vertex = event.target.closest("[data-vertex]"); if (vertex) return beginVertexMove(event, "territory", vertex.dataset.vertex); const polygon = event.target.closest("[data-territory-id]"); if (!polygon || mapState.mode !== "pan") return; if (mapState.selectedId === polygon.dataset.territoryId && mapState.polygon.length >= 3) return beginTerritoryMove(event, polygon.dataset.territoryId); mapState.pendingTerritoryId = polygon.dataset.territoryId; });
  draftLayer.addEventListener("pointerdown", event => { const vertex = event.target.closest("[data-draft-vertex]"); if (vertex) beginVertexMove(event, "draft", vertex.dataset.draftVertex); });

  function openTerritory(item) { mapState.selectedId = item?.id || ""; mapState.editingTerritoryId = item?.id || ""; mapState.polygon = item?.polygon ? item.polygon.map(point => ({ ...point })) : mapState.polygon; document.body.classList.add("territory-editor-open"); $("#territory-form").hidden = false; $("#territory-empty").hidden = true; $("#territory-form-title").textContent = item ? "Modifier le territoire" : "Nouveau territoire"; $("#territory-id").value = mapState.editingTerritoryId; $("#territory-name").value = item?.name || ""; $("#territory-gang").value = item?.gangName || ""; $("#territory-status").value = item?.status || "conteste"; $("#territory-color").value = item?.color || "#c95757"; $("#territory-notes").value = item?.notes || ""; $("#territory-archive").hidden = !item; renderMap(); requestAnimationFrame(() => $("#territory-name").focus()); }
  $("#territory-cancel").addEventListener("click", () => { $("#territory-form").hidden = true; $("#territory-empty").hidden = false; document.body.classList.remove("territory-editor-open"); mapState.selectedId = ""; mapState.editingTerritoryId = ""; mapState.polygon = []; renderMap(); });
  $("#territory-form").addEventListener("submit", async event => {
    event.preventDefault();
    if (mapState.savingTerritory) return;
    if (mapState.polygon.length < 3) return notice("Le contour de la zone est manquant.", true);
    const submitButton = event.submitter || event.currentTarget.querySelector('[type="submit"]');
    const editingId = mapState.editingTerritoryId || $("#territory-id").value;
    mapState.savingTerritory = true;
    if (submitButton) submitButton.disabled = true;
    try {
      const saved = await api("/api/gang-unit/territory/save", json({ id: editingId, intent: editingId ? "update" : "create", name: $("#territory-name").value, gangName: $("#territory-gang").value, status: $("#territory-status").value, color: $("#territory-color").value, notes: $("#territory-notes").value, polygon: mapState.polygon }));
      const territory = saved.territory;
      if (territory) {
        const index = state.territories.findIndex(item => item.id === territory.id);
        if (index >= 0) state.territories.splice(index, 1, territory);
        else state.territories.unshift(territory);
      }
      notice(editingId ? "Territoire mis à jour." : "Territoire enregistré.");
      $("#territory-cancel").click();
      renderDashboard();
      renderLists();
      renderMap();
    } catch (error) {
      notice(error.message === "territory_update_id_required" ? "La zone à modifier n’a pas pu être identifiée. Rouvrez-la depuis la carte." : "Impossible d’enregistrer ce territoire.", true);
    } finally {
      mapState.savingTerritory = false;
      if (submitButton) submitButton.disabled = false;
    }
  });
  $("#territory-archive").addEventListener("click", () => archive("territory", $("#territory-id").value));

  function openEditor(type, item = null) { const editor = $(`#${type}-editor`); editor.hidden = false; $(`#${type}-editor-title`).textContent = item ? "Modifier le dossier" : `Nouveau ${type === "gang" ? "gang" : type === "individual" ? "individu" : type === "operation" ? "opération" : "élément"}`; if (type === "gang") { $("#gang-id").value = item?.id || ""; $("#gang-name").value = item?.name || ""; $("#gang-aliases").value = item?.aliases || ""; $("#gang-members").value = item?.members || ""; $("#gang-threat").value = item?.threatLevel || "moderee"; $("#gang-color").value = item?.color || "#c95757"; $("#gang-status").value = item?.status || "actif"; $("#gang-notes").value = item?.notes || ""; }
    if (type === "individual") { $("#individual-id").value = item?.id || ""; $("#individual-name").value = item?.displayName || ""; $("#individual-aliases").value = item?.aliases || ""; $("#individual-gang").value = item?.gangId || ""; $("#individual-role").value = item?.roleTitle || ""; $("#individual-threat").value = item?.threatLevel || "moderee"; $("#individual-vehicles").value = item?.vehicles || ""; $("#individual-notes").value = item?.notes || ""; }
    if (type === "operation") { $("#operation-id").value = item?.id || ""; $("#operation-name").value = item?.codeName || ""; $("#operation-status").value = item?.status || "planifiee"; $("#operation-date").value = item?.startsAt ? new Date(item.startsAt).toISOString().slice(0, 16) : ""; $("#operation-location").value = item?.location || ""; $("#operation-objective").value = item?.objective || ""; $("#operation-participants").value = item?.participants || ""; $("#operation-targets").value = item?.targets || ""; $("#operation-result").value = item?.resultSummary || ""; $("#operation-notes").value = item?.notes || ""; }
    if (type === "watchlist") { $("#watchlist-id").value = item?.id || ""; $("#watchlist-type").value = item?.targetType || "individual"; $("#watchlist-priority").value = item?.priority || "normale"; $("#watchlist-name").value = item?.targetName || ""; $("#watchlist-status").value = item?.status || "active"; $("#watchlist-assigned").value = item?.assignedTo || ""; $("#watchlist-reason").value = item?.reason || ""; }
    const archiveButton = editor.querySelector("[data-archive]"); if (archiveButton) archiveButton.hidden = !item; editor.scrollIntoView({ behavior: "smooth", block: "nearest" }); }
  $$("[data-new]").forEach(button => button.addEventListener("click", () => openEditor(button.dataset.new))); $$("[data-close-editor]").forEach(button => button.addEventListener("click", () => { $(`#${button.dataset.closeEditor}-editor`).hidden = true; }));
  $("#report-new").addEventListener("click", () => { $("#report-editor").hidden = false; $("#report-title").focus(); }); $$("[data-close-editor='report']").forEach(button => button.addEventListener("click", () => { $("#report-editor").hidden = true; }));
  $("#gang-form").addEventListener("submit", event => saveForm(event, "/api/gang-unit/gang/save", { id: "#gang-id", name: "#gang-name", aliases: "#gang-aliases", members: "#gang-members", threatLevel: "#gang-threat", color: "#gang-color", status: "#gang-status", notes: "#gang-notes" }, "gang"));
  $("#individual-form").addEventListener("submit", event => { const gangId = $("#individual-gang").value; const relatedGang = state.gangs.find(item => item.id === gangId); saveForm(event, "/api/gang-unit/individual/save", { id: "#individual-id", displayName: "#individual-name", aliases: "#individual-aliases", gangId, gangName: relatedGang?.name || "", roleTitle: "#individual-role", threatLevel: "#individual-threat", vehicles: "#individual-vehicles", notes: "#individual-notes" }, "individual"); });
  $("#operation-form").addEventListener("submit", event => saveForm(event, "/api/gang-unit/operation/save", { id: "#operation-id", codeName: "#operation-name", status: "#operation-status", startsAt: "#operation-date", location: "#operation-location", objective: "#operation-objective", participants: "#operation-participants", targets: "#operation-targets", resultSummary: "#operation-result", notes: "#operation-notes" }, "operation"));
  $("#watchlist-form").addEventListener("submit", event => saveForm(event, "/api/gang-unit/watchlist/save", { id: "#watchlist-id", targetType: "#watchlist-type", priority: "#watchlist-priority", targetName: "#watchlist-name", status: "#watchlist-status", assignedTo: "#watchlist-assigned", reason: "#watchlist-reason" }, "watchlist"));
  $("#report-form").addEventListener("submit", event => saveForm(event, "/api/gang-unit/report/save", { title: "#report-title", category: "#report-category", reliability: "#report-reliability", territoryId: "#report-territory", content: "#report-content" }, "report"));
  async function saveForm(event, url, fields, type) { event.preventDefault(); const payload = {}; Object.entries(fields).forEach(([key, selector]) => payload[key] = selector.startsWith("#") ? $(selector).value : selector); try { await api(url, json(payload)); notice("Dossier enregistré."); const editor = $(`#${type}-editor`); if (editor) editor.hidden = true; if (type === "report") $("#report-editor").hidden = true; await load(); } catch { notice("Impossible d’enregistrer ce dossier.", true); } }
  async function archive(type, entityId) { if (!entityId || !confirm("Archiver cet élément ? Il restera conservé dans la base.")) return; try { await api("/api/gang-unit/archive", json({ type, id: entityId })); notice("Élément archivé."); const editor = $(`#${type}-editor`); if (editor) editor.hidden = true; if (type === "territory") $("#territory-cancel").click(); await load(); } catch { notice("Impossible d’archiver cet élément.", true); } }
  $$("[data-archive]").forEach(button => button.addEventListener("click", () => { const type = button.dataset.archive; const source = type === "gang" ? "#gang-id" : type === "individual" ? "#individual-id" : type === "operation" ? "#operation-id" : "#watchlist-id"; archive(type, $(source).value); }));
  document.addEventListener("click", event => { const item = event.target.closest("[data-card-type]"); if (!item) return; const type = item.dataset.cardType, entityId = item.dataset.cardId; const collection = type === "territory" ? state.territories : state[type === "watchlist" ? "watchlist" : `${type}s`]; const record = collection?.find(entry => entry.id === entityId); if (type === "territory") { if (requestedView !== "map") return goView("map"); openTerritory(record); } else if (type === "watchlist") { if (requestedView !== "intel" || intelSubView !== "watchlist") return goView("intel", "watchlist"); openEditor("watchlist", record); } else if (record) { const view = type === "individual" ? "gangs" : type === "report" ? "intel" : `${type}s`; const sub = type === "individual" ? "individuals" : type === "report" ? "reports" : ""; if (requestedView !== view || (sub === "individuals" && gangSubView !== sub) || (sub === "reports" && intelSubView !== sub)) return goView(view, sub); openEditor(type, record); } });
  async function load() { try { const data = await api("/api/gang-unit/data"); ["gangs", "territories", "markers", "individuals", "reports", "operations", "watchlist"].forEach(key => state[key] = data[key] || []); renderDashboard(); renderLists(); renderMap(); } catch (error) { notice(error.message === "gang_unit_access_denied" ? "Accès Gang Unit refusé." : "Les données Gang Unit ne sont pas disponibles.", true); } }
  setMapMode("pan"); setTab(requestedView); load();
})();
