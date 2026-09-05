// Keep the FiveM/OAuth callback URL; enter the common MDT after validation.
const message = document.querySelector("#portal-message");
fetch("/api/auth/session", { credentials: "same-origin", cache: "no-store" })
  .then(async response => {
    if (response.status === 401) { location.replace("/auth/login.html?error=login_required"); return; }
    if (!response.ok) throw new Error("session_unavailable");
    const data = await response.json();
    if (!data.authenticated) { location.replace("/auth/login.html?error=login_required"); return; }
    location.replace("/mdt/index.html");
  })
  .catch(() => { message.textContent = "Impossible de vérifier vos accès pour le moment. Actualisez la page."; });
