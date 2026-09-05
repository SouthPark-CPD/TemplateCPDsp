(() => {
  const params = new URLSearchParams(location.search);
  const applicationId = params.get("id") || "Non disponible";
  const existing = params.get("existing") === "1";
  document.querySelector("#application-id").textContent = applicationId;

  if (existing) {
    document.querySelector("#success-eyebrow").textContent = "Demande déjà enregistrée";
    document.querySelector("#success-title").textContent = "Votre candidature est déjà active";
    document.querySelector("#success-message").textContent = "Une demande récente utilise déjà ce numéro de téléphone. Un instructeur vous contactera en jeu.";
  }
})();
