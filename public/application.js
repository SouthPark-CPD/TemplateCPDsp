(() => {
  const form = document.querySelector("#academy-form");
  if (!form) return;

  const draftKey = "cpd_academy_draft_v2";
  const steps = [...document.querySelectorAll(".form-step")];
  const indicators = [...document.querySelectorAll("[data-indicator]")];
  const previous = document.querySelector("#previous");
  const next = document.querySelector("#next");
  const submit = document.querySelector("#submit");
  const submitError = document.querySelector("#submit-error");
  let current = 1;

  const labels = {
    firstName: "Prénom RP", lastName: "Nom RP", age: "Âge RP",
    phone: "Téléphone en jeu", policeExperience: "Expérience police RP",
    experience: "Expérience RP", availability: "Disponibilités",
    motivation: "Motivation", qualities: "Qualités d’un policier"
  };

  function saveDraft() {
    const data = Object.fromEntries(new FormData(form));
    delete data.accuracy;
    localStorage.setItem(draftKey, JSON.stringify(data));
  }

  function restoreDraft() {
    try {
      const data = JSON.parse(localStorage.getItem(draftKey) || "{}");
      Object.entries(data).forEach(([name, value]) => {
        if (form.elements[name]) form.elements[name].value = value;
      });
    } catch { localStorage.removeItem(draftKey); }
  }

  function updateCounters() {
    document.querySelectorAll("[data-counter]").forEach(counter => {
      const field = form.elements[counter.dataset.counter];
      counter.textContent = `${field.value.length} / ${field.maxLength}`;
    });
  }

  function validateStep(number) {
    const fields = [...steps[number - 1].querySelectorAll("input,select,textarea")];
    let valid = true;
    fields.forEach(field => {
      const error = field.closest("label")?.querySelector("small");
      field.classList.remove("invalid");
      if (error) error.textContent = "";
      if (!field.checkValidity()) {
        valid = false;
        field.classList.add("invalid");
        if (error) error.textContent = field.validity.valueMissing ? "Ce champ est obligatoire." : "Veuillez vérifier ce champ.";
      }
    });
    fields.find(field => !field.checkValidity())?.focus();
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
      content.textContent = form.elements[name]?.value || "Non renseigné";
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
    next.classList.toggle("hidden", number === 4);
    submit.classList.toggle("hidden", number !== 4);
    if (number === 4) renderSummary();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function payload() {
    return {
      firstName: form.elements.firstName.value,
      lastName: form.elements.lastName.value,
      age: Number(form.elements.age.value),
      phone: form.elements.phone.value,
      policeExperience: form.elements.policeExperience.value,
      experience: form.elements.experience.value,
      availability: form.elements.availability.value,
      motivation: form.elements.motivation.value,
      qualities: form.elements.qualities.value,
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
        invalid_application: "Vérifiez les informations saisies, notamment le numéro de téléphone.",
        database_not_configured: "Le service de candidature n’est pas encore configuré.",
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
  next.addEventListener("click", () => { if (validateStep(current)) showStep(current + 1); });
  previous.addEventListener("click", () => showStep(current - 1));
  form.addEventListener("submit", event => { event.preventDefault(); if (validateStep(current)) sendApplication(); });
})();
