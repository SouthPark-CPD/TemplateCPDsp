(() => {
  let candidatesPromise;
  const escapeHtml = (value) => String(value ?? "").replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
  }[character]));
  const initials = (name) => String(name || "CPD").trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "CPD";
  const loadCandidates = () => {
    if (!candidatesPromise) {
      candidatesPromise = fetch("/api/liaison/complaints?mentionCandidates=1", { credentials: "same-origin", cache: "no-store" })
        .then(async (response) => {
          const data = await response.json().catch(() => ({}));
          if (!response.ok || !data.ok) throw new Error(data.code || "mentions_unavailable");
          return Array.isArray(data.members) ? data.members : [];
        })
        .catch((error) => { candidatesPromise = null; throw error; });
    }
    return candidatesPromise;
  };

  function init(root) {
    if (!root || root.dataset.mentionsReady === "1") return root._mentionPicker || null;
    root.dataset.mentionsReady = "1";
    const search = root.querySelector("[data-mention-search]");
    const selectedNode = root.querySelector("[data-mention-selected]");
    const optionsNode = root.querySelector("[data-mention-options]");
    const countNode = root.querySelector("[data-mention-count]");
    const helpNode = root.querySelector("[data-mention-help]");
    let candidates = [];
    const selected = new Map();
    let hideTimer;

    const setHelp = (text, error = false) => {
      if (!helpNode) return;
      helpNode.textContent = text;
      helpNode.classList.toggle("error", error);
    };
    const updateSelected = () => {
      selectedNode.innerHTML = [...selected.values()].map((member) => `<span class="mention-chip"><span>@${escapeHtml(member.name)}</span><button type="button" data-remove-mention="${escapeHtml(member.id)}" aria-label="Retirer ${escapeHtml(member.name)}">×</button></span>`).join("");
      countNode.textContent = selected.size ? `${selected.size} sélectionné${selected.size > 1 ? "s" : ""}` : "Aucun agent sélectionné";
    };
    const renderOptions = () => {
      const query = String(search.value || "").trim().toLocaleLowerCase("fr");
      const visible = candidates.filter((member) => !selected.has(member.id) && `${member.name} ${member.username} ${member.rank}`.toLocaleLowerCase("fr").includes(query)).slice(0, 25);
      optionsNode.innerHTML = visible.length ? visible.map((member) => `<button type="button" class="mention-option" data-mention-id="${escapeHtml(member.id)}"><span class="mention-option-avatar">${member.avatar ? `<img src="${escapeHtml(member.avatar)}" alt="">` : escapeHtml(initials(member.name))}</span><span class="mention-option-name">${escapeHtml(member.name)}${member.username ? ` <small>@${escapeHtml(member.username)}</small>` : ""}</span><span class="mention-option-rank">${escapeHtml(member.rank || "Agent CPD")}</span></button>`).join("") : '<span class="mention-help">Aucun agent trouvé.</span>';
    };
    const openOptions = async () => {
      clearTimeout(hideTimer);
      optionsNode.hidden = false;
      if (!candidates.length) {
        optionsNode.innerHTML = '<span class="mention-help">Chargement des agents…</span>';
        try { candidates = await loadCandidates(); renderOptions(); setHelp("Sélectionnez les agents à notifier."); }
        catch { optionsNode.innerHTML = '<span class="mention-help error">Impossible de charger les agents.</span>'; setHelp("Le sélecteur est temporairement indisponible.", true); }
      } else renderOptions();
    };
    const hideOptions = () => { hideTimer = setTimeout(() => { optionsNode.hidden = true; }, 180); };
    search.addEventListener("focus", openOptions);
    search.addEventListener("input", openOptions);
    search.addEventListener("blur", hideOptions);
    optionsNode.addEventListener("mousedown", (event) => event.preventDefault());
    optionsNode.addEventListener("click", (event) => {
      const button = event.target.closest("[data-mention-id]");
      if (!button) return;
      const member = candidates.find((candidate) => candidate.id === button.dataset.mentionId);
      if (!member) return;
      selected.set(member.id, member);
      search.value = "";
      updateSelected();
      renderOptions();
      search.focus();
    });
    selectedNode.addEventListener("click", (event) => {
      const button = event.target.closest("[data-remove-mention]");
      if (!button) return;
      selected.delete(button.dataset.removeMention);
      updateSelected();
      if (!optionsNode.hidden) renderOptions();
    });
    const api = { getIds: () => [...selected.keys()], clear: () => { selected.clear(); updateSelected(); } };
    root._mentionPicker = api;
    updateSelected();
    return api;
  }

  window.CPDMentionPicker = { init, loadCandidates };
})();
