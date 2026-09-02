const message = document.querySelector("#auth-message");
const errors = {
  cancelled: "La connexion Discord a été annulée.",
  invalid_state: "La demande a expiré. Merci de recommencer.",
  login_required: "Connectez-vous pour accéder à l’espace Instructor.",
  invalid_session: "Votre session n’est plus valide.",
  session_expired: "Votre session a expiré. Merci de vous reconnecter.",
  membership: "Votre compte n’est pas membre du serveur Police Academy.",
  discord: "Discord est momentanément indisponible.",
  discord_unavailable: "Discord est momentanément indisponible.",
  config: "Le service de connexion n’est pas correctement configuré."
};

const error = new URLSearchParams(location.search).get("error");
if (error && errors[error]) {
  message.hidden = false;
  message.textContent = errors[error];
} else {
  fetch("/api/academy-admin-auth/session", { credentials: "same-origin", cache: "no-store" })
    .then(response => response.ok ? response.json() : null)
    .then(data => {
      if (data?.authenticated) location.replace("/academy-admin/");
    })
    .catch(() => {});
}
