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
  const lastStep = steps.length;
  let current = 1;

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
      location.assign(`success.html?id=${encodeURIComponent(result.applicationId)}`);
    } catch (error) {
      const messages = {
        invalid_application: "Certaines informations n’ont pas pu être traitées.",
        database_not_configured: "Le service de candidature n’est pas encore configuré.",
        database_not_ready: "Le service de candidature n’est pas encore prêt.",
        database_error: "La candidature n’a pas pu être enregistrée. Réessayez dans quelques instants."
      };
      submitError.textContent = messages[error.message] || "La candidature n’a pas pu être transmise. Réessayez.";
      submitError.classList.remove("hidden");
      submit.disabled = false;
      submit.textContent = "Envoyer ma candidature →";
    }
  }

  restoreDraft(); updateCounters();
  form.addEventListener("input", () => { saveDraft(); updateCounters(); });
  form.addEventListener("change", () => { saveDraft(); updateCounters(); });
  next.addEventListener("click", () => { if (validateStep(current)) showStep(Math.min(current + 1, lastStep)); });
  previous.addEventListener("click", () => showStep(Math.max(current - 1, 1)));
  form.addEventListener("submit", event => { event.preventDefault(); if (validateStep(current)) sendApplication(); });
})();
