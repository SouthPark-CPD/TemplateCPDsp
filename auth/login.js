const loginButton=document.querySelector("#discord-login");
const authMessage=document.querySelector("#auth-message");
loginButton.href="/api/auth/discord";

const errors={
  cancelled:"La connexion Discord a été annulée.",
  invalid_state:"La demande de connexion a expiré. Merci de réessayer.",
  login_required:"Connectez-vous pour accéder au MDT.",
  invalid_session:"Votre session n’est plus valide. Merci de vous reconnecter.",
  session_expired:"Votre session a expiré. Merci de vous reconnecter.",
  discord_unavailable:"Discord est momentanément indisponible. Merci de réessayer.",
  config:"Le service de connexion n’est pas encore correctement configuré."
};
const error=new URLSearchParams(location.search).get("error");
if(error&&errors[error]){authMessage.hidden=false;authMessage.textContent=errors[error];}

if(!error){
  fetch("/api/auth/session",{credentials:"same-origin",cache:"no-store"})
    .then(response=>response.ok?response.json():null)
    .then(data=>{if(data&&data.authenticated)location.replace("/mdt/");})
    .catch(()=>{});
}
