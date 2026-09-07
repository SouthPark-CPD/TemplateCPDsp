(() => {
  const params = new URLSearchParams(location.search);
  const applicationId = params.get("id") || "Non disponible";
  const existing = params.get("existing") === "1";
  document.querySelector("#application-id").textContent = applicationId;

  if (existing) {
    document.querySelector("#success-eyebrow").textContent = "Demande déjà enregistrée";
    document.querySelector("#success-title").textContent = "Votre candidature est déjà active";
    document.querySelector("#success-message").textContent = "Votre candidature est déjà enregistrée. Retrouvez les instructeurs dans votre ticket Discord Police Academy.";
  }
  const channel = params.get("channel");
  if (/^\d{17,20}$/.test(channel || "")) {
    const link=document.createElement("a");link.className="discord-button";link.href=`https://discord.com/channels/1538858756354473984/${channel}`;link.textContent="Ouvrir mon ticket Discord";link.target="_blank";link.rel="noopener";document.querySelector(".success-card").append(link);
  }
  if (params.get("pending") === "1") {
    document.querySelector("#success-message").textContent="Votre candidature est enregistrée, mais le ticket Discord n’a pas pu être finalisé. Les instructeurs peuvent relancer sa création. Vous pouvez aussi revenir au formulaire et renvoyer : votre candidature existante sera reprise.";
    const retry=document.createElement("a");retry.className="discord-button";retry.href="/api/candidate-auth/discord";retry.textContent="Rejoindre la Police Academy et reprendre";document.querySelector(".success-card").append(retry);
  }
})();
