#!/usr/bin/env node
/* =============================================================================
   LABORATORIO DE GINOTTO
   Levanta, cada una en su propio puerto, las propuestas pendientes (ramas del repo que todavía no se
   integraron a main) y un "hub" en http://localhost:8090 para verlas en celu y en compu, una al lado de otra,
   y dejar opinión ("me gusta", "descartar", "cambiaría tal cosa").

     node tools/laboratorio.mjs            -> levanta todo
     node tools/laboratorio.mjs --stop     -> apaga los servidores que quedaron

   Variables: LAB_PORT (hub, 8090) · LAB_BASE (primer puerto de propuestas, 8201) · LAB_REMOTO (remoto, "kolpu")
   Las opiniones quedan en .lab/feedback.json. Las propuestas usan datos de prueba en una carpeta temporal:
   nunca tocan data/ (los pedidos reales del local).
   ============================================================================= */
import { spawn, execFileSync } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LAB = path.join(RAIZ, '.lab');
const WT = path.join(LAB, 'wt');
const PIDS = path.join(LAB, 'pids.json');
const FEEDBACK = path.join(LAB, 'feedback.json');
const ETIQUETAS = path.join(LAB, 'etiquetas.json');          // opcional: { "texto de la rama": { "titulo": "...", "detalle": "..." } }
const HUB = Number(process.env.LAB_PORT || 8090);
const BASE = Number(process.env.LAB_BASE || 8201);
const REMOTO = process.env.LAB_REMOTO || 'kolpu';
const ACTUAL_PUERTO = Number(process.env.LAB_ACTUAL || 8200);
const DATOS = fs.mkdtempSync(path.join(os.tmpdir(), 'ginotto-lab-'));

const git = (...a) => execFileSync('git', a, { cwd: RAIZ, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const leer = (f, def) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return def; } };
const matar = pid => { try { process.platform === 'win32' ? execFileSync('taskkill', ['/PID', String(pid), '/F', '/T'], { stdio: 'ignore' }) : process.kill(pid, 'SIGTERM'); } catch { /* ya no estaba */ } };
fs.mkdirSync(WT, { recursive: true });

// --stop: apaga lo que haya quedado de una corrida anterior
for (const pid of leer(PIDS, [])) matar(pid);
fs.writeFileSync(PIDS, '[]');
if (process.argv.includes('--stop')) { console.log('Laboratorio apagado.'); process.exit(0); }

/* ---------- servidores ---------- */
const hijos = new Map();           // id -> { proc, puerto, dir, ref }
const guardarPids = () => fs.writeFileSync(PIDS, JSON.stringify([...hijos.values()].map(h => h.proc.pid).filter(Boolean)));
function levantar(id, dir, puerto, ref, extra = {}) {
  const proc = spawn(process.execPath, ['serve.js'], {
    cwd: dir, stdio: 'ignore', windowsHide: true,
    env: { ...process.env, PORT: String(puerto), GINOTTO_DATA_DIR: fs.mkdtempSync(path.join(DATOS, id + '-')) },
  });
  hijos.set(id, { proc, puerto, dir, ref, ...extra });
  guardarPids();
}
function bajar(id) {
  const h = hijos.get(id); if (!h) return;
  matar(h.proc.pid); hijos.delete(id); guardarPids();
  if (h.dir.startsWith(WT)) { try { git('worktree', 'remove', '--force', h.dir); } catch { /* sin worktree */ } }
}
const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);

/* ---------- propuestas = ramas del remoto sin integrar ---------- */
function propuestas() {
  let lineas = [];
  try {
    lineas = git('branch', '-r', '--no-merged', `${REMOTO}/main`, '--format=%(refname:short)|%(subject)|%(committerdate:relative)').split('\n').filter(Boolean);
  } catch { /* sin remoto todavía */ }
  return lineas.map(l => { const [ref, asunto, cuando] = l.split('|'); return { ref, asunto, cuando }; })
    .filter(r => r.ref.startsWith(REMOTO + '/') && !/\/(HEAD|main|master)$/.test(r.ref));
}
function sincronizar(traer) {
  if (traer) { try { git('fetch', REMOTO, '--prune'); } catch (e) { console.log('fetch falló:', String(e.message).split('\n')[0]); } }
  const lista = propuestas();
  const vivos = new Set(lista.map(p => slug(p.ref.slice(REMOTO.length + 1))));
  for (const id of [...hijos.keys()]) if (id !== 'actual' && !vivos.has(id)) bajar(id);
  let puerto = BASE;
  for (const p of lista) {
    const id = slug(p.ref.slice(REMOTO.length + 1));
    const dir = path.join(WT, id);
    const existente = hijos.get(id);
    if (existente) { puerto = Math.max(puerto, existente.puerto + 1); continue; }
    try {
      if (fs.existsSync(dir)) git('-C', dir, 'checkout', '-q', '--detach', p.ref);
      else git('worktree', 'add', '--force', '--detach', dir, p.ref);
    } catch (e) { console.log(`no pude preparar ${p.ref}:`, String(e.message).split('\n')[0]); continue; }
    while ([...hijos.values()].some(h => h.puerto === puerto)) puerto++;
    levantar(id, dir, puerto, p.ref, { asunto: p.asunto, cuando: p.cuando });
    puerto++;
  }
}
function variantes() {
  const et = leer(ETIQUETAS, {});
  const out = [{ id: 'actual', titulo: 'Actual (la que está integrada)', detalle: 'Rama nivel-kolpu: lo que ya está en la página.', puerto: ACTUAL_PUERTO }];
  for (const [id, h] of hijos) {
    if (id === 'actual') continue;
    const clave = Object.keys(et).find(k => (h.ref || '').includes(k));
    out.push({ id, titulo: clave ? et[clave].titulo : (h.asunto || id), detalle: clave ? et[clave].detalle : `${h.ref} · ${h.cuando || ''}`, puerto: h.puerto, ref: h.ref });
  }
  return out;
}

/* ---------- hub ---------- */
const PAGINA = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Laboratorio Ginotto</title><style>
:root{--m:#F5B31B;--n:#0b0a09;--c:#151311;--l:rgba(255,255,255,.14)}
*{box-sizing:border-box}body{margin:0;background:var(--n);color:#fff;font:15px/1.45 system-ui,Segoe UI,Arial,sans-serif;display:grid;grid-template-columns:340px 1fr;height:100vh}
aside{border-right:1px solid var(--l);overflow:auto;padding:18px;display:flex;flex-direction:column;gap:12px}
h1{margin:0;font-size:20px;color:var(--m)}p.s{margin:0;color:#bbb;font-size:13px}
.v{border:1px solid var(--l);border-radius:12px;padding:12px;cursor:pointer;background:var(--c)}.v.on{border-color:var(--m);box-shadow:0 0 0 1px var(--m)}
.v b{display:block;font-size:14px}.v small{color:#aaa}.tag{display:inline-block;margin-top:6px;font-size:12px;padding:2px 8px;border-radius:99px;background:#222}
.tag.ok{background:#1d3b1d;color:#8fe38f}.tag.no{background:#3b1d1d;color:#f0a0a0}.tag.mm{background:#3b351d;color:#f0d78f}
button{font:inherit;border:0;border-radius:99px;padding:8px 14px;cursor:pointer;background:var(--m);color:#000;font-weight:700}
button.g{background:#2a2622;color:#fff}textarea{width:100%;min-height:70px;border-radius:10px;border:1px solid var(--l);background:#0f0d0b;color:#fff;padding:8px;font:inherit}
main{display:flex;flex-direction:column;min-width:0}
.bar{display:flex;gap:10px;align-items:center;padding:10px 16px;border-bottom:1px solid var(--l);flex-wrap:wrap}
.bar span{color:#bbb}.frames{flex:1;display:flex;flex-wrap:wrap;gap:18px;justify-content:center;align-items:flex-start;padding:16px;overflow:auto}
.f{border:1px solid var(--l);border-radius:16px;overflow:hidden;background:#000;flex:none}.f iframe{border:0;display:block;background:#000;transform-origin:0 0}
.f.cel{width:312px;height:675px}.f.cel iframe{width:390px;height:844px;transform:scale(.8)}
.f.pc{width:800px;height:500px}.f.pc iframe{width:1280px;height:800px;transform:scale(.625)}
.vacio{margin:auto;color:#999;text-align:center}.fb{border-top:1px solid var(--l);padding-top:12px;display:flex;flex-direction:column;gap:8px}
.fila{display:flex;gap:8px;flex-wrap:wrap}.hist{font-size:12px;color:#aaa}
</style></head><body>
<aside><h1>Laboratorio Ginotto</h1><p class="s">Cada propuesta corre en su propio puerto. Elegí una, mirala en celu y en compu, y dejá tu opinión abajo.</p>
<div class="fila"><button class="g" id="act">Actualizar propuestas</button></div><div id="lista"></div>
<div class="fb" id="fb" hidden><b id="fbt"></b><div class="fila"><button id="b-ok">Me gusta</button><button class="g" id="b-mm">Más o menos</button><button class="g" id="b-no">Descartar</button></div>
<textarea id="nota" placeholder="¿Qué cambiarías? (opcional)"></textarea><div class="fila"><button id="guardar">Guardar opinión</button><span id="msg" class="s"></span></div><div class="hist" id="hist"></div></div></aside>
<main><div class="bar"><b id="tit">—</b><span id="det"></span><span style="flex:1"></span>
<button class="g" data-m="cel">Celu</button><button class="g" data-m="pc">Compu</button><button class="g" data-m="ambos">Ambos</button><button id="abrir">Abrir en pestaña</button></div>
<div class="frames" id="frames"><div class="vacio">Elegí una propuesta de la izquierda.</div></div></main>
<script>
let VAR=[],FB=[],SEL=null,MODO='ambos',VOTO=null;const base=p=>location.protocol+'//'+location.hostname+':'+p+'/';
const $=s=>document.querySelector(s);
async function cargar(){VAR=await (await fetch('/api/variantes')).json();FB=await (await fetch('/api/feedback')).json();pintarLista();if(!SEL&&VAR[0])elegir(VAR[0].id)}
function ultimo(id){return FB.filter(f=>f.id===id).pop()}
function pintarLista(){$('#lista').innerHTML=VAR.map(v=>{const u=ultimo(v.id);const t=u?'<span class="tag '+(u.voto==='ok'?'ok':u.voto==='no'?'no':'mm')+'">'+(u.voto==='ok'?'Me gusta':u.voto==='no'?'Descartada':'Más o menos')+'</span>':'';
return '<div class="v '+(v.id===SEL?'on':'')+'" data-id="'+v.id+'"><b>'+v.titulo+'</b><small>'+v.detalle+'</small><br>'+t+'</div>'}).join('')||'<p class="s">Todavía no hay propuestas.</p>';
document.querySelectorAll('.v').forEach(e=>e.onclick=()=>elegir(e.dataset.id))}
function elegir(id){SEL=id;VOTO=null;const v=VAR.find(x=>x.id===id);if(!v)return;$('#tit').textContent=v.titulo;$('#det').textContent=v.detalle;$('#fb').hidden=false;$('#fbt').textContent='Tu opinión sobre: '+v.titulo;
$('#nota').value='';$('#msg').textContent='';histo();pintarLista();marcos()}
function marcos(){const v=VAR.find(x=>x.id===SEL);if(!v)return;const u=base(v.puerto);let h='';
if(MODO!=='pc')h+='<div class="f cel"><iframe src="'+u+'" title="celu"></iframe></div>';if(MODO!=='cel')h+='<div class="f pc"><iframe src="'+u+'" title="compu"></iframe></div>';$('#frames').innerHTML=h}
function histo(){$('#hist').innerHTML=FB.filter(f=>f.id===SEL).slice(-3).map(f=>new Date(f.ts).toLocaleString()+' · '+f.voto+(f.nota?' · '+f.nota:'')).join('<br>')}
document.querySelectorAll('[data-m]').forEach(b=>b.onclick=()=>{MODO=b.dataset.m;marcos()});
$('#abrir').onclick=()=>{const v=VAR.find(x=>x.id===SEL);if(v)open(base(v.puerto),'_blank')};
$('#b-ok').onclick=()=>{VOTO='ok';$('#msg').textContent='Voto: me gusta'};$('#b-mm').onclick=()=>{VOTO='mm';$('#msg').textContent='Voto: más o menos'};$('#b-no').onclick=()=>{VOTO='no';$('#msg').textContent='Voto: descartar'};
$('#guardar').onclick=async()=>{if(!SEL)return;const r=await fetch('/api/feedback',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:SEL,voto:VOTO||'mm',nota:$('#nota').value.trim()})});
$('#msg').textContent=r.ok?'Guardado. Se lo paso a Claude en la próxima ronda.':'No se pudo guardar';await cargar();histo()};
$('#act').onclick=async()=>{$('#act').textContent='Buscando…';await fetch('/api/refrescar',{method:'POST'});await cargar();$('#act').textContent='Actualizar propuestas'};
cargar();
</script></body></html>`;

function cuerpo(req) { return new Promise(res => { const c = []; req.on('data', d => c.push(d)); req.on('end', () => { try { res(JSON.parse(Buffer.concat(c).toString() || '{}')); } catch { res({}); } }); }); }
const json = (r, code, o) => { r.writeHead(code, { 'Content-Type': 'application/json;charset=utf-8', 'Cache-Control': 'no-store' }); r.end(JSON.stringify(o)); };

http.createServer(async (q, r) => {
  const url = q.url.split('?')[0];
  if (url === '/') { r.writeHead(200, { 'Content-Type': 'text/html;charset=utf-8' }); return r.end(PAGINA); }
  if (url === '/api/variantes') return json(r, 200, variantes());
  if (url === '/api/feedback' && q.method === 'GET') return json(r, 200, leer(FEEDBACK, []));
  if (url === '/api/feedback' && q.method === 'POST') {
    const b = await cuerpo(q); const todo = leer(FEEDBACK, []);
    todo.push({ id: String(b.id || '').slice(0, 80), voto: ['ok', 'mm', 'no'].includes(b.voto) ? b.voto : 'mm', nota: String(b.nota || '').slice(0, 1000), ts: Date.now() });
    fs.writeFileSync(FEEDBACK, JSON.stringify(todo, null, 2)); return json(r, 200, { ok: true });
  }
  if (url === '/api/refrescar' && q.method === 'POST') { sincronizar(true); return json(r, 200, { ok: true, n: hijos.size }); }
  json(r, 404, { error: 'no existe' });
}).listen(HUB, () => console.log(`Laboratorio: http://localhost:${HUB}`));

/* ---------- arranque ---------- */
levantar('actual', RAIZ, ACTUAL_PUERTO, 'nivel-kolpu');
sincronizar(true);
const apagar = () => { for (const h of hijos.values()) matar(h.proc.pid); process.exit(0); };
process.on('SIGINT', apagar); process.on('SIGTERM', apagar); process.on('exit', () => { for (const h of hijos.values()) matar(h.proc.pid); });
