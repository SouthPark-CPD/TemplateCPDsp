const message = document.querySelector("#portal-message");
const content = document.querySelector("#portal-content");
const academyCard = document.querySelector("#academy-card");
const academyLocked = document.querySelector("#academy-locked");
const agentName = document.querySelector("#agent-name");

fetch("/api/auth/session", { credentials: "same-origin", cache: "no-store" })
  .then(async response => {
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.authenticated) {
      location.replace("/auth/login.html?error=login_required");
      return null;
    }
    return data;
  })
  .then(data => {
    if (!data) return;
    agentName.textContent = data.user.globalName || data.user.username || "Agent";
    academyCard.hidden = !data.academyAccess;
    academyLocked.hidden = data.academyAccess;
    message.hidden = true;
    content.hidden = false;
  })
  .catch(() => {
    message.textContent = "Impossible de vérifier vos accès pour le moment. Actualisez la page.";
  });
