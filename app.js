const $ = s => document.querySelector(s);
const fmt = n => '$' + n.toLocaleString('es-AR');

const rows = a => a.map(({ id, n, p, d }) =>
  `<li data-item="${id}"><div><b>${n}</b>${d ? `<span>${d}</span>` : ''}<em class="soldout-tag">Sin stock</em></div><i></i><strong class="price">${fmt(p)}</strong><div class="add" data-add="${id}"></div></li>`).join('');

// Tarjeta simple (bebidas): foto + nombre + precio
const card = (b, eager) => `
  <article class="card" data-item="${b.id}" style="--ac:${b.c}">
    <div class="stage"><span class="soldout-badge">Sin stock</span><img src="assets/${b.img}" alt="${b.n}" width="1024" height="1024" loading="${eager ? 'eager' : 'lazy'}"></div>
    <h3>${b.n}</h3>${b.d ? `<p>${b.d}</p>` : ''}<strong class="price">${fmt(b.p)}</strong>
    <div class="add" data-add="${b.id}"></div>
  </article>`;

/* ---------- Los mundos: cada burga es un mundo de color, con sus ingredientes flotando ----------
   Cada ingrediente: s = archivo en assets/props · x, y = lugar (% del escenario) · w = ancho (%)
   r = ángulo · z = profundidad (menos de 1 detrás de la burga, más de 1 delante: se mueve más) */
const PROPS = {
  'cheeseburger-simple': [
    { s: 'cebolla-mitad', x: -4, y: 4, w: 30, r: -22, z: 0.7 }, { s: 'cheddar', x: 76, y: 8, w: 26, r: 24, z: 0.8 },
    { s: 'pepinillos', x: 68, y: 68, w: 34, r: 14, z: 1.5, f: 1 }, { s: 'tomate-entero', x: -6, y: 66, w: 28, r: -16, z: 1.7, f: 1 }],
  'cheeseburger-doble': [
    { s: 'cebolla', x: -4, y: 6, w: 30, r: -18, z: 0.7 }, { s: 'cheddar-pila', x: 74, y: 10, w: 30, r: 22, z: 0.8 },
    { s: 'pepinillos', x: 70, y: 66, w: 34, r: 18, z: 1.5, f: 1 }, { s: 'cebolla-mitad', x: -8, y: 64, w: 32, r: -24, z: 1.8, f: 1 }],
  'gino-simple': [
    { s: 'cheddar', x: -4, y: 4, w: 26, r: -20, z: 0.7 }, { s: 'bacon', x: 74, y: 6, w: 30, r: 20, z: 0.8 },
    { s: 'medallon', x: 70, y: 72, w: 30, r: 10, z: 1.5, f: 1 }, { s: 'bacon', x: -10, y: 62, w: 36, r: -24, z: 1.7, f: 1 }],
  'gino-doble': [
    { s: 'pan', x: -4, y: 6, w: 28, r: -22, z: 0.7 }, { s: 'cheddar', x: 78, y: 6, w: 26, r: 26, z: 0.8 },
    { s: 'medallon', x: 70, y: 70, w: 32, r: 12, z: 1.5, f: 1 }, { s: 'bacon', x: -12, y: 60, w: 38, r: -22, z: 1.8, f: 1 }],
  'otto-simple': [
    { s: 'tomate', x: -4, y: 6, w: 28, r: -20, z: 0.7 }, { s: 'cheddar', x: 78, y: 10, w: 26, r: 22, z: 0.8 },
    { s: 'lechuga', x: -10, y: 60, w: 38, r: -26, z: 1.7, f: 1 }, { s: 'tomate-entero', x: 74, y: 68, w: 28, r: 16, z: 1.5, f: 1 }],
  'otto-doble': [
    { s: 'cebolla-mitad', x: -4, y: 6, w: 28, r: -18, z: 0.7 }, { s: 'tomate', x: 76, y: 8, w: 28, r: 20, z: 0.8 },
    { s: 'lechuga', x: 66, y: 62, w: 40, r: 24, z: 1.7, f: 1 }, { s: 'tomate-entero', x: -8, y: 68, w: 28, r: -16, z: 1.5, f: 1 }],
  'otto-veggie': [
    { s: 'tomate', x: -4, y: 6, w: 28, r: -22, z: 0.7 }, { s: 'cebolla', x: 78, y: 10, w: 26, r: 18, z: 0.8 },
    { s: 'lechuga', x: -10, y: 60, w: 40, r: -26, z: 1.7, f: 1 }, { s: 'tomate-entero', x: 74, y: 68, w: 28, r: 14, z: 1.5, f: 1 }],
  'cheese-veggie': [
    { s: 'cebolla-mitad', x: -4, y: 6, w: 28, r: -20, z: 0.7 }, { s: 'cheddar', x: 78, y: 8, w: 26, r: 24, z: 0.8 },
    { s: 'tomate', x: 72, y: 70, w: 28, r: 16, z: 1.5, f: 1 }, { s: 'lechuga', x: -10, y: 62, w: 36, r: -24, z: 1.7, f: 1 }]
};

const mundo = (b, i, prev) => {
  const props = (PROPS[b.id] || []).map((p, k) =>
    `<img class="prop${p.f ? ' prop--f' : ''}" data-z="${p.z}" style="--x:${p.x}%;--y:${p.y}%;--w:${p.w}%;--r:${p.r}deg;--d:${(0.25 + k * 0.14).toFixed(2)}s" src="assets/props/${p.s}.webp" alt="" aria-hidden="true" loading="lazy">`);
  const atras = props.filter((_, k) => !PROPS[b.id][k].f).join('');
  const frente = props.filter((_, k) => PROPS[b.id][k].f).join('');
  const nombre = b.n.toUpperCase().replace(' ', '<br>');
  const larga = Math.max(...b.n.split(' ').map(w => w.length));      // que la palabra entre en la pantalla
  const fs = Math.min(26, 150 / larga).toFixed(1), fsd = Math.min(17, 70 / larga * 1.15).toFixed(1);
  return `
  <article class="mundo" data-item="${b.id}" data-escena style="--ac:${b.c};--fs:${fs}vw;--fs-d:${fsd}vw;--prev:${prev || 'var(--cream)'}">
    <div class="mundo__fondo" aria-hidden="true"></div>
    <div class="mundo__fantasma" data-z="0.35" aria-hidden="true">${nombre}</div>
    <div class="mundo__escena">
      <div class="mundo__aro" data-z="0.5" aria-hidden="true"></div>
      ${atras}
      <img class="mundo__burga" data-z="1" src="assets/${b.img.replace('-cream', '-cut')}" alt="${b.n}" width="1024" height="1024" loading="lazy">
      <div class="mundo__sombra" aria-hidden="true"></div>
      ${frente}
    </div>
    <div class="mundo__info">
      <p class="mundo__num">Nº ${String(i + 1).padStart(2, '0')}</p>
      <h3>${b.n}</h3>
      <p class="mundo__desc">${b.d}</p>
      <div class="mundo__pie"><strong class="price">${fmt(b.p)}</strong><div class="add" data-add="${b.id}"></div></div>
    </div>
    <span class="soldout-badge">Sin stock</span>
  </article>`;
};
$('#grid-burgas').innerHTML = burgas.map((b, i) => mundo(b, i, i ? burgas[i - 1].c : null)).join('');
$('#grid-veggie').innerHTML = veggie.map((b, i) => mundo(b, burgas.length + i, i ? veggie[i - 1].c : null)).join('');

$('#list-acomp').innerHTML = rows(acomp);
$('#list-extra').innerHTML = rows(extras);

const ccard = c => `
  <article class="card ccard" data-item="${c.id}" style="--ac:${c.c}">
    <div class="stage"><span class="soldout-badge">Sin stock</span><img src="assets/${c.img}" alt="Combo ${c.n}" width="1024" height="1024" loading="lazy" draggable="false"></div>
    <h3>${c.n}</h3><p>${c.d}</p><strong class="price">${fmt(c.p)}</strong>
    <div class="add" data-add="${c.id}"></div>
  </article>`;
const car = $('#carousel');
car.innerHTML = combos.map(ccard).join('');
const step = () => car.querySelector('.ccard').offsetWidth + 18;
const bp = $('.car-btn.prev'), bn = $('.car-btn.next');
bp.onclick = () => car.scrollBy({ left: -step(), behavior: 'smooth' });
bn.onclick = () => car.scrollBy({ left: step(), behavior: 'smooth' });
const upd = () => {
  bp.disabled = car.scrollLeft < 8;
  bn.disabled = car.scrollLeft > car.scrollWidth - car.clientWidth - 8;
  if (car.scrollLeft > 20) $('.swipe-hint').style.opacity = 0;
};
car.addEventListener('scroll', upd, { passive: true }); upd();
// arrastre con mouse (desktop)
let dn = false, sx = 0, sl = 0, moved = false;
car.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse') return; dn = true; moved = false; sx = e.clientX; sl = car.scrollLeft; });
addEventListener('pointermove', e => { if (!dn) return; const dx = e.clientX - sx; if (Math.abs(dx) > 4) { moved = true; car.classList.add('drag'); } if (moved) car.scrollLeft = sl - dx; });
addEventListener('pointerup', () => { dn = false; car.classList.remove('drag'); });
car.addEventListener('click', e => { if (moved) { e.preventDefault(); moved = false; } }, true);

$('#grid-bebidas').innerHTML = bebidas.map(b => card(b, false)).join('');
