const http=require('http'),fs=require('fs'),path=require('path');
const PORT=process.env.PORT||8080;
const T={'.html':'text/html;charset=utf-8','.css':'text/css','.js':'text/javascript','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg','.svg':'image/svg+xml','.glb':'model/gltf-binary','.json':'application/json','.mp4':'video/mp4'};
const DATA_DIR=path.join(__dirname,'data'),STATE_FILE=path.join(DATA_DIR,'state.json');
const ESTADOS=['nuevo','preparando','listo','entregado'];

// ---- estado persistente (escritura atómica: tmp + rename) ----
let state={store:{abierto:true},disponibilidad:{},pedidos:[]};
try{fs.mkdirSync(DATA_DIR,{recursive:true});state=Object.assign(state,JSON.parse(fs.readFileSync(STATE_FILE,'utf8')))}catch(e){}
function save(){const tmp=STATE_FILE+'.tmp';fs.writeFileSync(tmp,JSON.stringify(state,null,2));fs.renameSync(tmp,STATE_FILE)}
if(!fs.existsSync(STATE_FILE))save();

let MENU_DATA=[];
try{
 const vm=require('vm');
 const script=new vm.Script(fs.readFileSync(path.join(__dirname,'menu-data.js'),'utf8')+'\n; MENU');
 MENU_DATA=script.runInNewContext({});
}catch(e){console.error('Error cargando menu-data.js',e)}

const json=(r,code,obj)=>{r.statusCode=code;r.setHeader('Content-Type','application/json;charset=utf-8');r.setHeader('Cache-Control','no-store');r.end(JSON.stringify(obj))};
const body=q=>new Promise(res=>{const c=[];let n=0;q.on('data',d=>{c.push(d);n+=d.length;if(n>100000){q.destroy();res({_too_large:true});return}});q.on('end',()=>{if(n>100000)return;try{res(JSON.parse(Buffer.concat(c).toString()||'{}'))}catch(e){res(null)}})});
const str=(v,n)=>String(v==null?'':v).slice(0,n).trim();

async function api(q,r,url){
 if(q.method==='GET'&&url==='/api/state')return json(r,200,{store:state.store,disponibilidad:state.disponibilidad});
 if(q.method==='GET'&&url==='/api/pedidos')return json(r,200,state.pedidos.slice().sort((a,b)=>b.ts-a.ts));
 if(q.method!=='POST')return json(r,405,{error:'método no permitido'});
 const b=await body(q);
 if(b&&b._too_large)return json(r,413,{error:'Payload Too Large'});
 if(!b)return json(r,400,{error:'JSON inválido'});
 if(url==='/api/disponibilidad'){
  if(!b.itemId||typeof b.disponible!=='boolean')return json(r,400,{error:'itemId y disponible requeridos'});
  state.disponibilidad[str(b.itemId,80)]=b.disponible;save();return json(r,200,{ok:true,disponibilidad:state.disponibilidad});
 }
 if(url==='/api/store'){
  if(typeof b.abierto!=='boolean')return json(r,400,{error:'abierto requerido'});
  state.store.abierto=b.abierto;save();return json(r,200,{ok:true,store:state.store});
 }
 if(url==='/api/pedidos'){
  if(!state.store.abierto)return json(r,409,{error:'El local está cerrado ahora'});
  if(!Array.isArray(b.items)||b.items.length===0)return json(r,400,{error:'El pedido no tiene ítems'});
  const items=[];
  for(const i of b.items){
   if(!i||typeof i!=='object'||typeof i.id!=='string'||typeof i.qty!=='number')return json(r,400,{error:'Ítem inválido'});
   const qty=Math.floor(i.qty);
   if(qty<=0||qty>99)return json(r,400,{error:'Cantidad inválida'});
   const ref=MENU_DATA.find(x=>x.id===i.id);
   if(!ref)return json(r,400,{error:'Producto inexistente: '+i.id});
   if(state.disponibilidad[ref.id]===false)return json(r,409,{error:ref.nombre+' se agotó. Sacalo del pedido.',itemId:ref.id});
   items.push({id:ref.id,nombre:ref.nombre,precio:ref.precio,qty});
  }
  const cliente=str(b.cliente,80),telefono=str(b.telefono,30);
  if(!cliente||typeof b.cliente!=='string'||b.cliente.trim().length===0)return json(r,400,{error:'Nombre inválido'});
  if(!telefono||typeof b.telefono!=='string'||telefono.replace(/\D/g,'').length<8)return json(r,400,{error:'Teléfono inválido'});
  const nro=state.pedidos.reduce((m,p)=>Math.max(m,p.nro),0)+1;
  const p={id:'p'+Date.now().toString(36)+nro,nro,items,total:items.reduce((s,i)=>s+i.precio*i.qty,0),cliente,telefono,tipo:b.tipo==='delivery'?'delivery':'retiro',nota:str(b.nota,300),estado:'nuevo',ts:Date.now()};
  state.pedidos.push(p);save();return json(r,200,{ok:true,nro:p.nro,id:p.id});
 }
 if(url==='/api/pedidos/estado'){
  if(!b.id||typeof b.id!=='string'||!b.estado||typeof b.estado!=='string')return json(r,400,{error:'id y estado requeridos'});
  const p=state.pedidos.find(x=>x.id===b.id);
  if(!p||!ESTADOS.includes(b.estado))return json(r,400,{error:'pedido o estado inválido'});
  const idxActual=ESTADOS.indexOf(p.estado);
  const idxNuevo=ESTADOS.indexOf(b.estado);
  if(idxNuevo<=idxActual)return json(r,400,{error:'transición de estado inválida'});
  p.estado=b.estado;save();return json(r,200,{ok:true});
 }
 json(r,404,{error:'no existe'});
}

http.createServer((q,r)=>{
 const url=q.url.split('?')[0];
 if(url.startsWith('/api/'))return api(q,r,url).catch(e=>json(r,500,{error:String(e)}));
 if(q.method==='POST'&&q.url.startsWith('/save/')){const n=path.basename(q.url.slice(6));const c=[];q.on('data',d=>c.push(d));q.on('end',()=>{fs.writeFileSync(path.join(__dirname,'assets',n),Buffer.concat(c));r.end('ok')});return}
 let p=decodeURIComponent(url);
 if(p==='/panel'||p==='/qr'){r.statusCode=302;r.setHeader('Location',p+'/');return r.end()}
 if(p.endsWith('/'))p+='index.html';
 const f=path.join(__dirname,p);
 if(!f.startsWith(__dirname+path.sep)||f.startsWith(DATA_DIR)){r.statusCode=403;return r.end('403')}
 fs.stat(f,(e,st)=>{if(e||!st.isFile()){r.statusCode=404;return r.end('404')}
  const isMedia=/\.(webp|mp4|glb|png|jpg|svg)$/i.test(f);
  r.setHeader('Content-Type',T[path.extname(f)]||'application/octet-stream');r.setHeader('Access-Control-Allow-Origin','*');
  r.setHeader('Cache-Control',isMedia?'public, max-age=86400, stale-while-revalidate=604800':'no-cache');
  r.setHeader('Accept-Ranges','bytes');
  // Range: el video del hero se recorre con el scroll (currentTime) y necesita pedir tramos
  const m=/^bytes=(\d*)-(\d*)$/.exec(q.headers.range||'');
  if(m&&(m[1]||m[2])){const a=m[1]?+m[1]:st.size-(+m[2]),b=m[1]&&m[2]?Math.min(+m[2],st.size-1):st.size-1;
   if(a>b||a>=st.size){r.statusCode=416;r.setHeader('Content-Range','bytes */'+st.size);return r.end()}
   r.statusCode=206;r.setHeader('Content-Range','bytes '+a+'-'+b+'/'+st.size);r.setHeader('Content-Length',b-a+1);return fs.createReadStream(f,{start:a,end:b}).pipe(r)}
  r.setHeader('Content-Length',st.size);fs.createReadStream(f).pipe(r)})
}).listen(PORT,()=>console.log('http://localhost:'+PORT));
