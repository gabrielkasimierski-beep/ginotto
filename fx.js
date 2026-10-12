/* =============================================================================
   GINOTTO — el hero es un video que avanza con el scroll (y retrocede al subir).
   Dos clips encadenados como una sola línea de tiempo; ninguno se reproduce jamás: el scroll es el único
   transporte. La pantalla queda fija (sticky) durante todo el recorrido; recién cuando el clip B llega a su
   último cuadro empieza a subir la carta.
   Regla: nada de estilos escritos dentro de un handler de scroll; todo pasa en el rAF o en observers.
   ============================================================================= */
(function () {
  'use strict';
  const root = document.documentElement;
  const reducido = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const topes = (x, a, b) => Math.max(a, Math.min(b, x));

  /* ---- Menú del celu ---- */
  const burger = document.querySelector('.burger');
  const menu = document.getElementById('mobile-menu');
  if (burger && menu) {
    const cerrar = (devolverFoco) => {
      menu.hidden = true; burger.setAttribute('aria-expanded', 'false'); burger.setAttribute('aria-label', 'Abrir menú');
      document.body.style.overflow = ''; if (devolverFoco) burger.focus();
    };
    burger.addEventListener('click', () => {
      const abrir = menu.hidden;
      menu.hidden = !abrir; burger.setAttribute('aria-expanded', String(abrir)); burger.setAttribute('aria-label', abrir ? 'Cerrar menú' : 'Abrir menú');
      document.body.style.overflow = abrir ? 'hidden' : '';
      if (abrir) {
        const primerLink = menu.querySelector('a');
        if (primerLink) primerLink.focus();
      }
    });
    menu.addEventListener('click', e => { if (e.target.closest('a')) cerrar(false); });
    document.addEventListener('click', e => { if (!menu.hidden && !menu.contains(e.target) && !burger.contains(e.target)) cerrar(false); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && !menu.hidden) cerrar(true); });
  }

  /* ---- Entrada del hero: una sola vez, y después se limpia ---- */
  if (root.classList.contains('anim')) {
    const listo = new Promise(r => { const t = setTimeout(r, 500); (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(() => { clearTimeout(t); r(); }); });
    listo.then(() => requestAnimationFrame(() => requestAnimationFrame(() => {
      root.classList.add('play');
      setTimeout(() => root.classList.remove('anim', 'play'), 520 + 600 + 1200);
    })));
  }

  /* ---- Tarjetas: suben de a una cuando entran en pantalla ---- */
  const grupos = [...document.querySelectorAll('.grid, .carousel')];
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(es => es.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    }), { threshold: 0.15 });
    grupos.forEach(g => io.observe(g));
  } else grupos.forEach(g => g.classList.add('in'));

  /* ---- Hero: video encadenado ---- */
  const a = document.getElementById('v1'), b = document.getElementById('v2');
  const track = document.querySelector('.track');
  if (!a || !track) return;
  const copy = document.querySelector('.hero-copy'), cta = document.querySelector('.hero-cta');
  const capas = [...document.querySelectorAll('#capas li')];
  const cierre = document.getElementById('cierre');
  const vertical = matchMedia('(max-aspect-ratio: 1/1)').matches;      // celu: clips verticales
  const SRC = vertical ? ['assets/video/hero-a-v.mp4', 'assets/video/hero-b-v.mp4'] : ['assets/video/hero-a.mp4', 'assets/video/hero-b.mp4'];

  [[a, SRC[0]], [b, SRC[1]]].forEach(([v, src]) => {
    v.muted = true; v.playsInline = true; v.src = src; v.pause();
    v.addEventListener('loadedmetadata', () => { try { v.currentTime = 0.04; } catch (e) {} readScroll(); });
  });
  a.addEventListener('loadeddata', () => a.classList.add('ready'), { once: true });

  const nav = document.querySelector('.nav');
  let target = 0, smooth = 0, appliedA = -1, appliedB = -1, ultimo = null, navSolido = false;

  function readScroll() {
    const dA = a.duration, dB = (b && b.duration) ? b.duration : 0;
    if (!dA || !isFinite(dA)) return;
    // Rango útil = el recorrido menos la pantalla que ocupa el escenario fijo. La cadena termina al 85%: el 15% que
    // queda es la salida (B sostiene su último cuadro mientras la carta sube), sin scroll muerto.
    const SCRUB_END = 0.85;
    const total = (track.offsetHeight - window.innerHeight) * SCRUB_END;
    const prog = total > 0 ? topes(window.scrollY / total, 0, 1) : 0;
    target = prog * (dA + dB - 0.04);
  }

  function seekTo(el, t, last) {
    // pedir un cuadro nuevo SOLO cuando el decodificador terminó de pintar el anterior (si no: negros y tirones)
    if (!el || !el.duration || el.seeking || el.readyState < 2) return last;
    const c = topes(t, 0, el.duration - 0.04);
    if (Math.abs(last - c) < 0.012) return last;
    try { el.currentTime = c; } catch (e) {}
    return c;
  }

  function aCopy(p) {
    if (ultimo != null && Math.abs(ultimo - p) < 0.003) return;
    ultimo = p;
    const k = Math.min(1, p * 6), o = Math.max(0, 1 - p * 6);
    if (!reducido) {
      if (copy) { copy.style.opacity = o.toFixed(3); copy.style.transform = `translateY(${-60 * k}px)`; }
      if (cta) { cta.style.opacity = o.toFixed(3); cta.style.transform = `translateY(${-90 * k}px)`; }
      [copy, cta].forEach(el => { if (el) el.style.pointerEvents = o < 0.05 ? 'none' : 'auto'; });
    }
    // lo que hay dentro de la burga se va nombrando a medida que se abre
    capas.forEach((li, i) => li.classList.toggle('on', p > 0.2 + i * 0.13));
    if (cierre) {
      const c = topes((p - 0.82) / 0.12, 0, 1);
      cierre.style.opacity = c.toFixed(3);
      cierre.style.pointerEvents = c > 0.6 ? 'auto' : 'none';
    }
  }

  function tick() {
    if (!a.paused) a.pause();                       // ningún clip se reproduce nunca
    if (b && !b.paused) b.pause();
    readScroll();
    smooth = reducido ? target : smooth + (target - smooth) * 0.18;
    if (Math.abs(target - smooth) < 0.01) smooth = target;
    const dA = a.duration || 0, dB = (b && b.duration) ? b.duration : 0;
    if (dA && smooth <= dA - 0.04) {
      appliedA = seekTo(a, smooth, appliedA);
      if (b && b.style.opacity !== '0') b.style.opacity = '0';          // A en pantalla
    } else if (dA && b) {
      appliedB = seekTo(b, smooth - dA, appliedB);                      // seguimos dentro de B
      // el traspaso es un cambio instantáneo de opacidad: sin fundido, o se ve la costura
      if (b.style.opacity !== '1' && b.readyState >= 2) b.style.opacity = '1';
    }
    aCopy(dA && dB ? topes((smooth - dA) / dB, 0, 1) : 0);
    // pasado el hero, el menú gana un degradé oscuro para no pisar los títulos de la carta
    const solido = window.scrollY > (track.offsetHeight - window.innerHeight) * 0.85 + 40;
    if (nav && solido !== navSolido) { navSolido = solido; nav.classList.toggle('solid', solido); }
    requestAnimationFrame(tick);
  }

  addEventListener('scroll', readScroll, { passive: true });
  addEventListener('resize', readScroll, { passive: true });
  readScroll();
  requestAnimationFrame(tick);
})();
