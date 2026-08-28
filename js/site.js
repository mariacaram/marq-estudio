/* MARQ. — motor del sitio: carga de datos, render y animaciones */
(function () {
  "use strict";

  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  /* ---------- Datos ---------- */
  async function loadData() {
    const res = await fetch("data/site.json?v=" + Date.now().toString().slice(0, -4), { cache: "no-cache" });
    if (!res.ok) throw new Error("No se pudo cargar data/site.json");
    return res.json();
  }

  function nl2br(text) {
    return String(text || "").split("\n").map(escapeHtml).join("<br>");
  }
  function escapeHtml(s) {
    return String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }
  function waLink(numero, texto) {
    const msg = encodeURIComponent(texto || "Hola Marq.! Vi la página y quiero hacer una consulta.");
    return `https://wa.me/${numero}?text=${msg}`;
  }

  const ICONS = {
    ig: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.2" cy="6.8" r="0.6" fill="currentColor" stroke="none"/></svg>',
    wa: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 1.8a8.2 8.2 0 1 1-4.2 15.3l-.5-.3-2.9.8.8-2.9-.3-.5A8.2 8.2 0 0 1 12 3.8Zm-3 4.4c-.2 0-.5.1-.7.4-.3.3-.9.9-.9 2.2 0 1.3.9 2.6 1 2.7.1.2 1.8 3 4.5 4 2.2.9 2.7.7 3.2.7.5 0 1.6-.7 1.8-1.3.2-.6.2-1.2.2-1.3-.1-.1-.2-.2-.5-.3l-1.8-.9c-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.1-.2 0-.4.1-.5l.6-.7c.2-.2.2-.4.1-.6l-.8-2c-.2-.5-.4-.6-.6-.7h-.5Z"/></svg>',
    bag: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M5 8h14l-1 12H6L5 8Z"/><path d="M8.5 10V6.5a3.5 3.5 0 0 1 7 0V10"/></svg>'
  };

  /* ---------- Render compartido: nav, footer, flotante ---------- */
  function renderChrome(data, opts) {
    const aj = data.ajustes;
    const onHero = opts && opts.onHero;
    const base = opts && opts.base ? opts.base : "";
    const wa0 = aj.whatsapps && aj.whatsapps[0];

    const shopNav = aj.ecommerce ? `<a class="icon-link" href="${escapeHtml(aj.ecommerce)}" target="_blank" rel="noopener" aria-label="Tienda" title="Tienda">${ICONS.bag}</a>` : "";
    const nav = document.createElement("header");
    nav.className = "nav" + (onHero ? " on-hero" : " solid");
    nav.innerHTML = `
      <div class="nav-side nav-left">
        ${shopNav}
      </div>
      <a class="nav-brand" href="${base}index.html#inicio"><img src="${base}assets/brand/logo-marq.svg" alt="Marq. Estudio"></a>
      <div class="nav-side nav-right">
        <nav aria-label="Principal"><ul class="nav-links">
          <li><a href="${base}index.html#estudio">Quiénes somos</a></li>
          <li><a href="${base}index.html#proyectos">Proyectos</a></li>
          <li><a href="${base}index.html#servicios">Servicios</a></li>
          <li><a href="${base}index.html#contacto">Contacto</a></li>
        </ul></nav>
        <button class="nav-toggle" aria-label="Menú" aria-expanded="false"><span></span><span></span></button>
      </div>`;
    document.body.prepend(nav);

    const menu = document.createElement("div");
    menu.className = "mobile-menu";
    menu.innerHTML = `
      ${["Inicio|#inicio", "Quiénes somos|#estudio", "Proyectos|#proyectos", "Servicios|#servicios", "Contacto|#contacto"]
        .map((it, i) => { const [t, h] = it.split("|"); return `<a class="menu-item" style="transition-delay:${80 + i * 60}ms" href="${base}index.html${h}">${t}</a>`; }).join("")}
      ${aj.ecommerce ? `<a class="menu-item" style="transition-delay:380ms" href="${escapeHtml(aj.ecommerce)}" target="_blank" rel="noopener">Tienda</a>` : ""}
      <div class="menu-foot">
        <a class="icon-link" href="${escapeHtml(aj.instagram)}" target="_blank" rel="noopener" aria-label="Instagram">${ICONS.ig}</a>
        ${wa0 ? `<a class="icon-link" href="${waLink(wa0.numero)}" target="_blank" rel="noopener" aria-label="WhatsApp">${ICONS.wa}</a>` : ""}
      </div>`;
    document.body.appendChild(menu);

    $(".nav-toggle", nav).addEventListener("click", () => {
      const open = document.body.classList.toggle("menu-open");
      $(".nav-toggle", nav).setAttribute("aria-expanded", open);
    });
    $$("a", menu).forEach(a => a.addEventListener("click", () => document.body.classList.remove("menu-open")));

    if (onHero) {
      const onScroll = () => {
        const past = window.scrollY > window.innerHeight * 0.72;
        nav.classList.toggle("solid", past);
        nav.classList.toggle("on-hero", !past);
      };
      window.addEventListener("scroll", onScroll, { passive: true });
      onScroll();
    }

    // Botones flotantes: Instagram + WhatsApp, mismo estilo
    const fg = document.createElement("div");
    fg.className = "float-group";
    fg.innerHTML = `
      <a class="float-btn" href="${escapeHtml(aj.instagram)}" target="_blank" rel="noopener" aria-label="Seguinos en Instagram">${ICONS.ig}</a>
      ${wa0 ? `<a class="float-btn" href="${waLink(wa0.numero)}" target="_blank" rel="noopener" aria-label="Escribinos por WhatsApp">${ICONS.wa}</a>` : ""}`;
    document.body.appendChild(fg);

    // Footer
    const foot = document.createElement("footer");
    foot.className = "footer";
    foot.innerHTML = `
      <div class="footer-inner">
        <div>
          <img class="footer-logo" src="${base}assets/brand/logo-marq-blanco.svg" alt="Marq. Estudio">
          <p class="fine" style="margin:1.1rem 0 0">Arquitectura &amp; Diseño — ${escapeHtml(aj.ubicacion)}</p>
        </div>
        <nav aria-label="Redes">
          <a href="${escapeHtml(aj.instagram)}" target="_blank" rel="noopener">Instagram</a>
          ${wa0 ? `<a href="${waLink(wa0.numero)}" target="_blank" rel="noopener">WhatsApp</a>` : ""}
          ${aj.ecommerce ? `<a href="${escapeHtml(aj.ecommerce)}" target="_blank" rel="noopener">Tienda</a>` : ""}
          <a href="mailto:${escapeHtml(aj.email)}">Email</a>
        </nav>
        <p class="fine">© ${new Date().getFullYear()} Marq. Estudio — Arquitectura &amp; Diseño</p>
      </div>`;
    document.body.appendChild(foot);
  }

  /* ---------- Preloader ---------- */
  function preloader() {
    if (sessionStorage.getItem("marq-visited")) return;
    sessionStorage.setItem("marq-visited", "1");
    const p = document.createElement("div");
    p.className = "preloader";
    p.innerHTML = `<div><img class="pre-mark" src="assets/brand/m-pos.svg" alt="Marq."><div class="bar"></div></div>`;
    document.body.appendChild(p);
    setTimeout(() => { p.classList.add("done"); setTimeout(() => p.remove(), 900); }, 1650);
  }

  /* ---------- Reveals ---------- */
  function initReveals() {
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    $$(".reveal, .reveal-img, [data-stagger]").forEach(el => {
      if (el.hasAttribute("data-stagger")) $$(":scope > *", el).forEach((c, i) => c.style.setProperty("--i", i));
      io.observe(el);
    });
  }

  /* ---------- Navegación entre secciones: viaje lento y sereno ---------- */
  let animRaf = null;
  function animateScrollTo(y, durOverride) {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) { window.scrollTo(0, y); return; }
    cancelAnimationFrame(animRaf);
    const start = window.scrollY;
    const dist = y - start;
    if (Math.abs(dist) < 2) return;
    // más distancia, más tiempo: entre 0.8s y 1.6s
    const dur = durOverride || Math.min(1600, 800 + Math.abs(dist) * 0.22);
    const t0 = performance.now();
    const ease = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; // easeInOutCubic
    const step = now => {
      const p = Math.min(1, (now - t0) / dur);
      window.scrollTo(0, start + dist * ease(p));
      if (p < 1) animRaf = requestAnimationFrame(step);
    };
    animRaf = requestAnimationFrame(step);
    // si la persona interviene (rueda, tacto, teclado), el viaje se cancela
    const cancel = () => cancelAnimationFrame(animRaf);
    ["wheel", "touchstart", "keydown"].forEach(ev =>
      window.addEventListener(ev, cancel, { once: true, passive: true }));
  }

  // anclas de la misma página (nav, menú móvil, botones data-goto)
  // "/" y "/index.html" son la misma página: sin esto, en producción el menú
  // recargaba la página en vez de desplazarse
  const normPath = p => p.replace(/\/index\.html$/, "/");
  document.addEventListener("click", e => {
    const a = e.target.closest('a[href*="#"]');
    if (!a) return;
    const url = new URL(a.getAttribute("href"), location.href);
    if (normPath(url.pathname) !== normPath(location.pathname) || !url.hash) return;
    const target = document.querySelector(url.hash);
    if (!target) return;
    e.preventDefault();
    history.pushState(null, "", url.hash);
    animateScrollTo(target.getBoundingClientRect().top + window.scrollY);
  });

  // si la página se abre con un hash (#contacto, #proyectos…), el contenido
  // se renderiza async: viajar a la sección cuando ya existe
  function gotoHashOnLoad() {
    if (!location.hash) return;
    let target;
    try { target = document.querySelector(location.hash); } catch { return; }
    if (target) setTimeout(() => animateScrollTo(target.getBoundingClientRect().top + window.scrollY), 250);
  }

  /* ---------- Scroll con inercia (solo rueda de mouse, desktop) ---------- */
  function initSmoothScroll() {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!matchMedia("(pointer: fine)").matches) return;
    let target = window.scrollY;
    let current = target;
    let raf = null;
    const maxY = () => document.documentElement.scrollHeight - window.innerHeight;
    const tick = () => {
      current += (target - current) * 0.115;
      if (Math.abs(target - current) < 0.5) { current = target; raf = null; }
      else raf = requestAnimationFrame(tick);
      window.scrollTo(0, current);
    };
    window.addEventListener("wheel", e => {
      if (e.ctrlKey) return;                                   // zoom del navegador
      if (document.body.style.overflow === "hidden") return;   // lightbox / menú abierto
      if (document.body.classList.contains("menu-open")) return;
      e.preventDefault();
      const dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
      if (!raf) { target = window.scrollY; current = target; }
      target = Math.max(0, Math.min(maxY(), target + dy));
      if (!raf) raf = requestAnimationFrame(tick);
    }, { passive: false });
    // otras vías de scroll (anclas, teclado, barra) mantienen el objetivo al día
    window.addEventListener("scroll", () => { if (!raf) target = window.scrollY; }, { passive: true });
  }
  initSmoothScroll();

  window.MARQ = { loadData, renderChrome, preloader, initReveals, animateScrollTo, gotoHashOnLoad, waLink, escapeHtml, nl2br, ICONS, $, $$ };
})();
