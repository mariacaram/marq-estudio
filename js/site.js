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
      <a class="nav-brand wordmark" href="${base}index.html#inicio">MARQ<span class="mark"><span class="dot">.</span></span></a>
      <nav aria-label="Principal"><ul class="nav-links">
        <li><a href="${base}index.html#inicio">Inicio</a></li>
        <li><a href="${base}index.html#estudio">Quiénes somos</a></li>
        <li><a href="${base}index.html#proyectos">Proyectos</a></li>
        <li><a href="${base}index.html#servicios">Servicios</a></li>
        <li><a href="${base}index.html#contacto">Contacto</a></li>
      </ul></nav>
      <div class="nav-cta">
        <a class="icon-link hide-m" href="${escapeHtml(aj.instagram)}" target="_blank" rel="noopener" aria-label="Instagram" title="Instagram">${ICONS.ig}</a>
        ${shopNav}
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

    // WhatsApp flotante
    if (wa0) {
      const f = document.createElement("a");
      f.className = "wa-float";
      f.href = waLink(wa0.numero);
      f.target = "_blank"; f.rel = "noopener";
      f.setAttribute("aria-label", "Escribinos por WhatsApp");
      f.innerHTML = ICONS.wa;
      document.body.appendChild(f);
    }

    // Footer
    const foot = document.createElement("footer");
    foot.className = "footer";
    foot.innerHTML = `
      <div class="footer-inner">
        <div>
          <div class="wordmark">MARQ<span class="mark"><span class="dot">.</span></span> ESTUDIO<small>Arquitectura &amp; Diseño</small></div>
          <p class="fine" style="margin:1rem 0 0">${escapeHtml(aj.ubicacion)}</p>
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
    p.innerHTML = `<div><span class="mark"><span class="dot">.</span>M</span><div class="bar"></div></div>`;
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
    $$(".reveal, .reveal-img, [data-stagger], .service").forEach(el => {
      if (el.hasAttribute("data-stagger")) $$(":scope > *", el).forEach((c, i) => c.style.setProperty("--i", i));
      io.observe(el);
    });
  }

  window.MARQ = { loadData, renderChrome, preloader, initReveals, waLink, escapeHtml, nl2br, ICONS, $, $$ };
})();
