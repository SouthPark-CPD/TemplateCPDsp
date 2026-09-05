const message = document.querySelector("#portal-message");
const content = document.querySelector("#portal-content");
const academyCard = document.querySelector("#academy-card");
const academyLocked = document.querySelector("#academy-locked");
const agentName = document.querySelector("#agent-name");
const academySummary = document.querySelector("#academy-summary");
const academySummaryTitle = document.querySelector("#academy-summary-title");
const academySummaryDetail = document.querySelector("#academy-summary-detail");
const academySummaryCount = document.querySelector("#academy-summary-count");
const academyCardBadge = document.querySelector("#academy-card-badge");

function renderAcademySummary(summary) {
  const newCount = Number(summary?.newCount || 0);
  const toContactCount = Number(summary?.toContactCount || 0);
  const pendingCount = newCount + toContactCount;
  academySummaryCount.textContent = String(pendingCount);
  academyCardBadge.textContent = String(pendingCount);
  academyCardBadge.hidden = pendingCount === 0;
  if (pendingCount === 0) return;
  academySummaryTitle.textContent = `${pendingCount} candidature${pendingCount > 1 ? "s" : ""} à traiter`;
  academySummaryDetail.textContent = `${newCount} nouvelle${newCount > 1 ? "s" : ""} · ${toContactCount} à contacter`;
  academySummary.classList.add("has-pending");
}

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
    academySummary.hidden = !data.academyAccess || !data.academySummary;
    if (data.academyAccess && data.academySummary) renderAcademySummary(data.academySummary);
    message.hidden = true;
    content.hidden = false;
  })
  .catch(() => {
    message.textContent = "Impossible de vérifier vos accès pour le moment. Actualisez la page.";
  });
