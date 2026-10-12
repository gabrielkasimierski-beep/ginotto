const $ = s => document.querySelector(s);
const fmt = n => '$' + n.toLocaleString('es-AR');

const rows = a => a.map(({ id, n, p, d }) =>
  `<li data-item="${id}"><div><b>${n}</b>${d ? `<span>${d}</span>` : ''}<em class="soldout-tag">Sin stock</em></div><i></i><strong class="price">${fmt(p)}</strong><div class="add" data-add="${id}"></div></li>`).join('');

/* Fotos de estudio (assets/foto/<id>.webp, 3:4, burga real sobre piso damero). Si una burga todavía no tiene
   su foto, se usa el recorte con fondo transparente. */
const FOTOS = new Set(window.FOTOS_ESTUDIO || ['cheeseburger-simple', 'cheeseburger-doble', 'gino-simple', 'gino-doble', 'otto-simple', 'otto-doble', 'otto-veggie', 'cheese-veggie']);
const fotoDe = b => FOTOS.has(b.id) ? `assets/foto/${b.id}.webp` : `assets/${b.img.replace('-cream', '-cut')}`;

// Tarjeta de producto: foto 3:4, nombre, precio, descripción y botón de agregar
const tarjeta = (b, i) => `
  <article class="card" data-item="${b.id}" style="--i:${i % 3};--ac:${b.c || '#F5B31B'}">
    <div class="shot${FOTOS.has(b.id) ? ' shot--foto' : ''}">
      <img src="${fotoDe(b)}" alt="" width="768" height="1024" loading="lazy" decoding="async" draggable="false">
      <span class="soldout-badge">Sin stock</span>
    </div>
    <div class="row"><h3>${b.n}</h3><strong class="price">${fmt(b.p)}</strong></div>
    ${b.d ? `<p class="desc">${b.d}</p>` : ''}
    <div class="add" data-add="${b.id}"></div>
  </article>`;

$('#grid-burgas').innerHTML = burgas.map(tarjeta).join('');
$('#grid-veggie').innerHTML = veggie.map(tarjeta).join('');

$('#list-acomp').innerHTML = rows(acomp);
$('#list-extra').innerHTML = rows(extras);

// Combos y bebidas: foto de estudio 3:4 (assets/foto/<id>.webp para combos, assets/foto/bebida-*.webp para bebidas)
const foto = (b, src, i, alt) => `
  <article class="card" data-item="${b.id}" style="--i:${(i || 0) % 3}">
    <div class="shot shot--foto"><img src="${src}" alt="" width="768" height="1024" loading="lazy" decoding="async" draggable="false"><span class="soldout-badge">Sin stock</span></div>
    <div class="row"><h3>${b.n}</h3><strong class="price">${fmt(b.p)}</strong></div>
    ${b.d ? `<p class="desc">${b.d}</p>` : ''}
    <div class="add" data-add="${b.id}"></div>
  </article>`;

const car = $('#carousel');
car.innerHTML = combos.map((c, i) => foto(c, `assets/foto/${c.id}.webp`, i, c.id === 'combo-ginotto' ? c.n : 'Combo ' + c.n)).join('');
const step = () => car.querySelector('.card').offsetWidth + 18;
const bp = $('.car-btn.prev'), bn = $('.car-btn.next');
bp.onclick = () => car.scrollBy({ left: -step(), behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
bn.onclick = () => car.scrollBy({ left: step(), behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
const upd = () => {
  bp.disabled = Math.ceil(car.scrollLeft) <= 5;
  bn.disabled = Math.ceil(car.scrollLeft) >= car.scrollWidth - car.clientWidth - 5;
  if (car.scrollLeft > 20) $('.swipe-hint').style.opacity = 0;
};
car.addEventListener('scroll', upd, { passive: true });
addEventListener('resize', upd, { passive: true });
upd();
// arrastre con mouse (desktop)
let dn = false, sx = 0, sl = 0, moved = false;
car.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse') return; dn = true; moved = false; sx = e.clientX; sl = car.scrollLeft; });
addEventListener('pointermove', e => { if (!dn) return; const dx = e.clientX - sx; if (Math.abs(dx) > 4) { moved = true; car.classList.add('drag'); } if (moved) car.scrollLeft = sl - dx; });
addEventListener('pointerup', () => { dn = false; car.classList.remove('drag'); });
car.addEventListener('click', e => { if (moved) { e.preventDefault(); moved = false; } }, true);

$('#grid-bebidas').innerHTML = bebidas.map((b, i) => foto(b, `assets/foto/${b.img.replace('-cream.webp', '')}.webp`, i)).join('');

// Insertar JSON-LD
const ld = {
  "@context": "https://schema.org",
  "@type": "Restaurant",
  "name": LOCAL_DATA.name,
  "image": new URL("assets/foto/gino-doble.webp", location.href).href,
  "@id": location.origin + "/",
  "url": location.origin + "/",
  "telephone": LOCAL_DATA.telephone,
  "address": {
    "@type": "PostalAddress",
    "streetAddress": LOCAL_DATA.address.streetAddress,
    "addressLocality": LOCAL_DATA.address.addressLocality,
    "addressRegion": LOCAL_DATA.address.addressRegion,
    "addressCountry": "AR"
  },
  "openingHoursSpecification": LOCAL_DATA.openingHoursSpecification.map(oh => ({
    "@type": "OpeningHoursSpecification",
    ...oh
  })),
  "hasMenu": location.origin + "/#carta",
  "sameAs": [
    LOCAL_DATA.urls.instagram
  ]
};

const script = document.createElement('script');
script.type = 'application/ld+json';
script.text = JSON.stringify(ld);
document.head.appendChild(script);

// Reemplazar info de la sección del local
const infoLocal = $('.local-grid .info');
if (infoLocal) {
  infoLocal.innerHTML = `
    <h3>Dónde estamos</h3>
    <p class="big">${LOCAL_DATA.address.streetAddress}<br><small>${LOCAL_DATA.address.addressLocality}, ${LOCAL_DATA.address.addressRegion}</small></p>
    <h3>Horarios</h3>
    ${LOCAL_DATA.horariosHTML}
    <div class="contact">
      <a class="btn-primary" href="${LOCAL_DATA.urls.whatsapp}" target="_blank" rel="noopener">WhatsApp ${LOCAL_DATA.telephone.replace('+54 9 ', '')}</a>
      <a class="btn-ghost" href="${LOCAL_DATA.urls.instagram}" target="_blank" rel="noopener">@ginotto.ar</a>
    </div>
    <p class="mail"><a href="mailto:${LOCAL_DATA.urls.mail}">${LOCAL_DATA.urls.mail}</a></p>
  `;
}
