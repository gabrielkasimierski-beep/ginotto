/* Ginotto · carta viva
   Clips cortos en bucle para los platos, vasos que sudan (con gas y espuma) para las bebidas y un brillo táctil
   para lo que todavía no tiene clip.
   Sin dependencias. No toca app.js ni cart.js: se engancha al HTML que ya genera la carta
   (.card[data-item] y .stage), así los pedidos, la disponibilidad y los precios siguen siendo los de siempre.

   Qué hace cada pieza:
     - Vaso: un canvas 2D por bebida (niebla, gotas que resbalan, gas, espuma). El mouse o un deslizamiento
       horizontal limpian el vidrio; un toque lanza una pasada de limpieza.
     - Clips: video muerto de 3–5 s en bucle con fundido (sin corte), solo mientras está en pantalla.
   Todo se apaga con "reducir movimiento": quedan las fotos. */

const quieta = matchMedia("(prefers-reduced-motion: reduce)").matches;
const celu = matchMedia("(max-width: 700px)").matches;
const rnd = (a, b) => a + Math.random() * (b - a);

/* ================= 1. CLIPS EN BUCLE CON FUNDIDO ================= */

function bucleSuave(contenedor, src, { fund = 0.7 } = {}) {
  // Un solo <video> por plato. Al reiniciar se congela el último cuadro en un canvas encima y se desvanece:
  // el bucle no tiene corte y no se baja el clip dos veces ni se abren dos decodificadores.
  const v = document.createElement("video");
  v.muted = true; v.loop = false; v.playsInline = true; v.setAttribute("playsinline", ""); v.setAttribute("aria-hidden", "true");
  v.preload = "none"; v.className = "vv";
  const velo = document.createElement("canvas"); velo.className = "vv"; velo.setAttribute("aria-hidden", "true"); velo.style.opacity = 0; velo.style.pointerEvents = "none";
  contenedor.append(v, velo);
  const g = velo.getContext("2d");
  let activo = false, raf = 0, pedido = false, fundiendo = false, tf = 0;
  const listo = new Promise((ok) => { v.addEventListener("loadeddata", ok, { once: true }); v.addEventListener("error", ok, { once: true }); });
  function pedir() { if (pedido) return; pedido = true; v.preload = "auto"; v.src = src; v.load(); }
  function tick(ahora) {
    raf = requestAnimationFrame(tick);
    const d = v.duration || 0;
    if (d && !fundiendo && v.currentTime > d - 0.12 && v.videoWidth) {
      velo.width = v.videoWidth; velo.height = v.videoHeight; g.drawImage(v, 0, 0);
      velo.style.opacity = 1; v.currentTime = 0; if (v.paused) v.play().catch(() => {});
      fundiendo = true; tf = ahora;
    }
    if (fundiendo) {
      const k = Math.min(1, (ahora - tf) / (fund * 1000));
      velo.style.opacity = String(1 - k);
      if (k >= 1) fundiendo = false;
    }
  }
  return {
    play() { pedir(); if (activo) return; activo = true; v.play().catch(() => {}); raf = requestAnimationFrame(tick); },
    pause() { if (!activo) return; activo = false; cancelAnimationFrame(raf); v.pause(); },
    listo,
  };
}

function vigilar(el, alEntrar, alSalir, margen = "120px") {
  const io = new IntersectionObserver((es) => es.forEach((e) => (e.isIntersecting ? alEntrar() : alSalir())), { rootMargin: margen });
  io.observe(el);
}

/* ================= 2. VASO QUE SUDA ================= */

// Forma del vidrio (fracciones de la imagen) y línea de la superficie, por bebida
const VASOS = {
  "bebida-coca": { src: "assets/vida/bebida-cola.webp", gas: 1, espuma: true, sup: 0.2 },
  "bebida-coca-zero": { src: "assets/vida/bebida-cola-zero.webp", gas: 1, espuma: true, sup: 0.2 },
  "bebida-sprite": { src: "assets/vida/bebida-lima.webp", gas: 1.3, sup: 0.2, claro: true },
  "bebida-agua": { src: "assets/vida/bebida-agua.webp", gas: 0, sup: 0.2, claro: true },
  "bebida-agua-gas": { src: "assets/vida/bebida-agua-gas.webp", gas: 1.6, sup: 0.2, claro: true },
  "bebida-cerveza": { src: "assets/vida/bebida-cerveza.webp", gas: 0.8, sup: 0.27, topeVidrio: 0.07 },
};

function vasoVivo(host, img, cfg) {
  const L = 720, W = L, H = L;                       // las imágenes de las bebidas son cuadradas
  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H; canvas.className = "vaso-vivo";
  canvas.setAttribute("role", "img"); canvas.setAttribute("aria-label", img.alt || "Bebida");
  const ctx = canvas.getContext("2d");
  const lienzo = () => { const c = document.createElement("canvas"); c.width = W; c.height = H; return c; };
  const k = W / 880;

  // silueta del vidrio: el empañado y el gas viven solo ahí
  const x0 = 0.285, x1 = 0.705, xb0 = 0.345, xb1 = 0.655, yT = cfg.topeVidrio ?? 0.125, yB = 0.915;
  const sil = lienzo(); { const g = sil.getContext("2d"); g.filter = "blur(7px)"; g.fillStyle = "#fff"; g.beginPath();
    g.moveTo(W * x0, H * yT); g.lineTo(W * x1, H * yT); g.lineTo(W * xb1, H * yB); g.lineTo(W * xb0, H * yB); g.closePath(); g.fill(); }
  const niebla = lienzo(); { const g = niebla.getContext("2d");
    g.filter = "blur(10px) brightness(1.18) saturate(.6)"; g.drawImage(img, 0, 0, W, H); g.filter = "none";
    g.fillStyle = "rgba(236,243,248,.4)"; g.fillRect(0, 0, W, H);
    g.globalCompositeOperation = "destination-in"; g.drawImage(sil, 0, 0); }
  const huecos = lienzo(), hg = huecos.getContext("2d");
  // ventana: un óvalo central que se mantiene casi limpio, para que la bebida y la estampilla siempre se vean
  const ventana = lienzo(); { const g = ventana.getContext("2d");
    g.translate(W * 0.5, H * 0.52); g.scale(0.5, 1); g.translate(-W * 0.5, -H * 0.52);
    const gr = g.createRadialGradient(W * 0.5, H * 0.52, 0, W * 0.5, H * 0.52, H * 0.34);
    gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.6, "rgba(255,255,255,.7)"); gr.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = gr; g.fillRect(0, 0, W, H); }
  hg.globalAlpha = 0.85; hg.drawImage(ventana, 0, 0); hg.globalAlpha = 1;
  const tmp = lienzo(), tg = tmp.getContext("2d");

  function limpiar(xa, ya, xb, yb, ancho, fuerza = 1) {
    hg.save(); hg.lineCap = "round"; hg.lineJoin = "round"; hg.strokeStyle = `rgba(255,255,255,${fuerza})`;
    hg.shadowColor = "#fff"; hg.shadowBlur = ancho * 0.45; hg.lineWidth = ancho;
    hg.beginPath(); hg.moveTo(xa, ya); hg.lineTo(xb, yb); hg.stroke(); hg.restore();
  }

  // espuma de la cola: racimo de burbujitas claras debajo del hielo
  let espuma = null;
  if (cfg.espuma) {
    espuma = lienzo(); const g = espuma.getContext("2d"), y0 = H * (cfg.sup - 0.015), y1 = H * (cfg.sup + 0.085);
    const fg = g.createLinearGradient(0, y0, 0, y1); fg.addColorStop(0, "rgba(238,222,190,.0)"); fg.addColorStop(0.25, "rgba(238,222,190,.55)"); fg.addColorStop(1, "rgba(238,222,190,0)");
    g.fillStyle = fg; g.fillRect(0, y0, W, y1 - y0);
    for (let i = 0; i < 150; i++) {
      const y = rnd(y0, y1), t = (y - H * yT) / (H * (yB - yT)), xa = W * (x0 + (xb0 - x0) * t), xb = W * (x1 + (xb1 - x1) * t);
      const x = rnd(xa + 4, xb - 4), r = rnd(2.2, 6.5) * k;
      g.globalAlpha = rnd(0.35, 0.9); g.fillStyle = "rgba(246,232,205,.85)"; g.strokeStyle = "rgba(255,255,255,.9)"; g.lineWidth = Math.max(1, r * 0.25);
      g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); g.stroke();
      g.fillStyle = "rgba(255,255,255,.95)"; g.beginPath(); g.arc(x - r * 0.35, y - r * 0.35, r * 0.25, 0, 7); g.fill();
    }
    g.globalCompositeOperation = "destination-in"; g.drawImage(sil, 0, 0);
  }

  // gas: burbujas diminutas que nacen en pocos puntos, suben en hilos, crecen y se aceleran, y revientan arriba.
  // Se dibujan con un sprite (disco suave con borde brillante y un reflejo) sumado a la luz, no como círculos de contorno.
  const SUP = H * cfg.sup;
  const interior = (y) => { const t = Math.max(0, (y - H * yT) / (H * (yB - yT))); return [x0 + (xb0 - x0) * t + 0.025, x1 + (xb1 - x1) * t - 0.025]; };
  const sprite = (claro) => {
    const c = document.createElement("canvas"); c.width = c.height = 64; const g = c.getContext("2d");
    const r = g.createRadialGradient(32, 32, 0, 32, 32, 30);
    if (claro) { r.addColorStop(0, "rgba(255,255,255,.35)"); r.addColorStop(0.7, "rgba(255,255,255,.55)"); r.addColorStop(0.9, "rgba(60,70,80,.55)"); r.addColorStop(1, "rgba(60,70,80,0)"); }
    else { r.addColorStop(0, "rgba(255,244,225,.10)"); r.addColorStop(0.62, "rgba(255,244,225,.22)"); r.addColorStop(0.86, "rgba(255,248,235,.85)"); r.addColorStop(1, "rgba(255,248,235,0)"); }
    g.fillStyle = r; g.beginPath(); g.arc(32, 32, 30, 0, 7); g.fill();
    g.fillStyle = "rgba(255,255,255,.95)"; g.beginPath(); g.ellipse(23, 21, 6, 4, -0.6, 0, 7); g.fill();
    if (claro) { g.fillStyle = "rgba(40,50,60,.35)"; g.beginPath(); g.ellipse(40, 42, 8, 5, -0.6, 0, 7); g.fill(); }
    return c;
  };
  const spr = sprite(!!cfg.claro);
  const NH = Math.round((celu ? 7 : 10) * Math.min(1.5, cfg.gas || 0));
  const bases = [0.375, 0.415, 0.46, 0.5, 0.54, 0.585, 0.625, 0.4, 0.57, 0.48];
  const hilos = cfg.gas ? Array.from({ length: NH }, (_, i) => ({ x: bases[i % bases.length] + rnd(-0.012, 0.012), tasa: rnd(8, 15) * Math.min(1.3, cfg.gas), acum: Math.random() })) : [];
  const burbujas = [], chispas = [], pegadas = [];
  function emitir(h, micro = false) {
    const y = H * yB - rnd(6, 26) * k, [a, b] = interior(y);
    burbujas.push({ x: W * Math.max(a, Math.min(b, h.x)) + rnd(-1.2, 1.2) * k, y, x0: 0, edad: 0,
      r: (micro ? rnd(0.7, 1.1) : rnd(1.2, 2.0)) * k, gr: (micro ? rnd(0.15, 0.3) : rnd(0.5, 1.0)) * k,
      fase: rnd(0, 7), f: rnd(3, 7), amp: rnd(0.3, 0.9) * k, a: micro ? rnd(0.25, 0.5) : rnd(0.6, 1), micro });
  }
  // burbujas pegadas al vidrio: crecen de a poco y de tanto en tanto una se suelta
  for (let i = 0; cfg.gas && i < (celu ? 14 : 22); i++) {
    const y = H * rnd(0.3, 0.86), [a, b] = interior(y), lado = Math.random() < 0.5;
    pegadas.push({ x: W * (lado ? a + rnd(0, 0.03) : b - rnd(0, 0.03)), y, r: rnd(1.4, 3.0) * k, tope: rnd(3.4, 4.4) * k, a: rnd(0.55, 0.95) });
  }
  function dibujarGas(g, mult) {
    g.save(); g.globalCompositeOperation = cfg.claro ? "source-over" : "lighter";
    for (const b of burbujas) { const d = b.r * 2.6; g.globalAlpha = b.a * mult; g.drawImage(spr, b.x - d / 2, b.y - d / 2, d, d); }
    for (const b of pegadas) { const d = b.r * 2.6; g.globalAlpha = b.a * mult; g.drawImage(spr, b.x - d / 2, b.y - d / 2, d, d); }
    g.globalCompositeOperation = "lighter";
    for (const c of chispas) { g.globalAlpha = Math.max(0, c.vida * 2) * Math.min(1, mult + 0.2); g.fillStyle = "rgba(255,248,230,.95)"; g.beginPath(); g.arc(c.x, c.y, c.r, 0, 7); g.fill(); }
    g.restore();
  }

  // gotas que resbalan por afuera, dejando un surco limpio
  const nuevaGota = (arriba) => ({ x: W * rnd(x0 + 0.04, x1 - 0.04), y: H * (arriba ? rnd(yT + 0.03, yT + 0.18) : rnd(0.2, 0.82)), r: rnd(0.0065, 0.0145) * W, v: 0, espera: rnd(0, 3), py: 0 });
  const gotas = Array.from({ length: celu ? 6 : 8 }, () => nuevaGota(false)); gotas.forEach((d) => (d.py = d.y));
  function dibujarGota(g, d) {
    const r = d.r; g.save(); g.translate(d.x, d.y);
    const s = g.createRadialGradient(0, r * 0.25, r * 0.15, 0, r * 0.25, r * 1.25);
    s.addColorStop(0, "rgba(70,35,10,0)"); s.addColorStop(0.7, "rgba(70,35,10,.30)"); s.addColorStop(1, "rgba(70,35,10,0)");
    g.fillStyle = s; g.beginPath(); g.ellipse(0, r * 0.2, r * 1.15, r * 1.35, 0, 0, 7); g.fill();
    const l = g.createRadialGradient(-r * 0.3, -r * 0.4, r * 0.05, 0, 0, r * 1.05);
    l.addColorStop(0, "rgba(255,255,255,.95)"); l.addColorStop(0.3, "rgba(255,255,255,.28)"); l.addColorStop(1, "rgba(255,255,255,.06)");
    g.fillStyle = l; g.beginPath(); g.ellipse(0, 0, r * 0.85, r * 1.1, 0, 0, 7); g.fill(); g.restore();
  }

  // pasar el mouse o deslizar horizontalmente; un toque lanza una pasada
  let ultimo = null, tocado = false;
  const aLienzo = (e) => { const r = canvas.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * W, (e.clientY - r.top) / r.height * H]; };
  function mover(e) { const [x, y] = aLienzo(e); if (ultimo) limpiar(ultimo[0], ultimo[1], x, y, W * 0.09); else limpiar(x, y, x + 0.1, y + 0.1, W * 0.09); ultimo = [x, y]; marcar(); }
  canvas.addEventListener("pointermove", mover);
  canvas.addEventListener("pointerleave", () => (ultimo = null));
  canvas.addEventListener("pointerup", () => (ultimo = null));
  let barrido = null;
  canvas.addEventListener("click", () => { barrido = { t: 0 }; marcar(); });
  function marcar() { if (!tocado) { tocado = true; host.classList.add("tocado"); } }

  let activo = false, raf = 0, t0 = performance.now(), cuenta = 0;
  function cuadro(ahora) {
    raf = requestAnimationFrame(cuadro);
    const dt = Math.min(0.05, (ahora - t0) / 1000); t0 = ahora; cuenta++;
    for (const d of gotas) {
      d.py = d.y;
      if (d.espera > 0) d.espera -= dt;
      else { d.v = Math.min(H * 0.11, d.v + H * 0.5 * dt); d.y += d.v * dt; if (Math.random() < 0.012) { d.espera = rnd(0.3, 1.5); d.v = 0; } }
      if (d.y > H * yB - 10) { Object.assign(d, nuevaGota(true)); d.py = d.y; } else if (d.y > d.py) limpiar(d.x, d.py, d.x, d.y, d.r * 1.15, 0.45);
    }
    for (const h of hilos) {
      h.acum += h.tasa * dt * rnd(0.6, 1.4);
      while (h.acum >= 1) { h.acum -= 1; emitir(h); emitir(h, true); }
    }
    for (let i = burbujas.length - 1; i >= 0; i--) {
      const b = burbujas[i];
      b.edad += dt; b.r = Math.min(b.r + b.gr * dt, (b.micro ? 1.7 : 4.4) * k);
      const rk = b.r / k, v = (b.micro ? 60 : 85) + (b.micro ? 40 : 95) * rk;     // más grandes, más rápidas
      b.y -= v * dt * (H / 720); b.fase += b.f * dt; b.x += Math.sin(b.fase) * b.amp * dt * 6;
      if (b.y < SUP) {
        if (!b.micro && Math.random() < 0.4) for (let j = 0; j < 2; j++) chispas.push({ x: b.x, y: SUP, vx: rnd(-18, 18) * k, vy: -rnd(30, 70) * k, r: rnd(0.5, 1.1) * k, vida: rnd(0.2, 0.4) });
        burbujas.splice(i, 1);
      }
    }
    for (const p of pegadas) {
      p.r += dt * 0.18 * k;
      if (p.r > p.tope) {                       // se suelta y vuelve a nacer más abajo, pegada a la pared
        burbujas.push({ x: p.x, y: p.y, edad: 0, r: p.r, gr: rnd(0.2, 0.4) * k, fase: rnd(0, 7), f: rnd(3, 6), amp: rnd(0.3, 0.7) * k, a: p.a, micro: false });
        const y = H * rnd(0.3, 0.86), [a2, b2] = interior(y), lado = Math.random() < 0.5;
        p.x = W * (lado ? a2 + rnd(0, 0.03) : b2 - rnd(0, 0.03)); p.y = y; p.r = rnd(1.0, 1.6) * k;
      }
    }
    for (let i = chispas.length - 1; i >= 0; i--) { const c = chispas[i]; c.vida -= dt; c.vy += 220 * k * dt; c.x += c.vx * dt; c.y += c.vy * dt; if (c.vida <= 0) chispas.splice(i, 1); }
    if (barrido) { // pasada de limpieza en zigzag
      barrido.t += dt * 1.6; const p = Math.min(1, barrido.t), fila = Math.floor(p * 5), f = (p * 5) % 1;
      const y = H * (0.28 + fila * 0.12), xa = W * (fila % 2 ? 0.66 : 0.34), xb = W * (fila % 2 ? 0.34 : 0.66);
      limpiar(xa + (xb - xa) * Math.max(0, f - 0.25), y, xa + (xb - xa) * f, y + H * 0.01, W * 0.1);
      if (p >= 1) barrido = null;
    }
    if (cuenta % 4 === 0) { hg.save(); hg.globalCompositeOperation = "destination-out"; hg.fillStyle = "rgba(0,0,0,.02)"; hg.fillRect(0, 0, W, H); hg.restore();
      hg.globalAlpha = 0.05; hg.drawImage(ventana, 0, 0); hg.globalAlpha = 1; }

    tg.globalCompositeOperation = "source-over"; tg.clearRect(0, 0, W, H); tg.drawImage(niebla, 0, 0);
    tg.globalCompositeOperation = "destination-out"; tg.drawImage(huecos, 0, 0);
    ctx.globalAlpha = 1; ctx.drawImage(img, 0, 0, W, H);
    if (espuma) { ctx.globalAlpha = 0.85 + Math.sin(ahora / 900) * 0.08; ctx.drawImage(espuma, 0, 0); ctx.globalAlpha = 1; }
    if (cfg.gas) dibujarGas(ctx, 1);
    ctx.globalAlpha = 0.85; ctx.drawImage(tmp, 0, 0); ctx.globalAlpha = 1;
    if (cfg.gas) dibujarGas(ctx, 0.4);
    for (const d of gotas) dibujarGota(ctx, d);
  }
  cuadro(performance.now()); cancelAnimationFrame(raf);   // un primer cuadro ya pintado
  return { canvas, play() { if (!activo) { activo = true; t0 = performance.now(); raf = requestAnimationFrame(cuadro); } }, pause() { activo = false; cancelAnimationFrame(raf); } };
}

/* ================= 3. ARMADO ================= */

const CLIPS = {                      // id del plato → clip de 3 s (assets/vida/<id>.mp4)
  "cheeseburger-simple": "assets/vida/cheeseburger-simple.mp4",
  "cheeseburger-doble": "assets/vida/cheeseburger-doble.mp4",
  "gino-simple": "assets/vida/gino-simple.mp4",
  "gino-doble": "assets/vida/gino-doble.mp4",
  "otto-simple": "assets/vida/otto-simple.mp4",
  "otto-doble": "assets/vida/otto-doble.mp4",
  "otto-veggie": "assets/vida/otto-veggie.mp4",
  "cheese-veggie": "assets/vida/cheese-veggie.mp4",
  "combo-gino-doble": "assets/vida/combo-gino-doble.mp4",
  "papas": "assets/vida/papas.mp4",
};

function cargarImagen(src, alt) {
  return new Promise((ok, mal) => { const i = new Image(); i.alt = alt || ""; i.decoding = "async"; i.onload = () => ok(i); i.onerror = mal; i.src = src; });
}

// Platos sin clip: la foto se inclina apenas hacia el puntero y un brillo la acompaña.
// En pantallas táctiles el brillo pasa solo, de tanto en tanto (ver vida.css).
function inclinar(stage) {
  const foto = stage.querySelector("img"); if (!foto) return;
  const luz = document.createElement("i"); luz.className = "brillo"; luz.setAttribute("aria-hidden", "true"); stage.appendChild(luz);
  stage.classList.add("con-brillo");
  stage.addEventListener("pointermove", (e) => {
    if (e.pointerType !== "mouse") return;
    const r = stage.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
    foto.style.transform = `perspective(700px) rotateX(${((0.5 - y) * 7).toFixed(2)}deg) rotateY(${((x - 0.5) * 9).toFixed(2)}deg) scale(1.03)`;
    luz.style.setProperty("--gx", (x * 100).toFixed(1) + "%"); luz.style.setProperty("--gy", (y * 100).toFixed(1) + "%"); luz.style.opacity = 1;
  });
  stage.addEventListener("pointerleave", () => { foto.style.transform = ""; luz.style.opacity = 0; });
}

function iniciar() {
  if (quieta) return;                // con "reducir movimiento" quedan las fotos tal cual
  // Platos calientes: humo sobre la foto (y clip en bucle si hay)
  const tarjetas = [...document.querySelectorAll("#grid-burgas .card, #grid-veggie .card, #carousel .card")];
  for (const card of tarjetas) {
    const stage = card.querySelector(".stage"); if (!stage) continue;
    const id = card.dataset.item;
    if (CLIPS[id]) {
      const bucle = bucleSuave(stage, CLIPS[id]);
      stage.classList.add("con-clip");
      bucle.listo.then(() => stage.classList.add("clip-listo"));
      vigilar(card, () => bucle.play(), () => bucle.pause());
    } else {
      inclinar(stage);
    }
  }

  // Acompañamientos (papas, aros, nuggets): son fotos sueltas, no tarjetas; si hay clip, la foto se envuelve y se reproduce
  document.querySelectorAll(".pics3 .pic").forEach((img) => {
    const clave = (img.getAttribute("src") || "").split("/").pop().replace(/-cream\.webp$/, "");
    if (!CLIPS[clave]) return;
    const caja = document.createElement("div");
    caja.className = "pic pic-clip stage";   // .stage: mismo comportamiento de clip que en las tarjetas
    img.replaceWith(caja); img.className = "pic-in"; caja.append(img);
    const bucle = bucleSuave(caja, CLIPS[clave]);
    bucle.listo.then(() => caja.classList.add("clip-listo"));
    vigilar(caja, () => bucle.play(), () => bucle.pause());
  });

  // Bebidas: vaso vivo
  for (const card of document.querySelectorAll("#grid-bebidas .card")) {
    const cfg = VASOS[card.dataset.item]; const stage = card.querySelector(".stage"); if (!cfg || !stage) continue;
    const imgViejo = stage.querySelector("img");
    cargarImagen(cfg.src, imgViejo ? imgViejo.alt : "").then((img) => {
      const v = vasoVivo(stage, img, cfg);
      if (imgViejo) imgViejo.style.display = "none";
      stage.appendChild(v.canvas); stage.classList.add("vaso");
      vigilar(card, () => v.play(), () => v.pause(), "60px");
    }).catch(() => {});
  }

  // Portada: clip de la Gino Doble enmarcado
  const hero = document.querySelector("[data-hero-video]");
  if (hero) {
    const b = bucleSuave(hero, hero.dataset.heroVideo, { fund: 0.8 });
    b.listo.then(() => hero.classList.add("clip-listo"));
    vigilar(hero, () => b.play(), () => b.pause(), "0px");
  }
  window.__vida = true;
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar); else iniciar();
