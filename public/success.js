(() => {
  const params = new URLSearchParams(location.search);
  const applicationId = params.get("id") || "Non disponible";
  const ticketUrl = params.get("ticket") || "";
  const existing = params.get("existing") === "1";
  document.querySelector("#application-id").textContent = applicationId;

  const ticketLink = document.querySelector("#ticket-link");
  if (/^https:\/\/discord\.com\/channels\/\d+\/\d+$/.test(ticketUrl)) {
    ticketLink.href = ticketUrl;
  } else {
    ticketLink.classList.add("hidden");
  }

  if (existing) {
    document.querySelector("#success-eyebrow").textContent = "Candidature déjà active";
    document.querySelector("#success-title").textContent = "Votre ticket existe déjà";
    document.querySelector("#success-message").textContent = "Une candidature est déjà ouverte avec votre compte Discord. Utilisez le ticket existant pour échanger avec l'équipe Police Academy.";
  }
})();
