/* =============================================================================
   GINOTTO — los efectos: cámara (giroscopio / mouse), parallax con el scroll, entradas y "por dentro"
   Cada escena ([data-escena]) recibe --px, --py (cámara, de -1 a 1) y --s (qué tan lejos del centro de la
   pantalla está, de -1 a 1). Los elementos con data-z se mueven según su profundidad (ver style.css).
   ============================================================================= */
(function () {
  'use strict';
  const reducido = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const topes = (x, a, b) => Math.max(a, Math.min(b, x));
  const escenas = [...document.querySelectorAll('[data-escena]')];
  document.querySelectorAll('[data-z]').forEach(el => el.style.setProperty('--z', el.dataset.z));

  /* ---- Entradas: cada escena aparece una vez, la primera vez que se ve ---- */
  const visibles = new Set();
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { visibles.add(e.target); e.target.classList.add('in'); } else visibles.delete(e.target);
  }), { rootMargin: '10% 0px 10% 0px', threshold: 0.05 });
  escenas.forEach(el => io.observe(el));
  requestAnimationFrame(() => escenas[0] && escenas[0].classList.add('in'));   // el hero entra enseguida

  if (reducido) return arrancarDentro(true);

  /* ---- Cámara: giroscopio en el celu, mouse en la compu ---- */
  const cam = { x: 0, y: 0 }, meta = { x: 0, y: 0 };
  let ultimoToque = -1e9, giro = false, base = null;
  addEventListener('pointermove', e => {
    if (giro && e.pointerType === 'touch') return;
    meta.x = topes((e.clientX / innerWidth - 0.5) * 2, -1, 1);
    meta.y = topes((e.clientY / innerHeight - 0.5) * 2, -1, 1);
    ultimoToque = performance.now();
  }, { passive: true });
  addEventListener('deviceorientation', e => {
    if (e.gamma == null || e.beta == null) return;
    giro = true;
    if (!base) base = { g: e.gamma, b: e.beta };
    base.g += (e.gamma - base.g) * 0.006; base.b += (e.beta - base.b) * 0.006;
    meta.x = topes((e.gamma - base.g) / 20, -1, 1);
    meta.y = topes((e.beta - base.b) / 20, -1, 1);
    ultimoToque = performance.now();
  });
  // iPhone: el permiso del giroscopio se pide con el primer toque
  const DO = window.DeviceOrientationEvent;
  if (DO && typeof DO.requestPermission === 'function') {
    addEventListener('click', () => DO.requestPermission().catch(() => {}), { once: true, passive: true });
  }

  /* ---- Ciclo ---- */
  let ultimo = 0;
  const previo = new WeakMap();
  function ciclo(ahora) {
    requestAnimationFrame(ciclo);
    const dt = topes((ahora - (ultimo || ahora)) / 1000, 0.001, 0.05);
    ultimo = ahora;
    const quieto = topes((ahora - ultimoToque) / 2500, 0, 1);
    const ox = meta.x + (Math.sin(ahora * 0.00037) * 0.34 + Math.sin(ahora * 0.00011) * 0.2) * quieto;
    const oy = meta.y + Math.cos(ahora * 0.00029) * 0.22 * quieto;
    const f = 1 - Math.exp(-dt * 5.5);
    cam.x += (ox - cam.x) * f;
    cam.y += (oy - cam.y) * f;
    const vh = innerHeight || 1;
    visibles.forEach(el => {
      const r = el.getBoundingClientRect();
      const s = topes((r.top + r.height / 2 - vh / 2) / vh, -1.2, 1.2);
      const p = previo.get(el) || {};
      if (Math.abs((p.x ?? 9) - cam.x) > 0.002 || Math.abs((p.y ?? 9) - cam.y) > 0.002 || Math.abs((p.s ?? 9) - s) > 0.002) {
        el.style.setProperty('--px', cam.x.toFixed(3));
        el.style.setProperty('--py', cam.y.toFixed(3));
        el.style.setProperty('--s', s.toFixed(3));
        previo.set(el, { x: cam.x, y: cam.y, s });
      }
    });
    dentro(ahora);
  }
  requestAnimationFrame(ciclo);

  /* ---- Por dentro: el scroll avanza los cuadros de la burga armándose ---- */
  const sec = document.getElementById('por-dentro');
  const lienzo = document.getElementById('dentro-lienzo');
  const capas = [...document.querySelectorAll('#dentro-capas li')];
  let atlas = null, ultimoCuadro = -1;
  function arrancarDentro(estatico) {
    if (!sec) return;
    const def = window.DENTRO || { src: ['assets/dentro-1.webp', 'assets/dentro-2.webp'], n: 36, cols: 6, tam: [440, 544], porParte: 18 };   // los cuadros de la burga abriéndose
    if (!def || estatico) { capas.forEach(li => li.classList.add('on')); return; }
    const imgs = def.src.map(() => new Image());
    Promise.all(imgs.map((im, k) => new Promise((ok, mal) => { im.onload = ok; im.onerror = mal; im.src = def.src[k]; })))
      .then(() => { atlas = { imgs, ...def, porParte: def.porParte || def.n }; lienzo.width = def.tam[0]; lienzo.height = def.tam[1]; sec.classList.add('listo'); })
      .catch(() => {});
  }
  function dentro() {
    if (!sec) return;
    const r = sec.getBoundingClientRect();
    if (r.bottom < -50 || r.top > innerHeight + 50) return;
    const p = topes(-r.top / Math.max(1, r.height - innerHeight), 0, 1);
    // las capas se prenden a medida que la burga se abre
    capas.forEach((li, i) => li.classList.toggle('on', p > 0.18 + i * 0.12 && p < 0.97));
    if (!atlas) return;
    // 0 → 0.15: armada; 0.15 → 0.5: se abre; 0.5 → 0.7: abierta; 0.7 → 1: se vuelve a armar
    const t = p < 0.5 ? p / 0.5 : 1 - (p - 0.5) / 0.5;
    const f = Math.round(topes(t, 0, 1) * (atlas.n - 1));
    if (f === ultimoCuadro) return;
    ultimoCuadro = f;
    const [w, h] = atlas.tam, parte = Math.floor(f / atlas.porParte), k = f % atlas.porParte;
    const g = lienzo.getContext('2d');
    g.clearRect(0, 0, w, h);
    g.drawImage(atlas.imgs[parte], (k % atlas.cols) * w, Math.floor(k / atlas.cols) * h, w, h, 0, 0, w, h);
  }
  arrancarDentro(false);
})();
