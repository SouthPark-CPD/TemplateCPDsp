(() => {
  const form = document.querySelector("#academy-form");
  if (!form) return;

  const draftKey = "cpd_academy_draft_v4";
  const steps = [...document.querySelectorAll(".form-step")];
  const indicators = [...document.querySelectorAll("[data-indicator]")];
  const previous = document.querySelector("#previous");
  const next = document.querySelector("#next");
  const submit = document.querySelector("#submit");
  const submitError = document.querySelector("#submit-error");
  const gate = document.querySelector("#candidate-gate");
  const gateError = document.querySelector("#candidate-auth-error");
  const verifiedUser = document.querySelector("#verified-user");
  const candidateSession = document.querySelector("#candidate-session");
  const lastStep = steps.length;
  let submitLabel = submit?.textContent || "Envoyer ma candidature →";
  let current = 1;
  let candidateVerified = false;
  let recruitmentClosed = false;

  const labels = {
    rpName: "Nom de famille et prénom RP", gender: "Genre",
    age: "Âge", nationality: "Nationalité",
    phone: "Téléphone en jeu", background: "Background & objectif",
    additional: "Élément complémentaire", discordId: "ID Discord"
  };

  function fieldValue(name) {
    const field = form.elements[name];
    if (!field) return "";
    if (typeof field.length === "number" && field.length && field[0]?.type === "radio") {
      return [...field].find(option => option.checked)?.value || "";
    }
    return String(field.value || "");
  }

  function setFieldValue(name, value) {
    const field = form.elements[name];
    if (!field) return;
    if (typeof field.length === "number" && field.length && field[0]?.type === "radio") {
      [...field].forEach(option => { option.checked = option.value === value; });
      return;
    }
    field.value = value;
  }

  function syncFormAccess() {
    gate.hidden = candidateVerified;
    form.hidden = !candidateVerified || recruitmentClosed;
  }

  function escapeHtml(value) { return String(value || "").replace(/[&<>'"]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char])); }
  async function verifyCandidate() {
    const params = new URLSearchParams(location.search);
    const authError = params.get("auth_error");
    if (authError && gateError) {
      gateError.textContent = authError === "cancelled" ? "La connexion Discord a été annulée." : "La connexion Discord n’a pas pu être vérifiée. Réessayez.";
      gateError.hidden = false;
    }
    try {
      const response = await fetch("/api/candidate-auth/session", { credentials: "same-origin", cache: "no-store" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data?.authenticated || !data.user?.id) return;
      setFieldValue("discordId", data.user.id);
      if (verifiedUser) {
        const name = data.user.globalName || data.user.username || "Compte Discord";
        const avatar = data.user.avatar ? `https://cdn.discordapp.com/avatars/${encodeURIComponent(data.user.id)}/${encodeURIComponent(data.user.avatar)}.png?size=80` : "";
        verifiedUser.innerHTML = `${avatar ? `<img src="${avatar}" alt="">` : ""}<span><small>Compte vérifié</small><b>${escapeHtml(name)}</b></span>`;
        verifiedUser.hidden = false;
      }
      if (candidateSession) {
        const name = data.user.globalName || data.user.username || "Compte Discord";
        const avatar = data.user.avatar ? `https://cdn.discordapp.com/avatars/${encodeURIComponent(data.user.id)}/${encodeURIComponent(data.user.avatar)}.png?size=80` : "";
        candidateSession.innerHTML = `${avatar ? `<img src="${avatar}" alt="">` : ""}<div><small>DISCORD CONNECTÉ ET VÉRIFIÉ</small><strong>${escapeHtml(name)}</strong><span>ID Discord : ${escapeHtml(data.user.id)}</span></div><a href="/api/candidate-auth/logout">Changer de compte</a>`;
        candidateSession.hidden = false;
      }
      candidateVerified = true;
      syncFormAccess();
    } catch { /* The gate remains visible: submissions stay server-protected. */ }
  }

  function saveDraft() {
    const data = Object.fromEntries(new FormData(form));
    delete data.accuracy;
    localStorage.setItem(draftKey, JSON.stringify(data));
  }

  function restoreDraft() {
    try {
      const data = JSON.parse(localStorage.getItem(draftKey) || "{}");
      Object.entries(data).forEach(([name, value]) => setFieldValue(name, value));
    } catch { localStorage.removeItem(draftKey); }
  }

  function updateCounters() {
    document.querySelectorAll("[data-counter]").forEach(counter => {
      const field = form.elements[counter.dataset.counter];
      if (field) counter.textContent = `${fieldValue(counter.dataset.counter).length} / ${field.maxLength}`;
    });
  }

  async function loadRecruitmentSettings() {
    try {
      const response = await fetch("/api/applications/submit", { credentials: "same-origin", cache: "no-store" });
      const data = await response.json().catch(() => ({}));
      const settings = data?.recruitment;
      if (!response.ok || !settings) return;
      if (settings.title) {
        document.title = `${settings.title} — Chicago Police Academy`;
        const title = document.querySelector("#recruitment-title");
        if (title) title.textContent = settings.title;
      }
      if (settings.intro) {
        const intro = document.querySelector("#recruitment-intro");
        if (intro) intro.textContent = settings.intro;
      }
      if (settings.submitLabel) {
        submitLabel = settings.submitLabel;
        submit.textContent = submitLabel;
      }
      if (settings.enabled === false) {
        recruitmentClosed = true;
        syncFormAccess();
        const closed = document.querySelector("#recruitment-closed");
        if (closed) {
          closed.textContent = settings.closedMessage || "Les recrutements sont momentanément fermés.";
          closed.hidden = false;
        }
      }
    } catch {
      // The form remains usable with its embedded defaults if the settings endpoint is unavailable.
    }
  }

  function setFieldError(field, message) {
    field.classList.add("invalid");
    const error = field.closest("label")?.querySelector("small");
    if (error) error.textContent = message;
  }

  function validateStep(number) {
    const step = steps[number - 1];
    let valid = true;
    const controls = [...step.querySelectorAll("input:not([type=radio]):not([type=checkbox]),select,textarea")];
    controls.forEach(field => {
      field.classList.remove("invalid");
      const error = field.closest("label")?.querySelector("small");
      if (error) error.textContent = "";
      if (!field.checkValidity()) {
        valid = false;
        const message = field.validity.valueMissing
          ? "Ce champ est obligatoire."
          : field.validity.patternMismatch
            ? "Utilisez le format demandé."
            : field.validity.tooShort
              ? `Écrivez au moins ${field.minLength} caractères.`
              : "Veuillez vérifier ce champ.";
        setFieldError(field, message);
      }
    });

    [...step.querySelectorAll("input[type=checkbox]")].forEach(field => {
      field.classList.remove("invalid");
      if (!field.checkValidity()) {
        valid = false;
        field.classList.add("invalid");
      }
    });

    const radioNames = [...new Set([...step.querySelectorAll("input[type=radio]")].map(field => field.name))];
    radioNames.forEach(name => {
      const radios = [...step.querySelectorAll(`input[type=radio][name="${name}"]`)];
      const error = step.querySelector(`[data-error-for="${name}"]`);
      const checked = radios.some(field => field.checked);
      const required = radios.some(field => field.required);
      radios.forEach(field => field.classList.toggle("invalid", required && !checked));
      if (error) error.textContent = required && !checked ? "Ce champ est obligatoire." : "";
      if (required && !checked) valid = false;
    });

    if (!valid) step.querySelector(".invalid")?.focus();
    return valid;
  }

  function renderSummary() {
    const box = document.querySelector("#summary");
    box.innerHTML = "";
    Object.entries(labels).forEach(([name, label]) => {
      const item = document.createElement("div");
      item.className = "summary-item";
      const title = document.createElement("small");
      const content = document.createElement("p");
      title.textContent = label;
      content.textContent = fieldValue(name) || (name === "additional" ? "Aucune information complémentaire." : "Non renseigné");
      item.append(title, content);
      box.append(item);
    });
  }

  function showStep(number) {
    current = number;
    steps.forEach(step => step.classList.toggle("active", Number(step.dataset.step) === number));
    indicators.forEach((item, index) => {
      item.classList.toggle("active", index + 1 === number);
      item.classList.toggle("complete", index + 1 < number);
    });
    previous.classList.toggle("hidden", number === 1);
    next.classList.toggle("hidden", number === lastStep);
    submit.classList.toggle("hidden", number !== lastStep);
    if (number === lastStep) renderSummary();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function payload() {
    return {
      rpName: fieldValue("rpName"),
      gender: fieldValue("gender"),
      age: fieldValue("age"),
      nationality: fieldValue("nationality"),
      phone: fieldValue("phone"),
      background: fieldValue("background"),
      additional: fieldValue("additional"),
      discordId: fieldValue("discordId"),
      accuracy: form.elements.accuracy.checked
    };
  }

  async function sendApplication() {
    if (submit.disabled) return;
    submit.disabled = true;
    submit.textContent = "Transmission en cours…";
    submitError.classList.add("hidden");
    try {
      const response = await fetch("/api/applications/submit", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload())
      });
      const result = await response.json().catch(() => ({}));
      if (response.status === 409 && result.applicationId) {
        location.assign(`success.html?id=${encodeURIComponent(result.applicationId)}&existing=1`);
        return;
      }
      if (!response.ok || !result.ok) throw new Error(result.code || "internal_error");
      localStorage.removeItem(draftKey);
      const successParams = new URLSearchParams({id:result.applicationId});
      if (/^\d{17,20}$/.test(result.channelId || '')) successParams.set('channel',result.channelId);
      if (result.ticketPending) successParams.set('pending','1');
      if (result.existing) successParams.set('existing','1');
      location.assign(`success.html?${successParams}`);
    } catch (error) {
      const messages = {
        invalid_application: "Certaines informations n’ont pas pu être traitées.",
        recruitment_closed: "Les recrutements sont momentanément fermés.",
        database_not_configured: "Le service de candidature n’est pas encore configuré.",
        database_not_ready: "Le service de candidature n’est pas encore prêt.",
        database_error: "La candidature n’a pas pu être enregistrée. Réessayez dans quelques instants.",
        candidate_login_required: "Votre session Discord a expiré. Reconnectez-vous avant d’envoyer la candidature."
        , academy_membership_required: "Rejoignez à nouveau le serveur Police Academy en vous reconnectant via Discord.", ticket_busy: "Votre ticket est en cours de création. Réessayez dans quelques instants.", active_application: "Une candidature est déjà en cours pour ces informations."
      };
      submitError.textContent = messages[error.message] || "La candidature n’a pas pu être transmise. Réessayez.";
      submitError.classList.remove("hidden");
      submit.disabled = false;
      submit.textContent = submitLabel;
    }
  }

  restoreDraft(); updateCounters();
  form.addEventListener("input", () => { saveDraft(); updateCounters(); });
  form.addEventListener("change", () => { saveDraft(); updateCounters(); });
  next.addEventListener("click", () => { if (validateStep(current)) showStep(Math.min(current + 1, lastStep)); });
  previous.addEventListener("click", () => showStep(Math.max(current - 1, 1)));
  form.addEventListener("submit", event => { event.preventDefault(); if (validateStep(current)) sendApplication(); });
  loadRecruitmentSettings();
  verifyCandidate();
})();
