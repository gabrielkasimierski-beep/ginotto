/* Ginotto · carta viva
   Humo para los platos calientes, vasos que sudan (con gas y espuma) para las bebidas y clips cortos en bucle.
   Sin dependencias. No toca app.js ni cart.js: se engancha al HTML que ya genera la carta
   (.card[data-item] y .stage), así los pedidos, la disponibilidad y los precios siguen siendo los de siempre.

   Qué hace cada pieza:
     - Humo: UN solo canvas WebGL para toda la página; dibuja volutas sobre los elementos que están a la vista.
     - Vaso: un canvas 2D por bebida (niebla, gotas que resbalan, gas, espuma). El mouse o un deslizamiento
       horizontal limpian el vidrio; un toque lanza una pasada de limpieza.
     - Clips: video muerto de 3–5 s en bucle con fundido (sin corte), solo mientras está en pantalla.
   Todo se apaga con "reducir movimiento": quedan las fotos. */

const quieta = matchMedia("(prefers-reduced-motion: reduce)").matches;
const celu = matchMedia("(max-width: 700px)").matches;
const rnd = (a, b) => a + Math.random() * (b - a);

/* ================= 1. HUMO ================= */

const VS = `
attribute vec2 aP; uniform vec4 uR; uniform vec2 uV; varying vec2 vUv;
void main(){ vUv = aP; vec2 px = uR.xy + aP * uR.zw;
  gl_Position = vec4(px.x / uV.x * 2.0 - 1.0, 1.0 - px.y / uV.y * 2.0, 0.0, 1.0); }`;

const FS = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
varying vec2 vUv; uniform float uT, uSeed, uPico; uniform vec3 uCol;
float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(h(i), h(i + vec2(1.0, 0.0)), f.x), mix(h(i + vec2(0.0, 1.0)), h(i + vec2(1.0, 1.0)), f.x), f.y); }
float fbm(vec2 p){ float a = 0.5, s = 0.0; for (int i = 0; i < 4; i++) { s += a * n(p); p *= 2.03; a *= 0.5; } return s; }
void main(){
  vec2 uv = vec2(vUv.x, 1.0 - vUv.y);                 // y: 0 en la base, 1 arriba
  float t = uT;
  float w = (fbm(vec2(uv.y * 1.7 - t * 0.11, uSeed)) - 0.5) * 0.6 * uv.y;   // ondula más cuanto más sube
  vec2 st = vec2((uv.x - 0.5 + w) * 1.5 + uSeed * 3.0, uv.y * 1.1 - t * 0.14);
  float d = fbm(st * 2.4 + vec2(0.0, -t * 0.06)) * 0.75 + fbm(st * 5.0 + vec2(t * 0.03, -t * 0.1)) * 0.25;
  float hum = smoothstep(0.46, 0.74, d);
  float lado = smoothstep(0.0, 0.32, uv.x) * smoothstep(1.0, 0.68, uv.x);
  float alto = smoothstep(0.0, 0.22, uv.y) * smoothstep(1.0, 0.28, uv.y);
  float a = hum * lado * alto * uPico;
  gl_FragColor = vec4(uCol * a, a);
}`;

function crearVapor() {
  const canvas = document.createElement("canvas");
  canvas.className = "vapor-capa"; canvas.setAttribute("aria-hidden", "true");
  const gl = canvas.getContext("webgl", { premultipliedAlpha: true, alpha: true, antialias: false, powerPreference: "low-power" });
  if (!gl) return null;
  const comp = (tipo, src) => { const s = gl.createShader(tipo); gl.shaderSource(s, src); gl.compileShader(s); return s; };
  const prog = gl.createProgram();
  gl.attachShader(prog, comp(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, comp(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null;
  document.body.appendChild(canvas);
  gl.useProgram(prog);
  const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]), gl.STATIC_DRAW);
  const aP = gl.getAttribLocation(prog, "aP"); gl.enableVertexAttribArray(aP); gl.vertexAttribPointer(aP, 2, gl.FLOAT, false, 0, 0);
  const U = (n) => gl.getUniformLocation(prog, n);
  const uR = U("uR"), uV = U("uV"), uT = U("uT"), uSeed = U("uSeed"), uPico = U("uPico"), uCol = U("uCol");
  gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

  const items = new Set();
  let W = 0, H = 0; const dpr = Math.min(devicePixelRatio || 1, 1.5);
  function tam() { W = innerWidth; H = innerHeight; canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr); gl.viewport(0, 0, canvas.width, canvas.height); }
  addEventListener("resize", tam); tam();
  const io = new IntersectionObserver((es) => es.forEach((e) => { e.target.__vap.vis = e.isIntersecting; }), { rootMargin: "60px" });

  // plan: [{ x, y, w, h, seed, pico }] en fracciones del rectángulo del elemento (y desde arriba)
  function agregar(el, plan, col = [0.84, 0.8, 0.76]) {
    const it = { el, vis: false, plan, col }; el.__vap = it; items.add(it); io.observe(el); return it;
  }
  const t0 = performance.now();
  function dibujar(ahora) {
    requestAnimationFrame(dibujar);
    if (document.hidden) return;
    gl.disable(gl.SCISSOR_TEST); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); gl.enable(gl.SCISSOR_TEST);
    gl.uniform2f(uV, W, H); gl.uniform1f(uT, (ahora - t0) / 1000);
    for (const it of items) {
      if (!it.vis) continue;
      const r = it.el.getBoundingClientRect();
      if (r.bottom < 0 || r.top > H || r.width < 4 || r.height < 4) continue;
      gl.scissor(Math.round(r.left * dpr), Math.round((H - r.bottom) * dpr), Math.round(r.width * dpr), Math.round(r.height * dpr));
      gl.uniform3f(uCol, it.col[0], it.col[1], it.col[2]);
      for (const p of it.plan) {
        gl.uniform4f(uR, r.left + p.x * r.width, r.top + p.y * r.height, p.w * r.width, p.h * r.height);
        gl.uniform1f(uSeed, p.seed); gl.uniform1f(uPico, p.pico);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      }
    }
  }
  requestAnimationFrame(dibujar);
  return { agregar };
}

// Tres volutas sobre la parte alta del plato (para una tarjeta cuadrada con la burga centrada)
const planHeroe = () => [
  { x: 0.2, y: 0.0, w: 0.46, h: 0.5, seed: 0.0, pico: 0.55 }, { x: 0.38, y: 0.0, w: 0.46, h: 0.5, seed: 0.4, pico: 0.5 },
  { x: 0.3, y: -0.04, w: 0.5, h: 0.54, seed: 0.8, pico: 0.45 }, { x: 0.12, y: 0.03, w: 0.4, h: 0.46, seed: 1.2, pico: 0.4 },
];

/* ================= 2. CLIPS EN BUCLE CON FUNDIDO ================= */

function bucleSuave(contenedor, src, { fund = 0.7 } = {}) {
  const mk = () => {
    const v = document.createElement("video");
    v.muted = true; v.loop = false; v.playsInline = true; v.setAttribute("playsinline", ""); v.setAttribute("aria-hidden", "true");
    v.preload = "auto"; v.src = src; v.className = "vv"; v.style.opacity = 0; return v;
  };
  const a = mk(), b = mk(); contenedor.append(a, b);
  let act = a, otra = b, fundiendo = false, tf = 0, activo = false, raf = 0;
  function tick(ahora) {
    raf = requestAnimationFrame(tick);
    const d = act.duration || 0;
    if (d && !fundiendo && act.currentTime > d - fund - 0.05) { otra.currentTime = 0; otra.play().catch(() => {}); otra.style.opacity = 0; fundiendo = true; tf = ahora; }
    if (fundiendo) {
      const k = Math.min(1, (ahora - tf) / (fund * 1000));
      otra.style.opacity = k;
      if (k >= 1) { act.pause(); act.style.opacity = 0; const tmp = act; act = otra; otra = tmp; fundiendo = false; }
    }
  }
  return {
    play() { if (activo) return; activo = true; act.style.opacity = 1; act.play().catch(() => {}); raf = requestAnimationFrame(tick); },
    pause() { if (!activo) return; activo = false; cancelAnimationFrame(raf); a.pause(); b.pause(); },
    listo: new Promise((ok) => { a.addEventListener("loadeddata", ok, { once: true }); a.addEventListener("error", ok, { once: true }); }),
  };
}

function vigilar(el, alEntrar, alSalir, margen = "120px") {
  const io = new IntersectionObserver((es) => es.forEach((e) => (e.isIntersecting ? alEntrar() : alSalir())), { rootMargin: margen });
  io.observe(el);
}

/* ================= 3. VASO QUE SUDA ================= */

// Forma del vidrio (fracciones de la imagen) y línea de la superficie, por bebida
const VASOS = {
  "bebida-coca": { src: "assets/vida/bebida-cola.webp", gas: 1, espuma: true, sup: 0.2 },
  "bebida-coca-zero": { src: "assets/vida/bebida-cola-zero.webp", gas: 1, espuma: true, sup: 0.2 },
  "bebida-sprite": { src: "assets/vida/bebida-lima.webp", gas: 1.3, sup: 0.2 },
  "bebida-agua": { src: "assets/vida/bebida-agua.webp", gas: 0, sup: 0.2 },
  "bebida-agua-gas": { src: "assets/vida/bebida-agua-gas.webp", gas: 1.6, sup: 0.2 },
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

  // gas: hilos de burbujas que suben y revientan en la superficie
  const SUP = H * cfg.sup;
  const hilos = cfg.gas ? Array.from({ length: Math.round((celu ? 7 : 10) * cfg.gas) }, () => ({ x: rnd(0.36, 0.64), tasa: rnd(3, 8) * Math.min(1.4, cfg.gas), acum: Math.random() })) : [];
  const burbujas = [], chispas = [];
  const interior = (y) => { const t = Math.max(0, (y - H * yT) / (H * (yB - yT))); return [x0 + (xb0 - x0) * t + 0.03, x1 + (xb1 - x1) * t - 0.03]; };
  function emitir(h) {
    const y = H * rnd(0.82, 0.89), [a, b] = interior(y);
    burbujas.push({ x: W * Math.max(a, Math.min(b, h.x + rnd(-0.02, 0.02))), y, r: rnd(2.2, 5) * k, vy: rnd(80, 160) * H / 1168, fase: rnd(0, 7), amp: rnd(1, 3.2) * k, f: rnd(2, 5), a: rnd(0.55, 0.95) });
  }
  function dibujarGas(g, mult) {
    g.save();
    for (const b of burbujas) {
      const rr = b.r * (1 + 0.3 * (1 - (b.y - SUP) / (H * 0.7)));
      g.globalAlpha = b.a * mult; g.lineWidth = Math.max(1, rr * 0.3); g.strokeStyle = "rgba(255,246,222,.95)"; g.fillStyle = "rgba(255,255,255,.16)";
      g.beginPath(); g.arc(b.x, b.y, rr, 0, 7); g.fill(); g.stroke();
      g.fillStyle = "rgba(255,255,255,.98)"; g.beginPath(); g.arc(b.x - rr * 0.35, b.y - rr * 0.38, Math.max(0.8, rr * 0.28), 0, 7); g.fill();
    }
    for (const c of chispas) { g.globalAlpha = Math.max(0, c.vida * 1.8) * Math.min(1, mult + 0.3); g.fillStyle = "rgba(255,248,230,.95)"; g.beginPath(); g.arc(c.x, c.y, c.r, 0, 7); g.fill(); }
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
    for (const h of hilos) { h.acum += h.tasa * dt; while (h.acum >= 1) { h.acum -= 1; emitir(h); } }
    for (let i = burbujas.length - 1; i >= 0; i--) {
      const b = burbujas[i];
      b.y -= b.vy * dt * (1 + (H * 0.9 - b.y) / H * 0.8); b.fase += b.f * dt; b.x += Math.sin(b.fase) * b.amp * dt;
      if (b.y < SUP) { if (Math.random() < 0.5) for (let j = 0; j < 3; j++) chispas.push({ x: b.x, y: SUP, vx: rnd(-26, 26) * k, vy: -rnd(40, 90) * k, r: rnd(0.8, 1.6) * k, vida: rnd(0.25, 0.5) }); burbujas.splice(i, 1); }
    }
    for (let i = chispas.length - 1; i >= 0; i--) { const c = chispas[i]; c.vida -= dt; c.vy += 260 * k * dt; c.x += c.vx * dt; c.y += c.vy * dt; if (c.vida <= 0) chispas.splice(i, 1); }
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

/* ================= 4. ARMADO ================= */

const CLIPS = {                      // id del plato → clip corto (se suman a medida que se generan)
  "gino-doble": "assets/vida/gino-doble.mp4",
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
  const vapor = crearVapor();

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

  // Portada: clip de la burga con humo
  const hero = document.querySelector("[data-hero-video]");
  if (hero) {
    const b = bucleSuave(hero, hero.dataset.heroVideo, { fund: 0.8 });
    b.listo.then(() => hero.classList.add("clip-listo"));
    vigilar(hero, () => b.play(), () => b.pause(), "0px");
    if (vapor) vapor.agregar(hero, planHeroe(), [1, 0.985, 0.95]);
  }
  window.__vida = true;
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar); else iniciar();
