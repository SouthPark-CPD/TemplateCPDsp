(() => {
  const form = document.querySelector("#academy-form");
  if (!form) return;

  const key = "cpd_academy_draft_v1";
  const steps = [...document.querySelectorAll(".form-step")];
  const indicators = [...document.querySelectorAll("[data-indicator]")];
  const previous = document.querySelector("#previous");
  const next = document.querySelector("#next");
  const submit = document.querySelector("#submit");
  let current = 1;
  let candidateUser = null;
  const labels = {
    firstName: "Prénom RP", lastName: "Nom RP", age: "Âge RP", playerId: "Identifiant joueur",
    policeExperience: "Expérience police RP", experience: "Expérience RP",
    availability: "Disponibilités", motivation: "Motivation", qualities: "Qualités d'un policier"
  };

  async function candidateSession() {
    const profile = document.querySelector("#candidate-profile");
    const error = document.querySelector("#auth-error");
    const reason = new URLSearchParams(location.search).get("auth_error");

    try {
      const response = await fetch("/api/candidate-auth/session", { credentials: "same-origin", cache: "no-store" });
      if (!response.ok) throw new Error("login_required");
      const { user } = await response.json();
      candidateUser = user;
      document.querySelector("#candidate-name").textContent = user.globalName || user.username;
      const avatar = document.querySelector("#candidate-avatar");
      avatar.src = user.avatar ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=128` : "../assets/cpd-seal.png";
      avatar.alt = `Avatar de ${user.globalName || user.username}`;
      profile.classList.remove("hidden");
      document.querySelector("#verified-name").textContent = user.globalName || user.username;
      const verifiedAvatar = document.querySelector("#verified-avatar");
      verifiedAvatar.src = avatar.src;
      verifiedAvatar.alt = avatar.alt;
      document.querySelector("#verified-user").classList.remove("hidden");
      document.querySelector("#verification-title").textContent = "Votre identité Discord est confirmée";
      document.querySelector("#verification-text").textContent = "Votre candidature peut maintenant être envoyée avec cette identité Discord.";
      submit.textContent = "Envoyer ma candidature →";
    } catch {
      if (reason) {
        const messages = {
          cancelled: "La connexion Discord a été annulée.",
          invalid_state: "La tentative de connexion a expiré. Veuillez recommencer.",
          discord: "Discord n'a pas pu confirmer votre identité. Veuillez réessayer.",
          config: "La connexion Discord n'est pas encore configurée."
        };
        error.textContent = messages[reason] || "La connexion n'a pas pu aboutir.";
        error.classList.remove("hidden");
      }
    } finally {
      if (localStorage.getItem(`${key}_resume_step`) === "4" || reason) {
        localStorage.removeItem(`${key}_resume_step`);
        if (sessionStorage.getItem(`${key}_accuracy`) === "1") form.elements.accuracy.checked = true;
        sessionStorage.removeItem(`${key}_accuracy`);
        show(4);
      }
    }
  }

  function save() {
    const data = Object.fromEntries(new FormData(form));
    delete data.accuracy;
    localStorage.setItem(key, JSON.stringify(data));
  }

  function restore() {
    try {
      const data = JSON.parse(localStorage.getItem(key) || "{}");
      Object.entries(data).forEach(([name, value]) => {
        if (form.elements[name]) form.elements[name].value = value;
      });
    } catch {
      localStorage.removeItem(key);
    }
  }

  function counters() {
    document.querySelectorAll("[data-counter]").forEach(counter => {
      const field = form.elements[counter.dataset.counter];
      counter.textContent = `${field.value.length} / ${field.maxLength}`;
    });
  }

  function validate(number) {
    let valid = true;
    const fields = [...steps[number - 1].querySelectorAll("input,select,textarea")];
    fields.forEach(field => {
      const error = field.closest("label")?.querySelector("small");
      field.classList.remove("invalid");
      if (error) error.textContent = "";
      if (!field.checkValidity()) {
        valid = false;
        field.classList.add("invalid");
        if (error) {
          error.textContent = field.validity.valueMissing ? "Ce champ est obligatoire."
            : field.validity.tooShort ? `Réponse trop courte (${field.minLength} caractères minimum).`
              : "Veuillez vérifier ce champ.";
        }
      }
    });
    fields.find(field => !field.checkValidity())?.focus();
    return valid;
  }

  function summary() {
    const box = document.querySelector("#summary");
    box.innerHTML = "";
    Object.entries(labels).forEach(([name, label]) => {
      const item = document.createElement("div");
      const title = document.createElement("small");
      const content = document.createElement("p");
      item.className = "summary-item";
      title.textContent = label;
      content.textContent = form.elements[name]?.value || "Non renseigné";
      item.append(title, content);
      box.append(item);
    });
  }

  function show(number) {
    current = number;
    steps.forEach(step => step.classList.toggle("active", Number(step.dataset.step) === number));
    indicators.forEach((item, index) => {
      item.classList.toggle("active", index + 1 === number);
      item.classList.toggle("complete", index + 1 < number);
    });
    previous.classList.toggle("hidden", number === 1);
    next.classList.toggle("hidden", number === 4);
    submit.classList.toggle("hidden", number !== 4);
    if (number === 4) summary();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function applicationPayload() {
    return {
      firstName: form.elements.firstName.value,
      lastName: form.elements.lastName.value,
      age: Number(form.elements.age.value),
      playerId: form.elements.playerId.value,
      policeExperience: form.elements.policeExperience.value,
      experience: form.elements.experience.value,
      availability: form.elements.availability.value,
      motivation: form.elements.motivation.value,
      qualities: form.elements.qualities.value,
      accuracy: form.elements.accuracy.checked
    };
  }

  function submissionError(code) {
    const messages = {
      academy_membership_required: "Vous devez être membre du serveur Discord Police Academy avant d'envoyer votre candidature.",
      bot_not_configured: "L'envoi des candidatures n'est pas encore configuré. Veuillez réessayer plus tard.",
      invalid_ticket_category: "La catégorie des candidatures est incorrectement configurée.",
      discord_api_error: "Le bot n'a pas pu créer le ticket. Vérifiez ses permissions puis réessayez.",
      invalid_application: "Certaines réponses ne respectent pas les critères du formulaire.",
      internal_error: "Une erreur inattendue est survenue. Veuillez réessayer.",
      network_error: "Le site n'a pas pu contacter le service de candidature. Vérifiez votre connexion."
    };
    const error = document.querySelector("#auth-error");
    error.textContent = messages[code] || "La candidature n'a pas pu être envoyée.";
    error.classList.remove("hidden");
    error.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  async function sendApplication() {
    submit.disabled = true;
    submit.textContent = "Création du ticket…";
    document.querySelector("#auth-error").classList.add("hidden");
    try {
      const response = await fetch("/api/applications/submit", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(applicationPayload())
      });
      const result = await response.json().catch(() => ({ ok: false, code: "internal_error" }));
      if (response.status === 401) {
        candidateUser = null;
        save();
        localStorage.setItem(`${key}_resume_step`, "4");
        sessionStorage.setItem(`${key}_accuracy`, "1");
        window.location.assign("/api/candidate-auth/discord");
        return;
      }
      if (response.status === 409 && result.channelUrl) {
        window.location.assign(`success.html?id=${encodeURIComponent(result.applicationId)}&ticket=${encodeURIComponent(result.channelUrl)}&existing=1`);
        return;
      }
      if (!response.ok || !result.ok) throw new Error(result.code || "internal_error");
      localStorage.removeItem(key);
      localStorage.removeItem(`${key}_resume_step`);
      sessionStorage.removeItem(`${key}_accuracy`);
      window.location.assign(`success.html?id=${encodeURIComponent(result.applicationId)}&ticket=${encodeURIComponent(result.channelUrl)}`);
    } catch (error) {
      submissionError(error.message === "Failed to fetch" ? "network_error" : error.message);
      submit.disabled = false;
      submit.textContent = "Envoyer ma candidature →";
    }
  }

  restore();
  counters();
  candidateSession();
  form.addEventListener("input", () => { save(); counters(); });
  next.addEventListener("click", () => { if (validate(current)) show(current + 1); });
  previous.addEventListener("click", () => show(current - 1));
  form.addEventListener("submit", event => {
    event.preventDefault();
    if (!validate(current)) return;
    if (!candidateUser) {
      save();
      localStorage.setItem(`${key}_resume_step`, "4");
      sessionStorage.setItem(`${key}_accuracy`, "1");
      window.location.assign("/api/candidate-auth/discord");
      return;
    }
    sendApplication();
  });
})();
