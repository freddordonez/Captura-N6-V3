/* ====================== Captura N6 · interfaz ====================== */
(function(){
'use strict';
const CAP=window.Capacitor, NATIVE=!!(CAP&&CAP.isNativePlatform&&CAP.isNativePlatform());
const $=(s,r)=>(r||document).querySelector(s);
const SVGNS='http://www.w3.org/2000/svg';
function h(tag,attrs){
  const e=document.createElement(tag);
  if(attrs) for(const k in attrs){ const v=attrs[k]; if(v==null||v===false) continue;
    if(k==='class') e.className=v; else if(k==='style'&&typeof v==='object') Object.assign(e.style,v);
    else if(k.slice(0,2)==='on') e.addEventListener(k.slice(2),v); else e.setAttribute(k,v===true?'':v); }
  for(let i=2;i<arguments.length;i++){ const c=arguments[i]; add(e,c); }
  return e;
}
function add(e,c){ if(c==null||c===false) return; if(Array.isArray(c)) c.forEach(x=>add(e,x)); else e.append(c.nodeType?c:document.createTextNode(String(c))); }
function ico(name,cls){ const s=document.createElementNS(SVGNS,'svg'); s.setAttribute('class','ico'+(cls?' '+cls:'')); const u=document.createElementNS(SVGNS,'use'); u.setAttribute('href','#i-'+name); s.appendChild(u); return s; }
const pad2=n=>String(n).padStart(2,'0');
function stampNow(){ const d=new Date(); return d.getFullYear()+pad2(d.getMonth()+1)+pad2(d.getDate())+'_'+pad2(d.getHours())+pad2(d.getMinutes()); }
function dateStr(){ const d=new Date(); return d.getFullYear()+'-'+pad2(d.getMonth()+1)+'-'+pad2(d.getDate())+' '+pad2(d.getHours())+':'+pad2(d.getMinutes()); }
function dayName(){ const d=new Date(); return d.getFullYear()+pad2(d.getMonth()+1)+pad2(d.getDate()); }

/* ---------- almacenamiento ---------- */
const mem={};
const store={
  get(k,d){ try{ const v=localStorage.getItem(k); if(v!=null) return JSON.parse(v); }catch(e){} return (k in mem)?mem[k]:d; },
  set(k,v){ mem[k]=v; try{ localStorage.setItem(k,JSON.stringify(v)); }catch(e){} },
  del(k){ delete mem[k]; try{ localStorage.removeItem(k); }catch(e){} }
};
const DEF={
  theme:'system', home:'grid',
  fmt:{mode:'coord',order:'NEZ',startRow:1,angUnit:'dms',stN:1000,stE:1000,stZ:100,hi:1.5,hr:1.5,orient:0},
  prefix:'Pt', incr:1, codeMode:'last', defCode:'', dup:false, dec:3, coordOrder:'NEH', angFmt:'dms',
  link:true, hiddenLayers:[], follow:true, vibe:true, surf3:true, cn3:true, pts3:true, grid:true, symDef:'circle', symRules:[{match:'EST',sym:'triangle',color:'red',on:true}], num:true, zs:false, codes:false, contours:true, cnStep:'', cnSmooth:true, cnTrim:true, base:'osm',
  delim:'\n', baud:9600, parity:'none', databits:8, lastExport:'csv',
  custom:{name:'Personalizado',pattern:'[Nombre],[Este],[Norte],[Altura],[Código]',sep:',',ext:'csv',head:true}
};
function mergeDef(d,o){ const r=Array.isArray(d)?d.slice():Object.assign({},d); if(o&&typeof o==='object') for(const k in o){ r[k]=(d[k]&&typeof d[k]==='object'&&!Array.isArray(d[k]))?mergeDef(d[k],o[k]):o[k]; } return r; }
let S=mergeDef(DEF,store.get('n6.settings',{}));
function saveS(){ store.set('n6.settings',S); }

let index=store.get('n6.index',[]);
let proj=null, dver=0;
function newProj(o){ return Object.assign({id:'p'+Date.now().toString(36)+Math.floor(Math.random()*1e3),name:'',date:dateStr(),operator:'',device:'South N6+',notes:'',cs:{type:'utm',zone:17,south:true},points:[],next:1},o||{}); }
function saveProjNow(){ if(proj) store.set('n6.p.main',proj); }
let saveT=null; function save(){ clearTimeout(saveT); saveT=setTimeout(saveProjNow,300); }
function touch(){ dver++; save(); notify(); }
function openProj(id){
  let p=store.get('n6.p.'+id,null);
  if(!p){ p=newProj({id,name:'default'}); }
  p.points=p.points||[]; p.cs=p.cs||{type:'utm',zone:17,south:true}; p.next=p.next||p.points.length+1;
  proj=p; dver++; store.set('n6.cur',id);
}
(function boot(){
  // Un único levantamiento en curso (sin proyectos). Si había datos de una versión anterior, se conservan.
  let p=store.get('n6.p.main',null);
  if(!p){ const cur=store.get('n6.cur',null); if(cur) p=store.get('n6.p.'+cur,null); }
  if(!p) p=newProj({id:'main'});
  p.id='main'; p.name='Levantamiento'; p.points=p.points||[]; p.cs=p.cs||{type:'utm',zone:17,south:true}; p.next=p.next||p.points.length+1;
  proj=p; saveProjNow();
})();

/* ---------- puntos ---------- */
function nextName(){
  let n=proj.next, name;
  do{ name=S.prefix+n; n++; }while(proj.points.some(p=>p.id===name));
  return name;
}
function addPts(list,type){
  let added=0, upd=0;
  list.forEach(p=>{
    const pt={id:String(p.id),n:p.n,e:p.e,z:p.z,code:p.code||'',type:type||'survey',t:Date.now()};
    if(!S.dup){ const i=proj.points.findIndex(x=>x.id===pt.id); if(i>=0){ proj.points[i]=pt; upd++; return; } }
    proj.points.push(pt); added++;
  });
  touch(); return {added,upd};
}
function parseOpts(extra){
  const f=S.fmt;
  return Object.assign({mode:f.mode,order:f.order,angUnit:f.angUnit,stN:+f.stN,stE:+f.stE,stZ:+f.stZ,hi:+f.hi,hr:+f.hr,orient:+f.orient,startRow:+f.startRow||1,prefix:S.prefix},extra||{});
}
function fmtN(v,d){ return (+v).toFixed(d==null?S.dec:d); }
function csLabel(){ return proj.cs.type==='utm'?('UTM WGS84 · zona '+proj.cs.zone+(proj.cs.south?' Sur':' Norte')):'Coordenadas locales'; }

/* ---------- archivos (guardar / compartir) ---------- */
async function saveFile(name,mime,content){
  if(NATIVE){
    try{
      const FS=CAP.Plugins.Filesystem, SH=CAP.Plugins.Share;
      const w=await FS.writeFile({path:name,data:content,directory:'CACHE',encoding:'utf8'});
      await SH.share({title:name,url:w.uri,dialogTitle:'Guardar o enviar '+name});
      return true;
    }catch(e){ if(!/cancel/i.test(String(e&&e.message||e))) toast('No se pudo guardar: '+(e&&e.message||e)); return false; }
  }
  const blob=new Blob([content],{type:mime});
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=name;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(a.href),2000);
  return true;
}
function pickFiles(accept,multiple){
  return new Promise(res=>{
    const i=h('input',{type:'file',accept:accept||'',multiple:multiple?true:null,style:{display:'none'}});
    i.onchange=async()=>{ const out=[]; for(const f of Array.from(i.files||[])) out.push({name:f.name,text:await f.text()}); i.remove(); res(out); };
    document.body.appendChild(i); i.click();
  });
}

/* ---------- diálogos y avisos ---------- */
let dlgEl=null;
function closeDlg(){ if(dlgEl){ dlgEl.remove(); dlgEl=null; } }
function dialog(o){
  closeDlg();
  const box=h('div',{class:'dlg',role:'dialog','aria-label':o.title||''},
    o.title?h('div',{class:'dt'},o.title):null,
    h('div',{class:'db'},o.msg!=null?h('div',{class:'msg'},o.msg):null,o.body||null),
    o.buttons&&o.buttons.length?h('div',{class:'da'},o.buttons.map(b=>h('button',{class:'btn '+(b.cls||''),onclick:()=>{ if(b.close!==false) closeDlg(); b.fn&&b.fn(); }},b.l))):null);
  dlgEl=h('div',{id:'dlg',onclick:e=>{ if(e.target===dlgEl&&o.dismiss!==false) closeDlg(); }},box);
  document.body.appendChild(dlgEl); return box;
}
function pick(title,opts,cur){
  return new Promise(res=>{
    const body=h('div',null,opts.map(o=>h('button',{class:'opt',role:'radio','aria-checked':String(o.v===cur),onclick:()=>{ closeDlg(); res(o.v); }},h('span',{class:'rd'}),o.l)));
    dialog({title,body});
  });
}
function confirmDlg(msg,okLabel){
  return new Promise(res=>dialog({title:'Aviso',msg,dismiss:false,buttons:[{l:'Cancelar',cls:'sec',fn:()=>res(false)},{l:okLabel||'Aceptar',fn:()=>res(true)}]}));
}
let toastT=null;
function toast(m){ const old=$('.toast'); if(old) old.remove(); const t=h('div',{class:'toast',role:'status'},m); document.body.appendChild(t); clearTimeout(toastT); toastT=setTimeout(()=>t.remove(),2600); }

/* ---------- filas ---------- */
function band(t){ return h('div',{class:'band'},t); }
function row(label,val,o){
  o=o||{};
  const el=h(o.fn?'button':'div',{class:'row'+(o.fn?' link':' static')+(o.sel?' sel':''),onclick:o.fn||null},h('span',{class:'l'},label),h('span',{class:'v'},val==null?'':val));
  return el;
}
function inputRow(label,o){
  o=o||{};
  const inp=h(o.area?'textarea':'input',{type:o.type||'text',value:o.value==null?'':o.value,placeholder:o.ph||'',inputmode:o.inputmode||null,list:o.list||null,step:o.type==='number'?'any':null,autocomplete:'off',autocapitalize:'off',spellcheck:'false'});
  if(o.value!=null) inp.value=o.value;
  const clr=h('button',{class:'clr',type:'button','aria-label':'Borrar',hidden:true,onclick:()=>{ inp.value=''; inp.focus(); upd(); o.onInput&&o.onInput(''); }},'×');
  const upd=()=>{ clr.hidden=!inp.value||o.type==='number'; };
  inp.addEventListener('input',()=>{ upd(); o.onInput&&o.onInput(inp.value); });
  inp.addEventListener('change',()=>{ o.onChange&&o.onChange(inp.value); });
  upd();
  const r=h('label',{class:'row'},h('span',{class:'l'},label),inp,clr,o.unit?h('span',{class:'u'},o.unit):null,o.after||null);
  r.inp=inp; return r;
}
function swRow(label,checked,fn){
  const b=h('button',{class:'sw',role:'switch','aria-checked':String(!!checked),'aria-label':label,onclick:()=>{ const v=b.getAttribute('aria-checked')!=='true'; b.setAttribute('aria-checked',String(v)); fn(v); }});
  return h('div',{class:'row'},h('span',{class:'l'},label),h('span',{class:'v'}),b);
}
function pickRow(label,title,opts,get,set){
  const find=()=>{ const o=opts.find(x=>x.v===get()); return o?o.l:String(get()); };
  const r=row(label,find(),{fn:async()=>{ const v=await pick(title||label,opts,get()); if(v!==undefined&&v!==get()){ set(v); r.querySelector('.v').textContent=find(); } }});
  return r;
}

/* ---------- navegación ---------- */
const screens={};
let tab=store.get('n6.tab','proj'), stack=[], curDef=null;
if(!['proj','survey','tools'].includes(tab)) tab='proj';
function go(name,params){ stack.push({name,params}); show(); }
function back(){ if(!stack.length) return false; stack.pop(); show(); return true; }
function setTab(t){ tab=t; store.set('n6.tab',t); stack=[]; show(); }
function refresh(){ if(curDef&&curDef.refresh) curDef.refresh(); }
function notify(){ updateStatus(); refresh(); }
function setActions(list){
  const a=$('#actions'); a.textContent='';
  (list||[]).forEach(b=>{ const el=h('button',{class:'btn'+(b.cls?' '+b.cls:''),onclick:b.fn,disabled:b.disabled?true:null},b.l); a.appendChild(el); b.el=el; });
}
function renderBar(def,isHome){
  const bar=$('.bar'); bar.textContent=''; bar.classList.toggle('home',isHome);
  if(isHome){
    bar.append(logoEl('logo'));
    bar.append(h('button',{class:'proj',onclick:()=>go('points'),'aria-label':'Base de puntos'},proj.name||'(sin nombre)',h('small',null,csLabel()+' · '+proj.points.length+' puntos')));
    bar.append(h('span',{class:'st',id:'stat'}));
    bar.append(h('button',{'aria-label':'Estilo de la pantalla principal',onclick:()=>{ S.home=S.home==='grid'?'list':'grid'; saveS(); show(); }},S.home==='grid'?'☰':'▦'));
  } else {
    bar.append(h('button',{'aria-label':'Atrás',onclick:()=>{ back(); }},'‹'),h('div',{class:'ttl'},def.title||''),
      def.help?h('button',{class:'help','aria-label':'Ayuda',onclick:()=>dialog({title:'Ayuda',msg:def.help,buttons:[{l:'Cerrar'}]})},'?'):h('span',{style:{width:'32px'}}));
  }
  updateStatus();
}
function show(){
  if(curDef&&curDef.leave) curDef.leave();
  closeDlg(); document.body.classList.remove('imm');
  if(document.fullscreenElement&&document.exitFullscreen) document.exitFullscreen().catch(()=>{});
  const top=stack[stack.length-1];
  const def=top?screens[top.name](top.params||{}):screens['tab_'+tab]();
  curDef=def;
  renderBar(def,!top);
  const sc=$('#screen'); sc.textContent=''; sc.classList.toggle('full',!!def.full); sc.scrollTop=0;
  sc.appendChild(def.body);
  setActions(def.actions);
  $('#tabs').hidden=!!top;
  document.querySelectorAll('#tabs button').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.tab===tab)));
  if(def.mounted) def.mounted();
}

/* ---------- indicador de recepción ---------- */
const rx={on:false,last:0,sess:0,timer:null,kind:''};
function rxText(){
  const recv=rx.on&&Date.now()-rx.last<1500;
  return {st:!rx.on?'off':(recv?'recv':'wait'),
    txt:!rx.on?'Sin conexión':(recv?('Recibiendo… '+rx.sess+(rx.sess===1?' punto':' puntos')):(rx.sess?('Conectado · '+rx.sess+' puntos recibidos'):'Conectado · esperando datos'))};
}
function updateStatus(){
  const s=$('#stat'); if(s){ const r=rxText(); s.className='st'+(rx.on?' on':''); s.textContent=''; s.append(h('b',null,rx.on?(r.st==='recv'?'Recibiendo':'Conectado'):'Sin conexión'),h('span',null,proj.points.length+' puntos')); }
  document.querySelectorAll('[data-rx]').forEach(e=>{ const r=rxText(); e.dataset.state=r.st; const t=e.querySelector('.rxt'); if(t) t.textContent=r.txt; });
}
let wake=null;
async function keepAwake(on){ try{ if(on&&navigator.wakeLock&&!wake){ wake=await navigator.wakeLock.request('screen'); wake.addEventListener('release',()=>{ wake=null; }); } else if(!on&&wake){ await wake.release(); wake=null; } }catch(e){ wake=null; } }
document.addEventListener('visibilitychange',()=>{ if(!document.hidden&&rx.on) keepAwake(true); });
function rxConnected(on,kind){ keepAwake(on); rx.on=on; rx.kind=kind||''; rx.sess=0; rx.last=0; clearTimeout(rx.timer); notify(); }
function rxData(n){ if(n>0&&S.vibe){ try{ navigator.vibrate&&navigator.vibrate(35); }catch(e){} } rx.last=Date.now(); rx.sess+=n; updateStatus(); clearTimeout(rx.timer); rx.timer=setTimeout(()=>{ updateStatus(); refresh(); },1700); }
function rxWidget(){ return h('span',{class:'rx','data-rx':true,'data-state':'off',role:'status'},h('span',{class:'eq','aria-hidden':'true'},h('i'),h('i'),h('i'),h('i')),h('span',{class:'rxt'},'Sin conexión')); }

/* ---------- registro (depuración) ---------- */
const logLines=[];
function logLine(s){ logLines.push(s); if(logLines.length>800) logLines.splice(0,200); }

/* ---------- ingreso de datos en vivo ---------- */
function ingestLive(text){
  const r=parseText(text,parseOpts({startRow:1}),proj.next);
  proj.next=r.next;
  const res=addPts(r.pts,'survey');
  if(r.errors.length) logLine('! '+r.errors[0]);
  rxData(r.pts.length);
  return res;
}

/* ---------- enlace con la estación ---------- */
const link={
  kind:NATIVE?'bt':'serial', addr:null, devices:[], port:null, reader:null, keep:false, buf:'', listener:null, busy:false,
  get connected(){ return rx.on; }
};
(function(){ const dv=store.get('n6.dev',null); if(dv&&dv.address){ link.sel=dv.address; link.devices=[dv]; } })();
async function btScan(){
  const BS=CAP.Plugins.BluetoothSerial;
  let st=await BS.isEnabled(); if(!st.enabled) st=await BS.enable();
  const r=await BS.scan(); link.devices=(r&&r.devices)||[];
  return link.devices;
}
async function btConnect(addr){
  const BS=CAP.Plugins.BluetoothSerial;
  await BS.connect({address:addr}); link.addr=addr;
  await BS.startNotifications({address:addr,delimiter:S.delim});
  link.listener=await BS.addListener('onRead',r=>{
    const line=String((r&&r.value)||'').replace(/[\r\n]+/g,' ').trim();
    if(line){ logLine(line); ingestLive(line); }
  });
  rxConnected(true,'bt');
}
async function btDisconnect(){
  const BS=CAP.Plugins.BluetoothSerial;
  try{ if(link.addr) await BS.stopNotifications({address:link.addr}); }catch(e){}
  try{ if(link.listener) await link.listener.remove(); }catch(e){}
  try{ await BS.disconnect({address:link.addr}); }catch(e){}
  link.listener=null; link.addr=null; rxConnected(false);
}
async function serialConnect(){
  if(!('serial' in navigator)) throw new Error('Este navegador no permite puertos seriales. Usa Chrome en computador o importa un archivo.');
  link.port=await navigator.serial.requestPort();
  await link.port.open({baudRate:+S.baud,parity:S.parity,dataBits:+S.databits});
  rxConnected(true,'serial'); link.keep=true; link.buf='';
  const dec=new TextDecoderStream(); link.port.readable.pipeTo(dec.writable).catch(()=>{});
  link.reader=dec.readable.getReader();
  (async()=>{
    try{
      while(link.keep){
        const {value,done}=await link.reader.read(); if(done) break; if(!value) continue;
        link.buf+=value; let i;
        while((i=link.buf.search(/\r\n|\n|\r/))>=0){
          const line=link.buf.slice(0,i); link.buf=link.buf.slice(i).replace(/^(\r\n|\n|\r)/,'');
          if(line.trim()){ logLine(line); ingestLive(line); }
        }
      }
    }catch(e){} finally{ await serialDisconnect(); }
  })();
}
async function serialDisconnect(){
  link.keep=false;
  try{ if(link.reader){ await link.reader.cancel(); link.reader.releaseLock(); } }catch(e){}
  try{ if(link.port) await link.port.close(); }catch(e){}
  link.reader=null; link.port=null; rxConnected(false);
}
async function linkToggle(){
  if(link.busy) return; link.busy=true;
  try{
    if(rx.on){ NATIVE?await btDisconnect():await serialDisconnect(); toast('Desconectado'); }
    else if(NATIVE){
      if(!link.addr&&!link.sel){ toast('Busca y elige un equipo primero'); }
      else { await btConnect(link.sel); toast('Conectado'); }
    } else { await serialConnect(); toast('Conectado'); }
  }catch(e){ if(!(e&&e.name==='NotFoundError')) dialog({title:'No se pudo conectar',msg:String(e&&e.message||e),buttons:[{l:'Cerrar'}]}); }
  link.busy=false; notify();
}
