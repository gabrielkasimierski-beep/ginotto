const $ = s => document.querySelector(s);
const fmt = n => '$' + n.toLocaleString('es-AR');

const rows = a => a.map(({ id, n, p, d }) =>
  `<li data-item="${id}"><div><b>${n}</b>${d ? `<span>${d}</span>` : ''}<em class="soldout-tag">Sin stock</em></div><i></i><strong class="price">${fmt(p)}</strong><div class="add" data-add="${id}"></div></li>`).join('');

const card = (b, eager) => `
  <article class="card" data-item="${b.id}" style="--ac:${b.c}">
    <div class="stage"><span class="soldout-badge">Sin stock</span><img src="assets/${b.img}" alt="${b.n}" width="1024" height="1024" loading="${eager ? 'eager' : 'lazy'}"></div>
    <h3>${b.n}</h3>${b.d ? `<p>${b.d}</p>` : ''}<strong class="price">${fmt(b.p)}</strong>
    <div class="add" data-add="${b.id}"></div>
  </article>`;
$('#grid-burgas').innerHTML = burgas.map((b, i) => card(b, i < 2)).join('');
$('#grid-veggie').innerHTML = veggie.map(b => card(b, false)).join('');

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
