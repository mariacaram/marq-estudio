/* Panel Marq. — administración con contraseña.
   Habla con /api/gh (función en Vercel) que guarda el token real de GitHub. */
(function () {
  "use strict";

  const BRANCH = "master";
  const API = "/api/gh";
  const MAX_IMG = 1600;        // lado máximo al subir fotos
  const JPEG_Q = 0.82;

  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));

  let token = "";
  let data = null;          // site.json vivo (editable)
  let dataSha = null;       // sha actual de data/site.json
  let original = "";        // snapshot para detectar cambios
  let currentTab = "proyectos";
  let currentProj = null;   // slug del proyecto abierto

  /* ===== Utilidades ===== */
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  function toast(msg, isErr) {
    const t = $("#toast");
    t.textContent = msg;
    t.classList.toggle("err", !!isErr);
    t.classList.add("show");
    clearTimeout(t._t);
    t._t = setTimeout(() => t.classList.remove("show"), 4200);
  }

  function overlay(show, msg) {
    let o = $(".loading-overlay");
    if (!show) { if (o) o.remove(); return; }
    if (!o) { o = document.createElement("div"); o.className = "loading-overlay"; document.body.appendChild(o); }
    o.textContent = msg || "Cargando…";
  }

  function markDirty() {
    const dirty = JSON.stringify(data) !== original;
    $("#savebar").classList.toggle("show", dirty);
  }

  function slugify(s) {
    return String(s).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "proyecto";
  }

  // Base64 seguro para UTF-8
  function b64encode(str) {
    return btoa(new TextEncoder().encode(str).reduce((a, b) => a + String.fromCharCode(b), ""));
  }
  function b64decode(b64) {
    const bin = atob(b64.replace(/\n/g, ""));
    return new TextDecoder().decode(Uint8Array.from(bin, c => c.charCodeAt(0)));
  }

  /* ===== API (vía /api/gh, el token real queda en el servidor) ===== */
  async function gh(path, opts) {
    const method = (opts && opts.method) || "GET";
    const res = await fetch(API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clave: token, path, method, ref: BRANCH, body: opts && opts.body })
    });
    if (res.status === 404 && method === "GET") return null;
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.message || ("Error " + res.status));
    return json;
  }

  async function ghPut(path, contentB64, message, sha) {
    try {
      return await gh(path, {
        method: "PUT",
        body: { message, content: contentB64, branch: BRANCH, ...(sha ? { sha } : {}) }
      });
    } catch (e) {
      // Si el archivo ya existe y no teníamos su sha, lo buscamos y reintentamos (sobrescribir)
      if (!sha && /sha/i.test(e.message)) {
        const existing = await gh(path);
        if (existing && existing.sha) {
          return gh(path, {
            method: "PUT",
            body: { message, content: contentB64, branch: BRANCH, sha: existing.sha }
          });
        }
      }
      throw e;
    }
  }

  async function ghDelete(path, message, sha) {
    return gh(path, {
      method: "DELETE",
      body: { message, sha, branch: BRANCH }
    });
  }

  async function loadSite() {
    const f = await gh("data/site.json");
    if (!f) throw new Error("No se encontró data/site.json en el repositorio.");
    dataSha = f.sha;
    data = JSON.parse(b64decode(f.content));
    original = JSON.stringify(data);
  }

  async function saveSite() {
    overlay(true, "Publicando…");
    try {
      const json = JSON.stringify(data, null, 2);
      const res = await ghPut("data/site.json", b64encode(json), "Actualización desde el panel Marq.", dataSha);
      dataSha = res.content.sha;
      original = JSON.stringify(data);
      markDirty();
      toast("¡Listo! Los cambios estarán online en ~1 minuto.");
    } catch (e) {
      if (/does not match/.test(e.message)) {
        toast("Alguien más guardó cambios. Recargá la página e intentá de nuevo.", true);
      } else {
        toast("No se pudo publicar: " + e.message, true);
      }
    } finally { overlay(false); }
  }

  /* ===== Imágenes: redimensionar en el navegador ===== */
  function fileToResizedJpeg(file) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        let { width: w, height: h } = img;
        const scale = Math.min(1, MAX_IMG / Math.max(w, h));
        w = Math.round(w * scale); h = Math.round(h * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w; canvas.height = h;
        canvas.getContext("2d").drawImage(img, 0, 0, w, h);
        const dataUrl = canvas.toDataURL("image/jpeg", JPEG_Q);
        resolve(dataUrl.split(",")[1]); // base64 puro
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("No se pudo leer " + file.name)); };
      img.src = url;
    });
  }

  /* ===== Login ===== */
  async function tryLogin(tk, silent) {
    token = tk;
    overlay(true, "Verificando acceso…");
    try {
      await loadSite();
      if ($("#remember") && $("#remember").checked) localStorage.setItem("marq-token", tk);
      sessionStorage.setItem("marq-token-s", tk);
      $("#view-login").classList.add("hidden");
      $("#view-panel").classList.remove("hidden");
      $("#btn-logout").classList.remove("hidden");
      renderTab();
    } catch (e) {
      token = "";
      if (!silent) toast("No pudimos entrar: " + e.message, true);
      localStorage.removeItem("marq-token");
    } finally { overlay(false); }
  }

  $("#btn-login").addEventListener("click", () => {
    const tk = $("#token").value.trim();
    if (!tk) { toast("Escribí la contraseña.", true); return; }
    tryLogin(tk);
  });
  $("#token").addEventListener("keydown", e => { if (e.key === "Enter") $("#btn-login").click(); });
  $("#btn-logout").addEventListener("click", () => {
    localStorage.removeItem("marq-token");
    sessionStorage.removeItem("marq-token-s");
    location.reload();
  });

  /* ===== Tabs ===== */
  $("#tabs").addEventListener("click", e => {
    const b = e.target.closest(".tab");
    if (!b) return;
    $$(".tab").forEach(t => t.classList.remove("active"));
    b.classList.add("active");
    currentTab = b.dataset.tab;
    currentProj = null;
    renderTab();
  });

  $("#btn-save").addEventListener("click", saveSite);
  $("#btn-discard").addEventListener("click", () => {
    data = JSON.parse(original);
    markDirty();
    renderTab();
    toast("Cambios descartados.");
  });

  /* ===== Render de cada pestaña ===== */
  function renderTab() {
    const c = $("#tab-content");
    if (currentTab === "proyectos") return currentProj ? renderProyecto(c) : renderProyectos(c);
    if (currentTab === "inicio") return renderInicio(c);
    if (currentTab === "estudio") return renderEstudio(c);
    if (currentTab === "servicios") return renderServicios(c);
    if (currentTab === "contacto") return renderContacto(c);
    if (currentTab === "ajustes") return renderAjustes(c);
  }

  function bind(el, obj, key, transform) {
    el.addEventListener("input", () => {
      obj[key] = transform ? transform(el.value) : el.value;
      markDirty();
    });
  }

  function field(labelText, value, attrs) {
    return `<label class="f">${esc(labelText)}</label><input type="${(attrs && attrs.type) || "text"}" value="${esc(value)}" ${attrs && attrs.ph ? `placeholder="${esc(attrs.ph)}"` : ""} data-k="${attrs.k}">`;
  }

  /* ---- listas de texto editables (agregar / quitar) ---- */
  function listEditor(container, arr, placeholder) {
    const wrap = document.createElement("div");
    wrap.className = "list-edit";
    const paint = () => {
      wrap.innerHTML = arr.map((v, i) => `
        <div class="li">
          <input type="text" value="${esc(v)}" data-i="${i}">
          <button type="button" data-del="${i}" title="Quitar">✕</button>
        </div>`).join("") +
        `<div><button type="button" class="btn ghost small" data-add>+ Agregar</button></div>`;
    };
    paint();
    wrap.addEventListener("input", e => {
      const i = e.target.dataset.i;
      if (i !== undefined) { arr[Number(i)] = e.target.value; markDirty(); }
    });
    wrap.addEventListener("click", e => {
      if (e.target.dataset.del !== undefined) { arr.splice(Number(e.target.dataset.del), 1); paint(); markDirty(); }
      if (e.target.closest("[data-add]")) { arr.push(placeholder || ""); paint(); markDirty(); }
    });
    container.appendChild(wrap);
  }

  /* ---- Inicio ---- */
  function renderInicio(c) {
    c.innerHTML = `
      <div class="card">
        <h2>Portada del sitio</h2>
        <p class="help">Lo primero que ve la gente al entrar: la foto grande, el eslogan y la frase chica.</p>
        <label class="f">Eslogan (usá Enter para cortar la línea)</label>
        <textarea rows="2" id="i-eslogan">${esc(data.inicio.eslogan)}</textarea>
        ${field("Frase chica (debajo del eslogan)", data.inicio.sub, { k: "sub" })}
        <h3>Foto de fondo</h3>
        <p class="help">Ruta de una foto ya subida, por ejemplo <code>Proyectos/casa-san-pablo/01.jpg</code>. Elegí una foto horizontal y luminosa.</p>
        <input type="text" id="i-imagen" value="${esc(data.inicio.imagen)}">
        <div style="margin-top:0.8rem"><img id="i-prev" src="../${esc(data.inicio.imagen)}" alt="" style="max-width:340px;border:1px solid var(--line)"></div>
      </div>`;
    const eslogan = $("#i-eslogan"); bind(eslogan, data.inicio, "eslogan");
    const sub = c.querySelector('[data-k="sub"]'); bind(sub, data.inicio, "sub");
    const im = $("#i-imagen");
    im.addEventListener("input", () => { data.inicio.imagen = im.value; $("#i-prev").src = "../" + im.value; markDirty(); });
  }

  /* ---- Estudio ---- */
  function renderEstudio(c) {
    c.innerHTML = `
      <div class="card">
        <h2>Quiénes somos</h2>
        <label class="f">Título de la sección (Enter corta la línea)</label>
        <textarea rows="2" id="e-titulo">${esc(data.estudio.titulo)}</textarea>
        <h3>Párrafos de presentación</h3>
        <div id="e-parrafos"></div>
        <label class="f">Cita destacada</label>
        <textarea rows="2" id="e-cita">${esc(data.estudio.cita)}</textarea>
        <label class="f">Foto de la sección (ruta)</label>
        <input type="text" id="e-imagen" value="${esc(data.estudio.imagen)}">
      </div>
      <div class="card">
        <h2>Integrantes</h2>
        <p class="help">Las caras del estudio. La foto es opcional: si está vacía se muestra la .M.</p>
        <div id="e-team"></div>
      </div>`;
    bind($("#e-titulo"), data.estudio, "titulo");
    bind($("#e-cita"), data.estudio, "cita");
    bind($("#e-imagen"), data.estudio, "imagen");

    const pw = $("#e-parrafos");
    const paintP = () => {
      pw.innerHTML = data.estudio.parrafos.map((p, i) =>
        `<div style="display:flex;gap:0.5rem;margin-top:0.5rem"><textarea rows="3" data-i="${i}" style="margin:0">${esc(p)}</textarea><button type="button" class="btn ghost small" data-del="${i}">✕</button></div>`
      ).join("") + `<div style="margin-top:0.6rem"><button type="button" class="btn ghost small" data-add>+ Agregar párrafo</button></div>`;
    };
    paintP();
    pw.addEventListener("input", e => { if (e.target.dataset.i !== undefined) { data.estudio.parrafos[Number(e.target.dataset.i)] = e.target.value; markDirty(); } });
    pw.addEventListener("click", e => {
      if (e.target.dataset.del !== undefined) { data.estudio.parrafos.splice(Number(e.target.dataset.del), 1); paintP(); markDirty(); }
      if (e.target.closest("[data-add]")) { data.estudio.parrafos.push(""); paintP(); markDirty(); }
    });

    const tw = $("#e-team");
    const paintT = () => {
      tw.innerHTML = data.estudio.integrantes.map((m, i) => `
        <div class="card" style="margin-bottom:0.8rem">
          <div class="row">
            <div>${`<label class="f">Nombre</label><input type="text" value="${esc(m.nombre)}" data-i="${i}" data-k="nombre">`}</div>
            <div>${`<label class="f">Rol</label><input type="text" value="${esc(m.rol)}" data-i="${i}" data-k="rol">`}</div>
          </div>
          <label class="f">Bio corta</label>
          <textarea rows="2" data-i="${i}" data-k="bio">${esc(m.bio)}</textarea>
          <label class="f">Foto (opcional — subila en la pestaña Proyectos o pegá una ruta)</label>
          <input type="text" value="${esc(m.foto)}" data-i="${i}" data-k="foto" placeholder="assets/equipo/rosarito.jpg">
          <div style="margin-top:0.8rem"><button type="button" class="btn danger small" data-del="${i}">Quitar integrante</button></div>
        </div>`).join("") +
        `<button type="button" class="btn ghost small" data-add>+ Agregar integrante</button>`;
    };
    paintT();
    tw.addEventListener("input", e => {
      const { i, k } = e.target.dataset;
      if (i !== undefined && k) { data.estudio.integrantes[Number(i)][k] = e.target.value; markDirty(); }
    });
    tw.addEventListener("click", e => {
      if (e.target.dataset.del !== undefined) { data.estudio.integrantes.splice(Number(e.target.dataset.del), 1); paintT(); markDirty(); }
      if (e.target.closest("[data-add]")) { data.estudio.integrantes.push({ nombre: "", rol: "", bio: "", foto: "" }); paintT(); markDirty(); }
    });
  }

  /* ---- Servicios ---- */
  function renderServicios(c) {
    c.innerHTML = `
      <div class="card">
        <h2>Sección servicios</h2>
        <label class="f">Título (Enter corta la línea)</label>
        <textarea rows="2" id="s-titulo">${esc(data.servicios.titulo)}</textarea>
        <label class="f">Introducción</label>
        <textarea rows="2" id="s-intro">${esc(data.servicios.intro)}</textarea>
      </div>
      <div id="s-items"></div>`;
    bind($("#s-titulo"), data.servicios, "titulo");
    bind($("#s-intro"), data.servicios, "intro");

    const sw = $("#s-items");
    const paint = () => {
      sw.innerHTML = data.servicios.items.map((s, i) => `
        <div class="card">
          <div class="row">
            <div><label class="f">Nombre del programa</label><input type="text" value="${esc(s.nombre)}" data-i="${i}" data-k="nombre"></div>
            <div><label class="f">Precio "desde" (USD)</label><input type="number" value="${esc(s.desdeUSD)}" data-i="${i}" data-k="desdeUSD"></div>
          </div>
          <label class="f">Bajada (descripción corta)</label>
          <textarea rows="2" data-i="${i}" data-k="bajada">${esc(s.bajada)}</textarea>
          <h3>¿Para quién es? (situaciones)</h3>
          <div data-list="para" data-i="${i}"></div>
          <h3>Qué incluye (entregables)</h3>
          <div data-list="entregables" data-i="${i}"></div>
          <div style="margin-top:1rem"><button type="button" class="btn danger small" data-del="${i}">Eliminar este programa</button></div>
        </div>`).join("") +
        `<button type="button" class="btn ghost" data-add>+ Agregar programa</button>`;
      $$("[data-list]", sw).forEach(el => {
        const s = data.servicios.items[Number(el.dataset.i)];
        listEditor(el, s[el.dataset.list], "");
      });
    };
    paint();
    sw.addEventListener("input", e => {
      const { i, k } = e.target.dataset;
      if (i !== undefined && k) {
        const v = k === "desdeUSD" ? Number(e.target.value) || 0 : e.target.value;
        data.servicios.items[Number(i)][k] = v;
        markDirty();
      }
    });
    sw.addEventListener("click", e => {
      const del = e.target.closest("[data-del]");
      if (del && del.dataset.del !== undefined && confirm("¿Eliminar este programa de servicios?")) {
        data.servicios.items.splice(Number(del.dataset.del), 1); paint(); markDirty();
      }
      if (e.target.closest("[data-add]")) {
        data.servicios.items.push({ id: "nuevo-" + Date.now(), nombre: "Nuevo programa", desdeUSD: 0, bajada: "", para: [], entregables: [] });
        paint(); markDirty();
      }
    });
  }

  /* ---- Contacto ---- */
  function renderContacto(c) {
    c.innerHTML = `
      <div class="card">
        <h2>Sección contacto</h2>
        <label class="f">Título (Enter corta la línea)</label>
        <textarea rows="2" id="c-titulo">${esc(data.contacto.titulo)}</textarea>
        <label class="f">Introducción</label>
        <textarea rows="2" id="c-intro">${esc(data.contacto.intro)}</textarea>
        <h3>Opciones de "Mi proyecto necesita…"</h3>
        <div id="c-nec"></div>
      </div>`;
    bind($("#c-titulo"), data.contacto, "titulo");
    bind($("#c-intro"), data.contacto, "intro");
    listEditor($("#c-nec"), data.contacto.necesidades, "Nueva opción");
  }

  /* ---- Ajustes ---- */
  function renderAjustes(c) {
    const aj = data.ajustes;
    c.innerHTML = `
      <div class="card">
        <h2>Contacto y redes</h2>
        <p class="help">Estos datos alimentan los botones de WhatsApp, Instagram y la tienda en todo el sitio.</p>
        <label class="f">Instagram (link completo)</label>
        <input type="url" id="a-ig" value="${esc(aj.instagram)}">
        <label class="f">Email</label>
        <input type="text" id="a-email" value="${esc(aj.email)}">
        <label class="f">Link de la tienda (ecommerce) — dejalo vacío para ocultar el acceso</label>
        <input type="url" id="a-shop" value="${esc(aj.ecommerce)}" placeholder="https://…">
        <label class="f">Ubicación (texto del pie)</label>
        <input type="text" id="a-ubi" value="${esc(aj.ubicacion)}">
        <h3>WhatsApps</h3>
        <p class="help">Número con código de país y sin signos. Ejemplo: <code>5493816438080</code>.</p>
        <div id="a-was"></div>
      </div>
      <div class="card">
        <h2>Presupuestos</h2>
        <div class="row">
          <div>
            <label class="f">Precio mínimo de proyectos (USD)</label>
            <input type="number" id="a-min" value="${esc(aj.precioMinimoUSD)}">
            <p class="help" style="margin-top:0.5rem">Aparece como “Nuestros proyectos integrales parten de USD …” en el formulario de contacto.</p>
          </div>
          <div>
            <h3 style="margin-top:0.9rem">Rangos del filtro de presupuesto</h3>
            <div id="a-rangos"></div>
          </div>
        </div>
      </div>`;
    bind($("#a-ig"), aj, "instagram");
    bind($("#a-email"), aj, "email");
    bind($("#a-shop"), aj, "ecommerce");
    bind($("#a-ubi"), aj, "ubicacion");
    bind($("#a-min"), aj, "precioMinimoUSD", v => Number(v) || 0);
    listEditor($("#a-rangos"), aj.rangosPresupuesto, "Nuevo rango");

    const ww = $("#a-was");
    const paint = () => {
      ww.innerHTML = aj.whatsapps.map((w, i) => `
        <div class="row" style="align-items:end">
          <div><label class="f">Nombre</label><input type="text" value="${esc(w.nombre)}" data-i="${i}" data-k="nombre"></div>
          <div style="display:flex;gap:0.5rem;align-items:end">
            <div style="flex:1"><label class="f">Número</label><input type="text" value="${esc(w.numero)}" data-i="${i}" data-k="numero"></div>
            <button type="button" class="btn danger small" data-del="${i}" style="margin-bottom:1px">✕</button>
          </div>
        </div>`).join("") +
        `<div style="margin-top:0.7rem"><button type="button" class="btn ghost small" data-add>+ Agregar WhatsApp</button></div>`;
    };
    paint();
    ww.addEventListener("input", e => {
      const { i, k } = e.target.dataset;
      if (i !== undefined && k) { aj.whatsapps[Number(i)][k] = e.target.value.replace(k === "numero" ? /[^\d]/g : /$^/g, ""); markDirty(); }
    });
    ww.addEventListener("click", e => {
      if (e.target.dataset.del !== undefined) { aj.whatsapps.splice(Number(e.target.dataset.del), 1); paint(); markDirty(); }
      if (e.target.closest("[data-add]")) { aj.whatsapps.push({ nombre: "", numero: "" }); paint(); markDirty(); }
    });
  }

  /* ---- Proyectos: lista ---- */
  function renderProyectos(c) {
    c.innerHTML = `
      <div class="card">
        <h2>Proyectos</h2>
        <p class="help">Tocá un proyecto para editarlo, subir fotos, reordenarlas o cambiar sus tamaños. Arrastrá con la manija ↕ para cambiar el orden en la página.</p>
        <div class="plist" id="plist"></div>
        <div style="margin-top:1.2rem; display:flex; gap:0.6rem; flex-wrap:wrap; align-items:center">
          <input type="text" id="p-nuevo" placeholder="Nombre del nuevo proyecto" style="max-width:320px;margin:0">
          <button class="btn ghost" id="p-crear">+ Crear proyecto</button>
        </div>
      </div>`;
    const pl = $("#plist");
    const paint = () => {
      pl.innerHTML = data.proyectos.items.map((p, i) => `
        <div class="pitem" data-slug="${esc(p.slug)}" draggable="true" data-i="${i}">
          <span title="Arrastrar para reordenar" style="cursor:grab;color:var(--taupe)">↕</span>
          <img src="../Proyectos/${esc(p.slug)}/${esc(p.portada)}" alt="">
          <div><div class="t">${esc(p.titulo)}</div><div class="c">${esc(p.categoria)} · ${esc(p.anio)} — ${p.fotos.length} fotos</div></div>
          <span class="spacer"></span>
          <span style="color:var(--taupe)">Editar →</span>
        </div>`).join("");
    };
    paint();

    pl.addEventListener("click", e => {
      const it = e.target.closest(".pitem");
      if (it) { currentProj = it.dataset.slug; renderTab(); }
    });

    // drag & drop para reordenar proyectos
    let dragIdx = null;
    pl.addEventListener("dragstart", e => {
      const it = e.target.closest(".pitem");
      if (!it) return;
      dragIdx = Number(it.dataset.i);
      it.classList.add("dragging");
    });
    pl.addEventListener("dragend", e => { $$(".pitem", pl).forEach(x => x.classList.remove("dragging", "dropzone")); });
    pl.addEventListener("dragover", e => {
      e.preventDefault();
      const it = e.target.closest(".pitem");
      $$(".pitem", pl).forEach(x => x.classList.remove("dropzone"));
      if (it) it.classList.add("dropzone");
    });
    pl.addEventListener("drop", e => {
      e.preventDefault();
      const it = e.target.closest(".pitem");
      if (!it || dragIdx === null) return;
      const to = Number(it.dataset.i);
      const [moved] = data.proyectos.items.splice(dragIdx, 1);
      data.proyectos.items.splice(to, 0, moved);
      dragIdx = null; paint(); markDirty();
    });

    $("#p-crear").addEventListener("click", () => {
      const nombre = $("#p-nuevo").value.trim();
      if (!nombre) { toast("Escribí el nombre del proyecto.", true); return; }
      const slug = slugify(nombre);
      if (data.proyectos.items.some(p => p.slug === slug)) { toast("Ya existe un proyecto con ese nombre.", true); return; }
      data.proyectos.items.unshift({
        slug, titulo: nombre, categoria: "Diseño de interiores", anio: String(new Date().getFullYear()),
        portada: "", intro: "", fotos: []
      });
      markDirty();
      currentProj = slug;
      renderTab();
      toast("Proyecto creado. Subile fotos y después tocá Publicar cambios.");
    });
  }

  /* ---- Proyectos: edición de uno ---- */
  function renderProyecto(c) {
    const p = data.proyectos.items.find(x => x.slug === currentProj);
    if (!p) { currentProj = null; return renderProyectos(c); }

    c.innerHTML = `
      <div class="card">
        <button class="btn ghost small" id="p-volver">← Volver a proyectos</button>
        <h2 style="margin-top:1rem">${esc(p.titulo)}</h2>
        <div class="row">
          <div><label class="f">Título</label><input type="text" id="pe-titulo" value="${esc(p.titulo)}"></div>
          <div><label class="f">Año</label><input type="text" id="pe-anio" value="${esc(p.anio)}"></div>
        </div>
        <label class="f">Categoría</label>
        <input type="text" id="pe-cat" value="${esc(p.categoria)}">
        <label class="f">Comentario de portada (se ve al abrir el proyecto)</label>
        <textarea rows="3" id="pe-intro">${esc(p.intro)}</textarea>
      </div>
      <div class="card">
        <h2>Fotos (${p.fotos.length})</h2>
        <p class="help">
          Arrastrá las fotos para reordenarlas — se acomodan solas en la página.<br>
          <strong>Tamaño:</strong> <em>Automática</em> fluye con las demás · <em>Grande</em> ocupa una fila más alta · <em>Ancho completo</em> va sola a todo lo ancho.<br>
          <strong>★ Portada</strong> marca la foto de tapa del proyecto.
        </p>
        <div class="fotogrid" id="fg"></div>
        <label class="dropfile" id="drop">
          <strong>Subir fotos</strong> — tocá acá o arrastrá los archivos<br>
          <span style="font-size:0.8rem">Se achican solas antes de subir; podés seleccionar varias.</span>
          <input type="file" id="file-in" accept="image/*" multiple>
        </label>
      </div>
      <div class="card">
        <h3 style="margin-top:0">Zona peligrosa</h3>
        <button class="btn danger" id="p-borrar">Eliminar este proyecto de la página</button>
        <p class="help" style="margin-top:0.6rem">Las fotos quedan guardadas en el repositorio, pero el proyecto deja de mostrarse.</p>
      </div>`;

    $("#p-volver").onclick = () => { currentProj = null; renderTab(); };
    bind($("#pe-titulo"), p, "titulo");
    bind($("#pe-anio"), p, "anio");
    bind($("#pe-cat"), p, "categoria");
    bind($("#pe-intro"), p, "intro");

    const fg = $("#fg");
    const paintFotos = () => {
      fg.innerHTML = p.fotos.map((f, i) => `
        <div class="foto" draggable="true" data-i="${i}">
          <span class="n">${i + 1}</span>
          ${p.portada === f.src ? '<span class="portada-flag">★ Portada</span>' : ""}
          <img src="../Proyectos/${esc(p.slug)}/${esc(f.src)}" alt="" loading="lazy">
          <select data-i="${i}">
            <option value="auto" ${f.tamano === "auto" || !f.tamano ? "selected" : ""}>Automática</option>
            <option value="grande" ${f.tamano === "grande" ? "selected" : ""}>Grande</option>
            <option value="completa" ${f.tamano === "completa" ? "selected" : ""}>Ancho completo</option>
          </select>
          <div class="rowbtns">
            <button type="button" data-portada="${i}" title="Usar como portada">★</button>
            <button type="button" class="del" data-del="${i}" title="Quitar de la galería">✕</button>
          </div>
        </div>`).join("");
      $("#fg").closest(".card").querySelector("h2").textContent = `Fotos (${p.fotos.length})`;
    };
    paintFotos();

    fg.addEventListener("change", e => {
      const i = e.target.dataset.i;
      if (e.target.tagName === "SELECT" && i !== undefined) {
        p.fotos[Number(i)].tamano = e.target.value; markDirty();
      }
    });
    fg.addEventListener("click", e => {
      if (e.target.dataset.portada !== undefined) {
        p.portada = p.fotos[Number(e.target.dataset.portada)].src;
        paintFotos(); markDirty();
      }
      if (e.target.dataset.del !== undefined && confirm("¿Quitar esta foto de la galería?")) {
        const f = p.fotos.splice(Number(e.target.dataset.del), 1)[0];
        if (p.portada === f.src && p.fotos.length) p.portada = p.fotos[0].src;
        paintFotos(); markDirty();
      }
    });

    // drag & drop fotos
    let dragI = null;
    fg.addEventListener("dragstart", e => {
      const el = e.target.closest(".foto");
      if (!el) return;
      dragI = Number(el.dataset.i); el.classList.add("dragging");
    });
    fg.addEventListener("dragend", () => $$(".foto", fg).forEach(x => x.classList.remove("dragging", "dropzone")));
    fg.addEventListener("dragover", e => {
      e.preventDefault();
      const el = e.target.closest(".foto");
      $$(".foto", fg).forEach(x => x.classList.remove("dropzone"));
      if (el) el.classList.add("dropzone");
    });
    fg.addEventListener("drop", e => {
      e.preventDefault();
      const el = e.target.closest(".foto");
      if (!el || dragI === null) return;
      const to = Number(el.dataset.i);
      const [m] = p.fotos.splice(dragI, 1);
      p.fotos.splice(to, 0, m);
      dragI = null; paintFotos(); markDirty();
    });

    // subir fotos
    const drop = $("#drop");
    const fileIn = $("#file-in");
    const subir = async files => {
      const imgs = Array.from(files).filter(f => /image\//.test(f.type));
      if (!imgs.length) return;
      let next = p.fotos.reduce((m, f) => {
        const n = parseInt(f.src, 10); return isNaN(n) ? m : Math.max(m, n);
      }, 0);
      overlay(true, `Subiendo 1 de ${imgs.length}…`);
      try {
        for (let i = 0; i < imgs.length; i++) {
          overlay(true, `Subiendo ${i + 1} de ${imgs.length}…`);
          const b64 = await fileToResizedJpeg(imgs[i]);
          next += 1;
          const name = String(next).padStart(2, "0") + ".jpg";
          await ghPut(`Proyectos/${p.slug}/${name}`, b64, `Foto ${name} — ${p.titulo}`);
          p.fotos.push({ src: name, tamano: "auto" });
          if (!p.portada) p.portada = name;
        }
        paintFotos(); markDirty();
        toast(`${imgs.length} foto${imgs.length > 1 ? "s" : ""} subida${imgs.length > 1 ? "s" : ""}. Tocá “Publicar cambios” para que aparezcan en la página.`);
      } catch (e2) {
        toast("Error subiendo fotos: " + e2.message, true);
      } finally { overlay(false); }
    };
    fileIn.addEventListener("change", () => { subir(fileIn.files); fileIn.value = ""; });
    ["dragover", "dragenter"].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add("over"); }));
    ["dragleave", "drop"].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove("over"); }));
    drop.addEventListener("drop", e => subir(e.dataTransfer.files));

    $("#p-borrar").addEventListener("click", () => {
      if (!confirm(`¿Eliminar “${p.titulo}” de la página?`)) return;
      data.proyectos.items = data.proyectos.items.filter(x => x.slug !== p.slug);
      currentProj = null; markDirty(); renderTab();
    });
  }

  /* ===== Aviso al salir con cambios ===== */
  window.addEventListener("beforeunload", e => {
    if (data && JSON.stringify(data) !== original) { e.preventDefault(); e.returnValue = ""; }
  });

  /* ===== Arranque ===== */
  const saved = sessionStorage.getItem("marq-token-s") || localStorage.getItem("marq-token");
  if (saved) tryLogin(saved, true);
})();
