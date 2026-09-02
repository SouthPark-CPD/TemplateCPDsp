fetch("/api/academy-admin-auth/session", { credentials: "same-origin", cache: "no-store" })
  .then(response => {
    if (!response.ok) throw new Error("unauthorized");
    return response.json();
  })
  .then(data => {
    document.querySelector("#instructor-name").textContent = data.user.globalName || data.user.username;
  })
  .catch(() => location.replace("/academy-auth/login.html?error=login_required"));
