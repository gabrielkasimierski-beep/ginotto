// Carrito + disponibilidad + checkout propio. Depende de menu-data.js (MENU) y app.js (render).
const BY_ID = Object.fromEntries(MENU.map(i => [i.id, i]));
const cart = (() => { try { return JSON.parse(localStorage.getItem('gino-cart') || '{}'); } catch (e) { return {}; } })();
for (const id of Object.keys(cart)) if (!BY_ID[id]) delete cart[id];
let estado = { store: { abierto: true }, disponibilidad: {} };
const persist = () => { try { localStorage.setItem('gino-cart', JSON.stringify(cart)); } catch (e) {} };
const disponible = id => estado.disponibilidad[id] !== false;
const abierto = () => estado.store.abierto !== false;
const count = () => Object.values(cart).reduce((a, b) => a + b, 0);
const total = () => Object.entries(cart).reduce((s, [id, q]) => s + BY_ID[id].precio * q, 0);

// ---- controles Agregar (+/−) ----
function renderAdd(el) {
  const id = el.dataset.add, q = cart[id] || 0;
  const n = BY_ID[id] ? BY_ID[id].nombre || BY_ID[id].n || 'producto' : 'producto';
  el.innerHTML = q
    ? `<div class="qty"><button type="button" data-d="-1" aria-label="Quitar uno de ${n}">−</button><b aria-label="${q} de ${n}">${q}</b><button type="button" data-d="1" aria-label="Agregar otro ${n}">+</button></div>`
    : `<button type="button" class="btn-add" data-d="1" aria-label="Agregar ${n}">Agregar</button>`;
  const off = !disponible(id);
  el.querySelectorAll('button').forEach(b => { if (off && b.dataset.d === '1') b.disabled = true; });
}
function paint() {
  document.querySelectorAll('[data-add]').forEach(renderAdd);
  document.querySelectorAll('[data-item]').forEach(el => el.classList.toggle('soldout', !disponible(el.dataset.item)));
  $('#closed-banner').hidden = abierto();
  const n = count();
  const fab = $('#cart-fab');
  fab.hidden = n === 0;
  fab.querySelector('.n').textContent = n;
  fab.querySelector('.t').textContent = fmt(total());
  if (!drawer.hidden) renderDrawer();
}
function change(id, d) {
  if (d > 0 && !disponible(id)) return;
  const q = Math.max(0, Math.min(99, (cart[id] || 0) + d));
  if (q) cart[id] = q; else delete cart[id];
  persist(); paint();
  const n = BY_ID[id] ? BY_ID[id].nombre || BY_ID[id].n || 'producto' : 'producto';
  const announcer = $('#sr-announcer');
  if (announcer) {
    if (q === 0) announcer.textContent = `${n} eliminado del pedido. Total: ${fmt(total())}`;
    else announcer.textContent = `${q} ${n} en el pedido. Total: ${fmt(total())}`;
  }
}
document.addEventListener('click', e => {
  const b = e.target.closest('.add button');
  if (b) change(b.closest('.add').dataset.add, +b.dataset.d);
});

// ---- drawer / checkout ----
const drawer = $('#drawer');
let vista = 'carrito', lastNro = null, errMsg = '', lastFocus = null;
function openDrawer(v) {
  lastFocus = document.activeElement;
  vista = v || 'carrito'; errMsg = ''; drawer.hidden = false; document.body.classList.add('noscroll'); renderDrawer();
  const title = $('#drawer-title');
  if (title) title.focus();
}
function closeDrawer() {
  drawer.hidden = true; document.body.classList.remove('noscroll');
  if (lastFocus) lastFocus.focus();
}
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function renderDrawer() {
  const body = $('#drawer-body');
  if (vista === 'ok') {
    body.innerHTML = `<div class="ok"><h3>¡Pedido enviado!</h3><p class="nro">#${lastNro}</p>
      <p>Te contactamos por WhatsApp para coordinar el pago y la entrega.</p>
      ${Store.demo ? '<p class="demo-note">(demo — no se envía un pedido real)</p>' : ''}
      <button type="button" class="btn btn-big" id="ok-close">Listo</button></div>`;
    $('#ok-close').onclick = closeDrawer; return;
  }
  const ids = Object.keys(cart);
  if (!ids.length) {
    body.innerHTML = `<p class="empty">Tu pedido está vacío. Sumá algo rico de la carta.</p><button type="button" class="btn" id="empty-close">Ver la carta</button>`;
    $('#empty-close').onclick = closeDrawer; return;
  }
  const lines = ids.map(id => {
    const it = BY_ID[id], off = !disponible(id);
    return `<li class="${off ? 'off' : ''}"><div><b>${esc(it.nombre)}</b>${off ? '<small>Sin stock, sacalo del pedido</small>' : ''}</div>
      <div class="add" data-add="${id}"></div><strong>${fmt(it.precio * cart[id])}</strong></li>`;
  }).join('');
  const blocked = !abierto() || ids.some(id => !disponible(id));
  const saved = (() => { try { return JSON.parse(localStorage.getItem('gino-cli') || '{}'); } catch (e) { return {}; } })();
  const keep = ['f-nombre', 'f-tel', 'f-nota'].reduce((o, k) => { const el = document.getElementById(k); if (el) o[k] = el.value; return o; }, {});
  const tipoPrev = (document.querySelector('input[name=tipo]:checked') || {}).value || 'retiro';
  body.innerHTML = `<ul class="lines">${lines}</ul>
    <div class="sum"><span>Total</span><strong>${fmt(total())}</strong></div>
    ${!abierto() ? '<p class="warn">El local está cerrado ahora. Podés ver la carta pero no enviar pedidos.</p>' : ''}
    <form id="co" novalidate>
      <label for="f-nombre">Nombre</label>
      <input id="f-nombre" autocomplete="name" required aria-describedby="co-err" value="${esc(keep['f-nombre'] ?? saved.n ?? '')}">
      <label for="f-tel">Teléfono (WhatsApp)</label>
      <input id="f-tel" type="tel" inputmode="tel" autocomplete="tel" aria-describedby="co-err" placeholder="11 5555 5555" required value="${esc(keep['f-tel'] ?? saved.t ?? '')}">

      <fieldset class="tipo" role="radiogroup">
        <legend class="sr-only">Tipo de entrega</legend>
        <label for="f-retiro"><input id="f-retiro" type="radio" name="tipo" value="retiro" ${tipoPrev === 'retiro' ? 'checked' : ''}><span>Retiro</span></label>
        <label for="f-delivery"><input id="f-delivery" type="radio" name="tipo" value="delivery" ${tipoPrev === 'delivery' ? 'checked' : ''}><span>Delivery</span></label>
      </fieldset>

      <label for="f-nota">Nota (opcional)</label>
      <textarea id="f-nota" rows="2" maxlength="300" placeholder="Sin cebolla, dirección si es delivery...">${esc(keep['f-nota'] ?? '')}</textarea>

      <p class="err" id="co-err" role="alert">${esc(errMsg)}</p>
      <button type="submit" class="btn btn-big" ${blocked ? 'disabled' : ''}>Enviar pedido</button>
    </form>`;
  body.querySelectorAll('[data-add]').forEach(renderAdd);
  $('#co').onsubmit = enviar;
}
async function enviar(e) {
  e.preventDefault();
  const n = $('#f-nombre').value.trim(), t = $('#f-tel').value.trim();
  const err = $('#co-err');
  if (!n) { err.textContent = 'Poné tu nombre.'; return; }
  if (t.replace(/\D/g, '').length < 8) { err.textContent = 'Poné un teléfono válido para el WhatsApp.'; return; }
  const btn = e.submitter || $('#co button[type=submit]'); btn.disabled = true; err.textContent = '';
  try {
    const j = await Store.crearPedido({
      items: Object.entries(cart).map(([id, qty]) => ({ id, nombre: BY_ID[id].nombre, precio: BY_ID[id].precio, qty })),
      cliente: n, telefono: t, tipo: document.querySelector('input[name=tipo]:checked').value, nota: $('#f-nota').value.trim()
    });
    if (!j.ok) { errMsg = j.error || 'No pudimos enviar el pedido.'; await refresh(); renderDrawer(); return; }
    try { localStorage.setItem('gino-cli', JSON.stringify({ n, t })); } catch (x) {}
    for (const k of Object.keys(cart)) delete cart[k];
    persist(); lastNro = j.nro; vista = 'ok'; paint(); renderDrawer();
  } catch (x) { btn.disabled = false; err.textContent = 'Sin conexión con el local. Probá de nuevo o pedí por fu.do.'; }
}
$('#drawer-close').onclick = closeDrawer;
$('#drawer-bg').onclick = closeDrawer;
addEventListener('keydown', e => { if (e.key === 'Escape' && !drawer.hidden) closeDrawer(); });
drawer.addEventListener('keydown', e => {
  if (e.key === 'Tab') {
    const focusables = Array.from(drawer.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'));
    if (focusables.length === 0) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey) {
      if (document.activeElement === first || document.activeElement === $('#drawer-title')) { last.focus(); e.preventDefault(); }
    } else {
      if (document.activeElement === last || document.activeElement === $('#drawer-title')) { first.focus(); e.preventDefault(); }
    }
  }
});
$('#cart-fab').onclick = () => openDrawer('carrito');
document.querySelectorAll('[data-open-checkout]').forEach(a => a.addEventListener('click', e => { e.preventDefault(); openDrawer('carrito'); }));

// ---- estado del local (al cargar y cada 15 s) ----
async function refresh() {
  try { estado = await Store.getState(); } catch (e) { }
  const focused = document.activeElement && document.activeElement.closest && document.activeElement.closest('#drawer');
  if (!focused) paint(); else { $('#closed-banner').hidden = abierto(); }
}
paint();
refresh().then(() => paint());
setInterval(() => { if (!Store.demo) refresh(); }, 15000);
Store.ready.then(() => Store.onChange(refresh));
