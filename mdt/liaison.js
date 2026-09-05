(()=>{
 const form=document.getElementById('complaint-form'),button=document.getElementById('submit-complaint'),status=document.getElementById('complaint-status'),description=document.getElementById('complaint-description'),counter=document.getElementById('description-count');
 const setStatus=(message,type)=>{status.hidden=false;status.className=`status ${type||''}`;status.innerHTML=message};
 const escapeHtml=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const updateCount=()=>{counter.textContent=`${description.value.length} / 5000`}; description.addEventListener('input',updateCount);updateCount();
 const date=document.getElementById('complaint-date'); if(date&&!date.value){const now=new Date();now.setMinutes(now.getMinutes()-now.getTimezoneOffset());date.value=now.toISOString().slice(0,16)}
 form.addEventListener('submit',async event=>{event.preventDefault();if(!description.value.trim()){setStatus('La description des faits est obligatoire.','error');description.focus();return}button.disabled=true;setStatus('Transmission du dépôt…');
  const payload=Object.fromEntries(new FormData(form).entries());
  try{const response=await fetch('/api/liaison/complaints',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});const data=await response.json().catch(()=>({}));if(response.status===401){location.href='/auth/login.html?error=login_required';return}if(!response.ok)throw new Error(data.code||data.error||'discord_unavailable');
   setStatus(`Dépôt enregistré sous <strong>${escapeHtml(data.complaintId)}</strong>. <a href="${escapeHtml(data.url||'#')}" target="_blank" rel="noopener">Ouvrir le dossier Discord ↗</a>`,'ok');form.reset();updateCount();
  }catch(error){const messages={description_required:'La description des faits est obligatoire.',forum_forbidden:'Le bot Discord n’a pas les droits nécessaires sur le forum.',discord_unavailable:'Discord est momentanément indisponible. Réessayez dans quelques instants.'};setStatus(messages[error.message]||'Impossible d’enregistrer le dépôt. Réessayez.','error')}finally{button.disabled=false}
 });
})();
