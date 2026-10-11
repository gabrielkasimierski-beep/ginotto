// Store único: autodetecta backend (/api/state) o modo demo con localStorage.
// Interfaz: Store.ready, Store.demo, Store.getState(), Store.getPedidos(), Store.crearPedido(b),
// Store.setEstado(id,e), Store.setDisponible(id,on), Store.setAbierto(a), Store.onChange(cb)
const Store = (() => {
  const KEY = 'ginotto_demo', ESTADOS = ['nuevo', 'preparando', 'listo', 'entregado'];
  let demo = false;
  const listeners = [];
  const str = (v, n) => String(v == null ? '' : v).slice(0, n).trim();
  const fresh = () => ({ store: { abierto: true }, disponibilidad: {}, pedidos: [] });
  const load = () => {
    try { const s = JSON.parse(localStorage.getItem(KEY)); if (s && typeof s === 'object') return Object.assign(fresh(), s); } catch (e) {}
    return fresh();
  };
  let mem = null; // respaldo si localStorage no anda
  const read = () => mem || load();
  const write = s => { try { localStorage.setItem(KEY, JSON.stringify(s)); mem = null; } catch (e) { mem = s; } };
  const api = (u, b) => fetch(u, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) });

  const ready = (async () => {
    try {
      const r = await fetch('/api/state', { cache: 'no-store' });
      const ct = r.headers.get('content-type') || '';
      if (r.ok && ct.includes('json')) { const j = await r.json(); if (j && j.store) { demo = false; return; } }
    } catch (e) {}
    demo = true;
    addEventListener('storage', ev => { if (ev.key === KEY || ev.key === null) listeners.forEach(f => { try { f(); } catch (e) {} }); });
  })();

  return {
    ready,
    get demo() { return demo; },
    onChange(cb) { listeners.push(cb); },
    async getState() {
      await ready;
      if (demo) { const s = read(); return { store: s.store, disponibilidad: s.disponibilidad }; }
      return (await fetch('/api/state', { cache: 'no-store' })).json();
    },
    async getPedidos() {
      await ready;
      if (demo) return read().pedidos.slice().sort((a, b) => b.ts - a.ts);
      return (await fetch('/api/pedidos', { cache: 'no-store' })).json();
    },
    // devuelve {ok:true,nro,id} o {ok:false,error}
    async crearPedido(b) {
      await ready;
      if (!demo) { const r = await api('/api/pedidos', b); const j = await r.json(); return r.ok ? j : { ok: false, error: j.error }; }
      const s = read();
      if (!s.store.abierto) return { ok: false, error: 'El local está cerrado ahora' };
      const items = Array.isArray(b.items) ? b.items.map(i => ({ id: str(i.id, 80), nombre: str(i.nombre, 120), precio: Math.round(Number(i.precio)), qty: Math.floor(Number(i.qty)) })).filter(i => i.id && i.nombre && i.precio >= 0 && i.qty > 0 && i.qty <= 99) : [];
      if (!items.length) return { ok: false, error: 'El pedido no tiene ítems' };
      const ag = items.find(i => s.disponibilidad[i.id] === false);
      if (ag) return { ok: false, error: ag.nombre + ' se agotó. Sacalo del pedido.' };
      const cliente = str(b.cliente, 80), telefono = str(b.telefono, 30);
      if (!cliente || telefono.replace(/\D/g, '').length < 8) return { ok: false, error: 'Nombre y teléfono válidos requeridos' };
      const nro = s.pedidos.reduce((m, p) => Math.max(m, p.nro), 0) + 1;
      const p = { id: 'p' + Date.now().toString(36) + nro, nro, items, total: items.reduce((t, i) => t + i.precio * i.qty, 0), cliente, telefono, tipo: b.tipo === 'delivery' ? 'delivery' : 'retiro', nota: str(b.nota, 300), estado: 'nuevo', ts: Date.now() };
      s.pedidos.push(p); write(s);
      return { ok: true, nro, id: p.id };
    },
    async setEstado(id, estado) {
      await ready;
      if (!demo) return api('/api/pedidos/estado', { id, estado });
      const s = read(), p = s.pedidos.find(x => x.id === id);
      if (p && ESTADOS.includes(estado)) { p.estado = estado; write(s); }
    },
    async setDisponible(itemId, disponible) {
      await ready;
      if (!demo) return api('/api/disponibilidad', { itemId, disponible });
      const s = read(); s.disponibilidad[itemId] = disponible; write(s);
    },
    async setAbierto(abierto) {
      await ready;
      if (!demo) return api('/api/store', { abierto });
      const s = read(); s.store.abierto = abierto; write(s);
    }
  };
})();
