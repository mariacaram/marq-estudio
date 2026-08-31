/* MARQ. — galería justificada (estilo Google Fotos) + lightbox */
(function () {
  "use strict";

  /**
   * Construye una galería de filas justificadas.
   * @param {HTMLElement} container  contenedor .jgallery
   * @param {Array<{src:string, tamano?:string, alt?:string}>} fotos  rutas absolutas al proyecto
   * Tamaños: "auto" (fluye), "grande" (fila más alta), "completa" (ancho completo).
   */
  function buildJustified(container, fotos) {
    container.classList.add("jgallery");
    container.innerHTML = "";

    // Cargar dimensiones reales
    const jobs = fotos.map(f => new Promise(resolve => {
      const img = new Image();
      img.onload = () => resolve({ ...f, ar: img.naturalWidth / img.naturalHeight });
      img.onerror = () => resolve(null);
      img.src = f.src;
    }));

    Promise.all(jobs).then(loaded => {
      const items = loaded.filter(Boolean);
      let lastW = 0;
      const relayout = () => {
        const w = container.clientWidth;
        if (w < 120 || Math.abs(w - lastW) < 2) return; // sin ancho útil o sin cambios
        lastW = w;
        layout(container, items);
      };
      relayout();
      // Reacomodar cuando el contenedor cambie de tamaño (resize, rotación,
      // o pestañas que se abrieron en segundo plano y recién ahora tienen ancho).
      if ("ResizeObserver" in window) {
        let t;
        new ResizeObserver(() => { clearTimeout(t); t = setTimeout(relayout, 120); }).observe(container);
      } else {
        let t;
        window.addEventListener("resize", () => { clearTimeout(t); t = setTimeout(relayout, 180); });
      }
      initLightbox(container, items);
    });
  }

  function layout(container, items) {
    container.innerHTML = "";
    const W = container.clientWidth;
    if (W < 120) return;
    const gap = window.innerWidth < 560 ? 6 : 10;
    const baseH = Math.max(220, Math.min(360, W / 4));

    let index = 0;
    const flush = (row, targetH, justify) => {
      if (!row.length) return;
      const sumAr = row.reduce((s, it) => s + it.ar, 0);
      const gaps = gap * (row.length - 1);
      let h = (W - gaps) / sumAr;
      if (!justify) h = Math.min(h, targetH); // última fila: no estirar de más
      else h = Math.min(h, targetH * 1.6);
      // filas justificadas: repartir el ancho completo aunque la altura esté
      // limitada (object-fit: cover absorbe la diferencia) para que el borde
      // derecho de todas las filas quede alineado, sin escalones
      const usable = W - gaps;
      const rowEl = document.createElement("div");
      rowEl.className = "jrow";
      row.forEach(it => {
        const w = justify ? usable * (it.ar / sumAr) : it.ar * h;
        const item = document.createElement("figure");
        item.className = "jitem reveal-img";
        item.style.width = w + "px";
        item.style.height = h + "px";
        item.style.margin = "0";
        item.dataset.idx = it._idx;
        const img = document.createElement("img");
        img.src = it.src;
        img.alt = it.alt || "";
        img.loading = "lazy";
        item.appendChild(img);
        rowEl.appendChild(item);
      });
      container.appendChild(rowEl);
    };

    let row = [];
    let rowTarget = baseH;
    items.forEach((it, i) => {
      it._idx = i;
      if (it.tamano === "completa") {
        flush(row, rowTarget, true); row = []; rowTarget = baseH;
        // fila propia a ancho completo
        const h = Math.min(W / it.ar, window.innerHeight * 0.85);
        flush([it], h, true);
        return;
      }
      const target = it.tamano === "grande" ? baseH * 1.45 : baseH;
      rowTarget = Math.max(rowTarget, target);
      row.push(it);
      const sumAr = row.reduce((s, x) => s + x.ar, 0);
      if (sumAr * rowTarget >= W - gap * (row.length - 1)) {
        flush(row, rowTarget, true); row = []; rowTarget = baseH;
      }
    });
    flush(row, rowTarget, false);

    // reactivar reveals para los items nuevos
    if (window.MARQ) window.MARQ.initReveals();
  }

  /* ---------- Lightbox ---------- */
  function initLightbox(container, items) {
    let lb = document.querySelector(".lightbox");
    if (!lb) {
      lb = document.createElement("div");
      lb.className = "lightbox";
      lb.setAttribute("role", "dialog");
      lb.setAttribute("aria-label", "Foto ampliada");
      lb.innerHTML = `
        <button class="lb-btn lb-close" aria-label="Cerrar">Cerrar ✕</button>
        <button class="lb-btn lb-prev" aria-label="Anterior">←</button>
        <button class="lb-btn lb-next" aria-label="Siguiente">→</button>
        <img alt="">
        <span class="lb-count"></span>`;
      document.body.appendChild(lb);
    }
    const imgEl = lb.querySelector("img");
    const count = lb.querySelector(".lb-count");
    let current = 0;

    const show = i => {
      current = (i + items.length) % items.length;
      imgEl.style.opacity = "0";
      const pre = new Image();
      pre.onload = () => { imgEl.src = pre.src; imgEl.style.opacity = "1"; };
      pre.src = items[current].src;
      count.textContent = (current + 1) + " / " + items.length;
    };
    const open = i => { show(i); lb.classList.add("open"); document.body.style.overflow = "hidden"; };
    const close = () => { lb.classList.remove("open"); document.body.style.overflow = ""; };

    container.addEventListener("click", e => {
      const item = e.target.closest(".jitem");
      if (item) open(Number(item.dataset.idx));
    });
    lb.querySelector(".lb-close").onclick = close;
    lb.querySelector(".lb-prev").onclick = () => show(current - 1);
    lb.querySelector(".lb-next").onclick = () => show(current + 1);
    lb.addEventListener("click", e => { if (e.target === lb) close(); });
    document.addEventListener("keydown", e => {
      if (!lb.classList.contains("open")) return;
      if (e.key === "Escape") close();
      if (e.key === "ArrowLeft") show(current - 1);
      if (e.key === "ArrowRight") show(current + 1);
    });

    // swipe táctil
    let x0 = null;
    lb.addEventListener("touchstart", e => { x0 = e.touches[0].clientX; }, { passive: true });
    lb.addEventListener("touchend", e => {
      if (x0 === null) return;
      const dx = e.changedTouches[0].clientX - x0;
      if (Math.abs(dx) > 40) show(current + (dx < 0 ? 1 : -1));
      x0 = null;
    }, { passive: true });
  }

  window.MARQGallery = { buildJustified };
})();
