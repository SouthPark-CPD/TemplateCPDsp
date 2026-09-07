(() => {
  const TOKEN = /!\[Capture CPD\]\(\/api\/police-media\?id=([0-9a-f-]{36})\)/gi;
  const MAX_DIMENSION = 1920;
  const MAX_BYTES = 1_500_000;
  let toastTimer;

  function notify(message, error = false) {
    let node = document.querySelector(".cpd-paste-toast");
    if (!node) { node = document.createElement("div"); node.className = "cpd-paste-toast"; document.body.append(node); }
    node.textContent = message;
    node.classList.toggle("error", error);
    node.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { node.hidden = true; }, 4200);
  }

  function imageFiles(event) {
    return [...(event.clipboardData?.items || [])].filter(item => item.kind === "file" && item.type.startsWith("image/")).map(item => item.getAsFile()).filter(Boolean).slice(0, 3);
  }

  function nativeFileInput(target) {
    const form = target.closest("form");
    if (!form) return null;
    const input = form.querySelector('input[type="file"][accept*="image"]');
    if (!input || input.disabled || input.closest("[hidden]")) return null;
    return input;
  }

  function destinationField(target) {
    if (target instanceof HTMLTextAreaElement) return target;
    const fields = [...(target.closest?.("form")?.querySelectorAll("textarea") || [])].filter(field => !field.disabled && !field.readOnly && !field.closest("[hidden]"));
    return fields.find(field => /note|comment|description|content|message|rapport|motif|raison/i.test(`${field.id} ${field.name}`)) || fields.at(-1) || null;
  }

  function addNativeFiles(input, files) {
    try {
      const transfer = new DataTransfer();
      const combined = [...input.files, ...files];
      const maxFiles = Number(input.dataset.maxAttachments || (input.multiple ? 8 : 1));
      const maxFileBytes = Number(input.dataset.maxAttachmentBytes || MAX_BYTES);
      const maxTotalBytes = Number(input.dataset.maxTotalBytes || MAX_BYTES * Math.max(1, maxFiles));
      if (combined.length > maxFiles || combined.some(file => file.size > maxFileBytes) || combined.reduce((sum, file) => sum + file.size, 0) > maxTotalBytes) return false;
      combined.forEach(file => transfer.items.add(file));
      input.files = transfer.files;
      input.dispatchEvent(new Event("change", { bubbles: true }));
      notify(`${files.length} capture${files.length > 1 ? "s" : ""} ajoutée${files.length > 1 ? "s" : ""} aux pièces jointes.`);
      return true;
    } catch { return false; }
  }

  function loadImage(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file), image = new Image();
      image.onload = () => { URL.revokeObjectURL(url); resolve(image); };
      image.onerror = () => { URL.revokeObjectURL(url); reject(new Error("image_decode_failed")); };
      image.src = url;
    });
  }

  function canvasBlob(canvas, type, quality) {
    return new Promise(resolve => canvas.toBlob(resolve, type, quality));
  }

  async function optimize(file) {
    const image = await loadImage(file);
    const scale = Math.min(1, MAX_DIMENSION / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    canvas.getContext("2d", { alpha: false }).drawImage(image, 0, 0, canvas.width, canvas.height);
    let blob = await canvasBlob(canvas, "image/webp", .84);
    if (!blob || blob.size > MAX_BYTES) blob = await canvasBlob(canvas, "image/jpeg", .76);
    if (!blob || blob.size > MAX_BYTES) blob = await canvasBlob(canvas, "image/jpeg", .58);
    if (!blob || blob.size > MAX_BYTES) throw new Error("image_too_large");
    return new File([blob], `capture-${Date.now()}.${blob.type === "image/webp" ? "webp" : "jpg"}`, { type: blob.type });
  }

  function dataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error("file_read_failed"));
      reader.readAsDataURL(file);
    });
  }

  async function upload(file) {
    const optimized = await optimize(file);
    const response = await fetch("/api/police-media", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: optimized.name, type: optimized.type, data: await dataUrl(optimized) }) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.ok) throw new Error(result.code || "upload_failed");
    return { id: result.id, token: `![Capture CPD](/api/police-media?id=${result.id})` };
  }

  function insertToken(field, token) {
    const value = field.value || "", start = Number.isInteger(field.selectionStart) ? field.selectionStart : value.length, end = Number.isInteger(field.selectionEnd) ? field.selectionEnd : start;
    const prefix = start && !/\n$/.test(value.slice(0, start)) ? "\n" : "";
    const suffix = end < value.length && !/^\n/.test(value.slice(end)) ? "\n" : "";
    const addition = `${prefix}${token}${suffix}`;
    if (field.maxLength > 0 && value.length - (end - start) + addition.length > field.maxLength) throw new Error("field_too_short");
    field.setRangeText(addition, start, end, "end");
    field.dispatchEvent(new Event("input", { bubbles: true }));
    syncPreview(field);
  }

  function idsFromValue(value) {
    const ids = [];
    TOKEN.lastIndex = 0;
    for (const match of String(value || "").matchAll(TOKEN)) if (!ids.includes(match[1])) ids.push(match[1]);
    TOKEN.lastIndex = 0;
    return ids;
  }

  function syncPreview(field) {
    if (!(field instanceof HTMLTextAreaElement)) return;
    let tray = field.nextElementSibling?.classList.contains("cpd-clipboard-preview") ? field.nextElementSibling : null;
    const ids = idsFromValue(field.value);
    if (!tray && ids.length) { tray = document.createElement("div"); tray.className = "cpd-clipboard-preview"; field.insertAdjacentElement("afterend", tray); }
    if (!tray) return;
    tray.innerHTML = ids.map(id => `<figure class="cpd-clipboard-thumb"><a href="/api/police-media?id=${id}" target="_blank" rel="noopener"><img src="/api/police-media?id=${id}" alt="Capture jointe" loading="lazy"><figcaption>Capture jointe</figcaption></a><button class="cpd-clipboard-remove" type="button" data-remove-media="${id}" aria-label="Retirer cette capture">×</button></figure>`).join("");
    tray.hidden = !ids.length;
    tray.querySelectorAll("[data-remove-media]").forEach(button => button.addEventListener("click", () => {
      const id = button.dataset.removeMedia, pattern = new RegExp(`(?:\\r?\\n)?!\\[Capture CPD\\]\\(\\/api\\/police-media\\?id=${id}\\)(?:\\r?\\n)?`, "gi");
      field.value = field.value.replace(pattern, "\n").replace(/^\n|\n$/g, "");
      field.dispatchEvent(new Event("input", { bubbles: true }));
      syncPreview(field);
    }));
  }

  function renderTokens(root = document.body) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) { TOKEN.lastIndex = 0; if (TOKEN.test(walker.currentNode.nodeValue || "")) nodes.push(walker.currentNode); }
    TOKEN.lastIndex = 0;
    nodes.forEach(node => {
      const parent = node.parentElement;
      if (!parent || parent.closest("textarea,input,script,style,option,button,.cpd-clipboard-preview,.cpd-inline-media")) return;
      const text = node.nodeValue || "", fragment = document.createDocumentFragment();
      let cursor = 0;
      TOKEN.lastIndex = 0;
      for (const match of text.matchAll(TOKEN)) {
        fragment.append(document.createTextNode(text.slice(cursor, match.index)));
        const link = document.createElement("a");
        link.className = "cpd-inline-media";
        link.href = `/api/police-media?id=${match[1]}`;
        link.target = "_blank";
        link.rel = "noopener";
        link.innerHTML = `<img src="${link.href}" alt="Capture jointe" loading="lazy"><span>Ouvrir la capture</span>`;
        fragment.append(link);
        cursor = match.index + match[0].length;
      }
      fragment.append(document.createTextNode(text.slice(cursor)));
      node.replaceWith(fragment);
    });
    TOKEN.lastIndex = 0;
  }

  document.addEventListener("paste", async event => {
    const files = imageFiles(event);
    if (!files.length) return;
    const native = nativeFileInput(event.target);
    if (native) {
      event.preventDefault();
      try {
        const optimized = [];
        for (const file of files) optimized.push(await optimize(file));
        if (!addNativeFiles(native, optimized)) throw new Error("attachment_failed");
      } catch { notify("Impossible d’ajouter cette capture aux pièces jointes.", true); }
      return;
    }
    const field = destinationField(event.target);
    if (!field) { notify("Ce formulaire ne possède pas de zone adaptée pour joindre une capture.", true); return; }
    event.preventDefault();
    const loading = document.createElement("span");
    loading.className = "cpd-paste-loading";
    loading.textContent = "Ajout de la capture…";
    const currentPreview = field.nextElementSibling?.classList.contains("cpd-clipboard-preview") ? field.nextElementSibling : null;
    (currentPreview || field).insertAdjacentElement("afterend", loading);
    try {
      for (const file of files) insertToken(field, (await upload(file)).token);
      notify(`${files.length} capture${files.length > 1 ? "s" : ""} enregistrée${files.length > 1 ? "s" : ""}.`);
    } catch (error) {
      const messages = { image_too_large: "La capture reste trop volumineuse après compression.", field_too_short: "Ce champ est trop court pour recevoir une capture.", upload_rate_limited: "Trop de captures ont été envoyées. Réessaie plus tard.", login_required: "Ta session a expiré. Reconnecte-toi." };
      notify(messages[error.message] || "Impossible d’enregistrer cette capture.", true);
    } finally { loading.remove(); }
  });

  document.addEventListener("input", event => { if (event.target instanceof HTMLTextAreaElement) syncPreview(event.target); });
  const refresh = root => { if (root.nodeType !== Node.ELEMENT_NODE && root !== document) return; root.querySelectorAll?.("textarea").forEach(syncPreview); renderTokens(root); };
  const observer = new MutationObserver(records => records.forEach(record => record.addedNodes.forEach(node => { if (node.nodeType === Node.ELEMENT_NODE) refresh(node); else if (node.nodeType === Node.TEXT_NODE && node.parentElement) renderTokens(node.parentElement); })));
  addEventListener("DOMContentLoaded", () => { refresh(document); observer.observe(document.body, { childList: true, subtree: true }); });
})();
