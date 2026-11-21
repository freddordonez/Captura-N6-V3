
/* ====================== Pantallas principales ====================== */
const MODULES={
  proj:[
    {t:'Estación total',items:[['bt','Comunicación','comm'],['format','Formato de datos','format'],['log','Registro de recepción','log']]},
    {t:'Puntos',items:[['pin','Base de puntos','points'],['import','Importar puntos','importPts'],['export','Exportar puntos','exportPts']]},
    {t:'Configuración',items:[['axes','Sistema de coordenadas','cs'],['gear','Ajustes','settings'],['info','Acerca de','about']]}],
  survey:[
    {t:'Recepción',items:[['live','Recepción en vivo','live']]},
    {t:'Vista del levantamiento',items:[['plan','Dibujo','plan'],['cube','Vista 3D','view3d'],['map','Mapa','map'],['layers','Capas','layers'],['sym','Símbolos del dibujo','symbols']]}],
  tools:[{t:'Cálculos',items:[['area','Área y perímetro','area'],['cogo','COGO','cogo'],['angle','Conversor de ángulos','angleConv'],['convert','Conversor de coordenadas','coordConv']]}]
};
function homeBody(groups){
  const w=h('div',{class:'homewrap'});
  groups.forEach(g=>{
    w.append(band(g.t));
    w.append(S.home==='list'
      ? h('div',{class:'list'},g.items.map(m=>h('button',{class:'row link',onclick:()=>go(m[2])},ico(m[0]),h('span',{class:'l',style:{maxWidth:'none',flex:1}},m[1]))))
      : h('div',{class:'grid'},g.items.map(m=>h('button',{class:'tile',onclick:()=>go(m[2])},ico(m[0]),m[1]))));
  });
  return w;
}
['proj','survey','tools'].forEach(t=>{ screens['tab_'+t]=()=>({body:homeBody(MODULES[t])}); });

screens.cs=()=>{
  const c=proj.cs;
  const zr=inputRow('Zona UTM',{type:'number',value:c.zone,inputmode:'numeric',onChange:v=>{ c.zone=Math.min(60,Math.max(1,Math.floor(+v||17))); save(); }});
  const hr=pickRow('Hemisferio','Hemisferio',[{v:true,l:'Sur'},{v:false,l:'Norte'}],()=>c.south,v=>{ c.south=v; save(); });
  const sync=()=>{ zr.hidden=hr.hidden=c.type!=='utm'; };
  const body=h('div',null,band('Sistema de coordenadas de los datos'),
    pickRow('Tipo','Sistema de coordenadas',[{v:'utm',l:'UTM WGS84'},{v:'local',l:'Coordenadas locales'}],()=>c.type,v=>{ c.type=v; save(); sync(); }),zr,hr,
    h('div',{class:'note'},'La zona y el hemisferio se usan para el mapa, la exportación a Google Earth y el conversor de coordenadas. Ecuador continental: zona 17 Sur (zona 18 al este de 78°W). Con coordenadas locales el mapa no está disponible.'));
  sync();
  return {title:'Sistema de coordenadas',body,help:'Define cómo se interpretan las coordenadas Norte y Este del proyecto.'};
};

/* ---------- Base de puntos ---------- */
const CODES=[['ACE','Acera'],['ALC','Alcantarilla'],['ARBOL','Árbol'],['BM','Mojón / BM'],['BOR','Bordillo'],['BORDE','Borde'],['CAJ','Caja de revisión'],['CERCA','Cerca'],['COR','Corona de talud'],['CUNETA','Cuneta'],['EDIF','Edificación'],['EJE','Eje de vía'],['ESQ','Esquina'],['EST','Estación'],['LUM','Luminaria'],['MURO','Muro'],['PIE','Pie de talud'],['POSTE','Poste'],['POZO','Pozo'],['PTO','Puerta'],['QUEB','Quebrada'],['RIO','Río'],['SEM','Semáforo'],['TN','Terreno natural'],['TUB','Tubería'],['VIA','Vía']];
function codePicker(onPick){
  const list=h('div'); const q=h('input',{type:'search',placeholder:'Buscar código',style:{width:'100%',padding:'10px',border:0,borderBottom:'1px solid var(--line)',background:'var(--bg)',color:'var(--fg)'}});
  const draw=()=>{ list.textContent=''; CODES.filter(c=>(c[0]+' '+c[1]).toLowerCase().includes(q.value.toLowerCase())).forEach(c=>list.append(h('button',{class:'opt',onclick:()=>{ closeDlg(); onPick(c[0]); }},h('span',{style:{flex:1}},c[1]),h('b',null,c[0])))); };
  q.oninput=draw; draw(); dialog({title:'Códigos',body:h('div',null,q,list)});
}
function pointRows(ptsArr,selRef,onSel,opt){
  opt=opt||{};
  const enFirst=S.coordOrder==='ENH';
  const t=h('table',{class:'tbl'},h('thead',null,h('tr',null,h('th'),h('th',null,'Nombre'),h('th',null,enFirst?'Este':'Norte'),h('th',null,enFirst?'Norte':'Este'),h('th',null,'Altura'),h('th',null,'Código'))));
  const tb=h('tbody');
  ptsArr.forEach(p=>{
    const tr=h('tr',{class:selRef()===p?'sel':'',onclick:()=>{ onSel(p); }},
      h('td',null,h('span',{class:'mk'+(p.type==='input'?' in':'')})),h('td',null,p.id),h('td',null,fmtN(enFirst?p.e:p.n)),h('td',null,fmtN(enFirst?p.n:p.e)),h('td',null,fmtN(p.z)),h('td',null,p.code||''));
    tb.append(tr);
  });
  t.append(tb); return t;
}
function pointsScreen(mode,cb){
  let field='id', q='', page=0, sel=null; const PS=100;
  const holder=h('div',{style:{overflowX:'auto'}}), cnt=h('div',{class:'count'});
  const fsel=h('select',null,h('option',{value:'id'},'Nombre'),h('option',{value:'code'},'Código'));
  const qi=h('input',{type:'search',placeholder:'Buscar'});
  const go1=h('button',{class:'btn sm',onclick:()=>{ q=qi.value.toLowerCase(); field=fsel.value; page=0; draw(); }},'Buscar');
  const body=h('div',null,h('div',{class:'tools'},fsel,qi,go1),cnt,holder);
  function filtered(){ return proj.points.filter(p=>!q||String(p[field]||'').toLowerCase().includes(q)).slice().reverse(); }
  function draw(){
    const all=filtered(), pages=Math.max(1,Math.ceil(all.length/PS)); if(page>=pages) page=pages-1;
    const slice=all.slice(page*PS,page*PS+PS);
    cnt.textContent='Total '+all.length+'   Página '+(page+1)+'/'+pages;
    holder.textContent='';
    if(!all.length){ holder.append(h('div',{class:'note'},'No hay puntos. Conecta la estación, importa un archivo o pulsa «Agregar».')); }
    else { holder.append(pointRows(slice,()=>sel,p=>{ sel=(sel===p?null:p); draw(); }));
      if(pages>1) holder.append(h('div',{class:'tools'},h('button',{class:'btn sm sec',disabled:page===0?true:null,onclick:()=>{ page--; draw(); }},'‹ Anterior'),h('span',{style:{flex:1,textAlign:'center'}},(page+1)+' / '+pages),h('button',{class:'btn sm sec',disabled:page>=pages-1?true:null,onclick:()=>{ page++; draw(); }},'Siguiente ›'))); }
  }
  const def={title:mode==='pick'?'Elegir punto':'Base de puntos',body,refresh:draw,mounted:draw,
    help:'Todos los puntos del levantamiento. Toca un punto para seleccionarlo. Los puntos azules vienen de la estación; los naranjas se ingresaron a mano.'};
  const need=f=>()=>{ if(!sel){ toast('Selecciona un punto'); return; } f(sel); };
  if(mode==='pick') def.actions=[{l:'Cancelar',cls:'sec',fn:()=>back()},{l:'OK',fn:need(p=>{ back(); cb(p); })}];
  else def.actions=[{l:'Agregar',fn:()=>go('pointEdit',{})},{l:'Editar',fn:need(p=>go('pointEdit',{pt:p}))},{l:'Detalles',fn:need(p=>go('pointDetails',{pt:p}))},{l:'Importar',fn:()=>go('importPts')},
    {l:'…',cls:'mini sec',fn:async()=>{
      const v=await pick('Opciones',[{v:'del',l:'Eliminar el punto seleccionado'},{v:'all',l:'Eliminar todos los puntos'},{v:'sortn',l:'Ordenar por nombre'},{v:'sortt',l:'Ordenar por orden de captura'}]); if(!v) return;
      if(v==='del'){ if(!sel){ toast('Selecciona un punto'); return; } proj.points=proj.points.filter(p=>p!==sel); sel=null; touch(); toast('Punto eliminado'); }
      else if(v==='all'){ if(!proj.points.length) return; if(await confirmDlg('¿Eliminar todos los puntos?\nNo se puede deshacer.','Eliminar')){ proj.points=[]; proj.next=1; sel=null; touch(); toast('Se eliminaron todos los puntos'); } }
      else if(v==='sortn'){ proj.points.sort((a,b)=>String(a.id).localeCompare(String(b.id),undefined,{numeric:true})); touch(); }
      else { proj.points.sort((a,b)=>(a.t||0)-(b.t||0)); touch(); } }}];
  return def;
}
screens.points=()=>pointsScreen('db');
screens.pickPoint=p=>pointsScreen('pick',p.cb);
screens.pointEdit=p=>{
  const ed=p.pt, f=ed?{id:ed.id,code:ed.code||'',n:ed.n,e:ed.e,z:ed.z,type:ed.type||'survey'}:{id:nextName(),code:S.codeMode==='fixed'?S.defCode:(proj.lastCode||''),n:'',e:'',z:'',type:'input'};
  const idr=inputRow('Nombre',{value:f.id,onInput:v=>f.id=v});
  const cr=inputRow('Código',{value:f.code,list:'codelist',onInput:v=>f.code=v,after:h('button',{class:'clr',type:'button','aria-label':'Lista de códigos',style:{width:'26px',borderRadius:'4px',fontSize:'13px'},onclick:()=>codePicker(c=>{ f.code=c; cr.inp.value=c; })},'▤')});
  const dl=h('datalist',{id:'codelist'},CODES.map(c=>h('option',{value:c[0]},c[1])));
  const body=h('div',null,dl,idr,cr,row('Tipo de coordenada','NEH'),
    inputRow('Norte',{type:'number',value:f.n,unit:'m',inputmode:'decimal',onInput:v=>f.n=v}),
    inputRow('Este',{type:'number',value:f.e,unit:'m',inputmode:'decimal',onInput:v=>f.e=v}),
    inputRow('Altura',{type:'number',value:f.z,unit:'m',inputmode:'decimal',onInput:v=>f.z=v}),
    pickRow('Tipo de punto','Tipo de punto',[{v:'survey',l:'Levantado'},{v:'input',l:'Ingresado'}],()=>f.type,v=>f.type=v));
  return {title:ed?'Editar punto':'Agregar punto',body,actions:[{l:'Cancelar',cls:'sec',fn:()=>back()},{l:'OK',fn:()=>{
    const id=String(f.id).trim(); if(!id){ toast('El nombre no puede estar vacío'); return; }
    const n=parseFloat(f.n), e=parseFloat(f.e), z=f.z===''?0:parseFloat(f.z);
    if(!isFinite(n)||!isFinite(e)||!isFinite(z)){ toast('Norte, Este y Altura deben ser números'); return; }
    const dup=proj.points.find(x=>x.id===id&&x!==ed);
    if(dup&&!S.dup){ toast('Ya existe un punto con ese nombre'); return; }
    if(ed){ Object.assign(ed,{id,code:f.code.trim(),n,e,z,type:f.type}); }
    else { proj.points.push({id,code:f.code.trim(),n,e,z,type:f.type,t:Date.now()}); proj.next+=Math.max(1,+S.incr||1); }
    if(S.codeMode==='last') proj.lastCode=f.code.trim();
    touch(); back(); toast(ed?'Punto actualizado':'Punto agregado'); }}]};
};
screens.pointDetails=p=>{
  const q=p.pt, ll=proj.cs.type==='utm'?utmToLatLon(q.e,q.n,proj.cs.zone,proj.cs.south):null;
  const body=h('div',null,row('Nombre',q.id),row('Código',q.code||'—'),row('Norte',fmtN(q.n)+' m'),row('Este',fmtN(q.e)+' m'),row('Altura',fmtN(q.z)+' m'),
    ll?row('Latitud',fmtAngle(ll[0],'dms',4)):null,ll?row('Longitud',fmtAngle(ll[1],'dms',4)):null,row('Tipo',q.type==='input'?'Ingresado':'Levantado'),q.t?row('Hora',new Date(q.t).toLocaleString()):null);
  return {title:'Detalles del punto',body,actions:[{l:'OK',fn:()=>back()}]};
};

/* ---------- Importar ---------- */
const FMT_DESC=()=>{ const f=S.fmt; return f.mode==='polar'?'Polar: Punto, Hz, V, Distancia inclinada, Código':(f.order==='CASS'?'CASS: Punto, Código, Este, Norte, Altura':f.order==='ENZ'?'ENH: Punto, Este, Norte, Altura, Código':'NEH: Punto, Norte, Este, Altura, Código'); };
screens.importPts=()=>{
  let text='', pending=[]; const msg=h('div',{class:'err'});
  const ta=h('textarea',{placeholder:'1,1000.000,2000.000,350.120,ESQ\n2,1005.250,2003.100,350.400,POSTE',style:{width:'100%',minHeight:'130px',border:0,padding:'12px 14px',background:'var(--row)',color:'var(--fg)',fontFamily:'var(--mono)',fontSize:'13px',resize:'vertical',outline:'none'},oninput:()=>text=ta.value});
  const fl=row('Formato de datos',FMT_DESC(),{fn:()=>go('format')});
  const fileRow=row('Elegir archivo…','Ninguno seleccionado',{fn:async()=>{
    const fs=await pickFiles('.txt,.csv,.gsi,.log,.dat,text/*',true); if(!fs.length) return;
    pending=fs; msg.textContent='';
    fileRow.querySelector('.v').textContent=fs.map(f=>f.name+' ('+f.text.split(/\r?\n/).filter(x=>x.trim()).length+' líneas)').join(', ');
    toast('Archivo listo. Pulsa «Importar» para cargar los puntos'); }});
  const body=h('div',null,fl,inputRow('Empezar desde la fila',{type:'number',value:S.fmt.startRow,inputmode:'numeric',onChange:v=>{ S.fmt.startRow=Math.max(1,Math.floor(+v||1)); saveS(); }}),
    h('div',{class:'note'},'Si el archivo tiene encabezado, indica la fila donde empiezan los datos (por ejemplo 2). Los puntos con el mismo nombre se actualizan en lugar de duplicarse.'),
    band('Archivo'),fileRow,band('O pega los datos'),ta,msg);
  return {title:'Importar puntos',body,help:'Elige un archivo exportado de la estación (TXT, CSV, DAT o GSI) o pega las líneas, y pulsa «Importar». Nada se carga hasta que pulses el botón. Elige el formato en «Formato de datos».',
    actions:[{l:'Cancelar',cls:'sec',fn:()=>back()},{l:'Importar',fn:()=>{
      if(!pending.length&&!text.trim()){ toast('Elige un archivo o pega datos primero'); return; }
      let a=0,u=0; const errs=[], srcs=pending.map(f=>({name:f.name,text:f.text})); if(text.trim()) srcs.push({name:'datos pegados',text});
      for(const f of srcs){ const r=parseText(f.text,parseOpts(),proj.next); proj.next=r.next; const x=addPts(r.pts,'survey'); a+=x.added; u+=x.upd; r.errors.forEach(e=>errs.push(f.name+': '+e)); logLine('Importación '+f.name+': '+r.pts.length+' puntos'); }
      msg.textContent=errs.slice(0,6).join('\n'); toast(a+' agregados · '+u+' actualizados');
      if(a+u>0&&!errs.length){ back(); } else if(a+u>0){ pending=[]; fileRow.querySelector('.v').textContent='Ninguno seleccionado'; } }}]};
};
screens.format=()=>{
  const f=S.fmt, sv=()=>saveS();
  const polar=h('div'); const orderRow=pickRow('Orden de columnas','Orden de columnas',[{v:'NEZ',l:'Punto, Norte, Este, Altura, Código'},{v:'ENZ',l:'Punto, Este, Norte, Altura, Código'},{v:'CASS',l:'CASS: Punto, Código, Este, Norte, Altura'}],()=>f.order,v=>{ f.order=v; sv(); });
  const num=(l,k,u)=>inputRow(l,{type:'number',value:f[k],unit:u,inputmode:'decimal',onChange:v=>{ f[k]=+v||0; sv(); }});
  polar.append(band('Datos de la estación (modo polar)'),
    pickRow('Unidad de ángulos','Unidad de ángulos',[{v:'dms',l:'GGG.MMSS'},{v:'deg',l:'Grados decimales'},{v:'gon',l:'Gradianes'}],()=>f.angUnit,v=>{ f.angUnit=v; sv(); }),
    num('Norte estación','stN','m'),num('Este estación','stE','m'),num('Cota estación','stZ','m'),num('Altura instrumento','hi','m'),num('Altura prisma','hr','m'),num('Acimut de Hz = 0','orient'),
    h('div',{class:'note'},'La V se toma como ángulo cenital (0° mirando arriba).'));
  const sync=()=>{ polar.hidden=f.mode!=='polar'; orderRow.hidden=f.mode==='polar'; };
  const body=h('div',null,band('Formato de datos recibidos e importados'),
    pickRow('Tipo','Tipo de datos',[{v:'coord',l:'Coordenadas (N, E, Z)'},{v:'polar',l:'Polar (Hz, V, distancia)'}],()=>f.mode,v=>{ f.mode=v; sv(); sync(); }),orderRow,
    inputRow('Empezar desde la fila',{type:'number',value:f.startRow,inputmode:'numeric',onChange:v=>{ f.startRow=Math.max(1,Math.floor(+v||1)); sv(); }}),polar,
    h('div',{class:'note'},'También se leen líneas en formato GSI (Leica) con coordenadas, palabras 81, 82 y 83. Las líneas sin nombre reciben uno automático con el prefijo de «Ajustes».'));
  sync();
  return {title:'Formato de datos',body,help:'Indica cómo está escrita cada línea que envía la estación o que importas.'};
};

/* ---------- Exportar ---------- */
const EXPORTS=()=>[
  {v:'csv',l:'CSV (*.csv)',d:'Punto, Norte, Este, Altura, Código con encabezado'},
  {v:'neh',l:'NEH (*.txt)',d:'Punto, Norte, Este, Altura, Código separados por coma'},
  {v:'cass',l:'CASS (*.dat)',d:'Punto, Código, Este, Norte, Altura'},
  {v:'dxf',l:'AutoCAD (*.dxf)',d:'Puntos, números, cotas, códigos y curvas de nivel (si están activadas)'},
  {v:'kml',l:'Google Earth (*.kml)',d:'Requiere sistema UTM en el proyecto'},
  {v:'html',l:'Informe (*.html)',d:'Tabla de puntos con datos del proyecto'},
  {v:'custom',l:'Personalizado: '+S.custom.name,d:S.custom.pattern}
];
function buildExport(type){
  const pts=proj.points, base='levantamiento'+'_'+stampNow(), d=S.dec;
  const cs=proj.cs;
  switch(type){
    case 'csv': return {name:base+'.csv',mime:'text/csv;charset=utf-8',content:'﻿'+toNEH(pts,',',true,d)};
    case 'neh': return {name:base+'.txt',mime:'text/plain',content:toNEH(pts,',',false,d)};
    case 'cass': return {name:base+'.dat',mime:'text/plain',content:toCass(pts,d)};
    case 'dxf': return {name:base+'.dxf',mime:'application/dxf',content:toDXF(pts,S.contours?computeContours(pts,{step:parseFloat(S.cnStep)||0,smooth:S.cnSmooth,trim:S.cnTrim}):null)};
    case 'kml': if(cs.type!=='utm') throw new Error('Los datos usan coordenadas locales. Cambia a UTM en «Sistema de coordenadas».'); return {name:base+'.kml',mime:'application/vnd.google-earth.kml+xml',content:toKML(pts,cs.zone,cs.south,proj.name)};
    case 'html': return {name:base+'.html',mime:'text/html',content:toHTMLReport(pts,proj,d)};
    case 'custom': return {name:base+'.'+S.custom.ext,mime:'text/plain',content:toCustom(pts,S.custom,cs.zone,cs.south,d)};
  }
}
screens.exportPts=()=>{
  const desc=h('div',{class:'note',style:{background:'var(--row)',margin:0,borderBottom:'1px solid var(--line)'}});
  const upd=()=>{ const e=EXPORTS().find(x=>x.v===S.lastExport)||EXPORTS()[0]; desc.textContent=e.d; };
  const tr=pickRow('Tipo de archivo','Tipo de archivo',EXPORTS().map(e=>({v:e.v,l:e.l})),()=>S.lastExport,v=>{ S.lastExport=v; saveS(); upd(); });
  const body=h('div',null,row('Datos a exportar',proj.points.length+' puntos'),tr,desc,row('Decimales',String(S.dec)));
  upd();
  return {title:'Exportar puntos',body,help:'Genera un archivo con los puntos actuales. En Android se abre el menú Compartir para guardarlo o enviarlo.',
    actions:[{l:'Gestor de formatos',cls:'sec',fn:()=>go('formatMgr')},{l:'Exportar',fn:async()=>{
      if(!proj.points.length){ toast('No hay puntos para exportar'); return; }
      try{ const f=buildExport(S.lastExport); if(await saveFile(f.name,f.mime,f.content)) toast('Archivo generado: '+f.name); }
      catch(e){ dialog({title:'No se pudo exportar',msg:String(e.message||e),buttons:[{l:'Cerrar'}]}); } }}]};
};
screens.formatMgr=()=>{
  const c=S.custom, sv=()=>saveS();
  const pat=inputRow('Descripción',{area:true,value:c.pattern,onInput:v=>{ c.pattern=v; sv(); }}); pat.inp.style.cssText='font-family:var(--mono);min-height:70px;text-align:left';
  const chips=h('div',{class:'chips'},CUSTOM_FIELDS.map(n=>h('button',{onclick:()=>{ const sep=c.sep==='tab'?'\t':c.sep==='space'?' ':c.sep; c.pattern+=(c.pattern&&!/[,;\t ]$/.test(c.pattern)?sep:'')+'['+n+']'; pat.inp.value=c.pattern; sv(); }},'+ '+n)));
  const body=h('div',null,band('Formato personalizado'),
    inputRow('Nombre',{value:c.name,onChange:v=>{ c.name=v.trim()||'Personalizado'; sv(); }}),
    pickRow('Separador','Separador',[{v:',',l:'Coma (,)'},{v:';',l:'Punto y coma (;)'},{v:'tab',l:'Tabulación'},{v:'space',l:'Espacio'}],()=>c.sep,v=>{ c.sep=v; sv(); }),
    pickRow('Extensión','Extensión',[{v:'csv',l:'csv'},{v:'txt',l:'txt'},{v:'dat',l:'dat'}],()=>c.ext,v=>{ c.ext=v; sv(); }),
    swRow('Escribir encabezado',c.head,v=>{ c.head=v; sv(); }),pat,band('Agregar campo'),chips,
    h('div',{class:'note'},'Los campos van entre corchetes, por ejemplo [Nombre],[Este],[Norte]. Latitud y Longitud usan la zona UTM del proyecto.'));
  return {title:'Gestor de formatos',body,actions:[{l:'Restablecer',cls:'sec',fn:()=>{ S.custom=mergeDef(DEF,{}).custom; saveS(); show(); }},{l:'OK',fn:()=>back()}]};
};

/* ---------- Ajustes ---------- */
screens.settings=()=>{
  const sv=()=>saveS();
  const body=h('div',null,
    band('General'),
    pickRow('Interfaz principal','Interfaz principal',[{v:'grid',l:'Cuadrícula'},{v:'list',l:'Lista'}],()=>S.home,v=>{ S.home=v; sv(); }),
    pickRow('Tema','Tema',[{v:'system',l:'Según el sistema'},{v:'light',l:'Claro'},{v:'dark',l:'Oscuro'}],()=>S.theme,v=>{ S.theme=v; sv(); applyTheme(); }),
    band('Guardado de puntos'),
    inputRow('Prefijo del nombre',{value:S.prefix,onChange:v=>{ S.prefix=v; sv(); }}),
    inputRow('Incremento del nombre',{type:'number',value:S.incr,inputmode:'numeric',onChange:v=>{ S.incr=Math.max(1,Math.floor(+v||1)); sv(); }}),
    pickRow('Código por defecto','Código por defecto',[{v:'last',l:'Igual que el último punto'},{v:'fixed',l:'Código fijo'}],()=>S.codeMode,v=>{ S.codeMode=v; sv(); }),
    inputRow('Código fijo',{value:S.defCode,onChange:v=>{ S.defCode=v.trim(); sv(); }}),
    swRow('Permitir nombres repetidos',S.dup,v=>{ S.dup=v; sv(); }),
    swRow('Vibrar al recibir un punto',S.vibe,v=>{ S.vibe=v; sv(); }),
    h('div',{class:'note'},'Con nombres repetidos desactivado, un punto nuevo con un nombre existente reemplaza al anterior. Así puedes volver a importar un archivo actualizado sin duplicar.'),
    band('Sistema'),
    row('Unidad de longitud','Metro (m)'),
    pickRow('Formato de ángulo','Formato de ángulo',[{v:'dms',l:'GG°MM\'SS.ss"'},{v:'dms2',l:'GGG.MMSS'},{v:'deg',l:'Grados decimales'},{v:'gon',l:'Gradianes'}],()=>S.angFmt,v=>{ S.angFmt=v; sv(); }),
    pickRow('Decimales de coordenadas','Decimales',[{v:2,l:'2'},{v:3,l:'3'},{v:4,l:'4'}],()=>S.dec,v=>{ S.dec=v; sv(); }),
    band('Pantalla'),
    pickRow('Orden de coordenadas','Orden de coordenadas',[{v:'NEH',l:'Norte-Este-Altura'},{v:'ENH',l:'Este-Norte-Altura'}],()=>S.coordOrder,v=>{ S.coordOrder=v; sv(); }),
    swRow('Unir puntos con el mismo código',S.link,v=>{ S.link=v; sv(); }));
  return {title:'Ajustes',body,actions:[{l:'Restablecer',cls:'sec',fn:async()=>{ if(await confirmDlg('¿Restablecer todos los ajustes?','Restablecer')){ S=mergeDef(DEF,{}); saveS(); applyTheme(); show(); toast('Ajustes restablecidos'); } }},{l:'OK',fn:()=>back()}]};
};
function applyTheme(){
  const r=document.documentElement;
  if(S.theme==='system') r.removeAttribute('data-theme'); else r.setAttribute('data-theme',S.theme);
  if(curDef&&curDef.themed) curDef.themed();
}
function isDark(){ const t=document.documentElement.getAttribute('data-theme'); return t?t==='dark':(window.matchMedia&&matchMedia('(prefers-color-scheme: dark)').matches); }
screens.about=()=>({title:'Acerca de',body:h('div',null,h('div',{class:'about'},h('img',{class:'wm',src:window.__WM||'',alt:'ORPA'}),h('h2',{style:{margin:'12px 0 2px'}},'Captura N6'),'Versión 2.1',h('small',null,'Recepción de datos de la estación total South N6+ por Bluetooth'),h('small',null,'Aplicación independiente. No está afiliada a SOUTH ni a SurvStar.')),
  row('Puntos guardados',String(proj.points.length)),row('Plataforma',NATIVE?'Android (app)':'Navegador')),
});

/* ---------- Comunicación, registro y recepción en vivo ---------- */
screens.comm=()=>{
  const list=h('div'); const stat=row('Estado','');
  const drawStat=()=>{ stat.querySelector('.v').textContent=rxText().txt; };
  const body=h('div',null,row('Modelo','Estación total'),row('Fabricante','SOUTH'),row('Modo de comunicación',NATIVE?'Bluetooth':'Puerto serial'),stat);
  if(NATIVE){
    body.append(pickRow('Fin de línea','Fin de línea de cada punto',[{v:'\n',l:'Salto de línea (\\n)'},{v:'\r',l:'Retorno (\\r)'}],()=>S.delim,v=>{ S.delim=v; saveS(); }),
      h('div',{class:'band',style:{display:'flex',justifyContent:'space-between',alignItems:'center'}},'Lista de dispositivos Bluetooth',h('button',{class:'btn sm',id:'scanBtn',onclick:async(e)=>{
        const b=e.currentTarget; b.disabled=true; b.textContent='Buscando…';
        try{ await btScan(); if(!link.devices.length) toast('No se encontraron equipos. Empareja la estación en los ajustes de Android.'); }
        catch(err){ dialog({title:'No se pudo buscar',msg:String(err&&err.message||err)+'\nRevisa que el permiso de Bluetooth esté concedido en los ajustes de la app.',buttons:[{l:'Cerrar'}]}); }
        b.disabled=false; b.textContent='Buscar'; draw(); }},'Buscar')),list);
  } else {
    body.append(pickRow('Baudios','Baudios',[1200,2400,4800,9600,19200,38400,115200].map(v=>({v,l:String(v)})),()=>S.baud,v=>{ S.baud=v; saveS(); }),
      pickRow('Paridad','Paridad',[{v:'none',l:'Ninguna'},{v:'even',l:'Par'},{v:'odd',l:'Impar'}],()=>S.parity,v=>{ S.parity=v; saveS(); }),
      pickRow('Bits de datos','Bits de datos',[{v:8,l:'8'},{v:7,l:'7'}],()=>S.databits,v=>{ S.databits=v; saveS(); }),
      h('div',{class:'note'},'Puerto serial: para computador (Chrome o Edge). Empareja la estación por Bluetooth y aparecerá como puerto COM, o usa un cable USB-serial. Al pulsar «Conectar» eliges el puerto.'));
  }
  function draw(){
    if(!NATIVE) return; list.textContent='';
    link.devices.forEach(d=>list.append(h('button',{class:'row'+(link.sel===d.address?' sel':''),onclick:()=>{ link.sel=d.address; store.set('n6.dev',{address:d.address,name:d.name}); draw(); }},ico('bt'),h('span',{class:'l',style:{flex:1,maxWidth:'none'}},d.name||'Sin nombre'),h('span',{class:'v',style:{flex:'none',fontSize:'12px'}},d.address))));
  }
  const actions=[{l:'Depurar',cls:'sec',fn:()=>go('log')},{l:rx.on?'Desconectar':'Conectar',fn:linkToggle}];
  return {title:'Comunicación',body,actions,mounted:()=>{ draw(); drawStat(); },refresh:()=>{ drawStat(); const b=$('#actions').lastChild; if(b) b.textContent=rx.on?'Desconectar':'Conectar'; },
    help:'Conecta con la estación total. En Android: empareja la N6+ en los ajustes de Bluetooth, pulsa «Buscar», elige el equipo y pulsa «Conectar». En la estación activa el envío de datos.'};
};
screens.log=()=>{
  const pre=h('div',{class:'log',role:'log','aria-live':'polite'}), top=h('div',{class:'row'},h('span',{class:'l'},'Estado'),rxWidget());
  const draw=()=>{ pre.textContent=logLines.length?logLines.join('\n'):'Esperando datos…'; pre.scrollTop=pre.scrollHeight; updateStatus(); };
  return {title:'Registro de recepción',body:h('div',null,top,h('div',{class:'rxprog','data-rx':true,'data-state':'off'}),pre),refresh:draw,mounted:draw,
    actions:[{l:'Limpiar',cls:'sec',fn:()=>{ logLines.length=0; draw(); }},{l:'Copiar',fn:async()=>{ try{ await navigator.clipboard.writeText(logLines.join('\n')); toast('Copiado'); }catch(e){ toast('No se pudo copiar'); } }}],
    help:'Muestra cada línea tal como llega de la estación. Sirve para comprobar el formato de los datos.'};
};
screens.live=()=>{
  const big=h('div',{class:'big'}), rN=row('Norte',''), rE=row('Este',''), rH=row('Altura',''), rS=row('Estado',''), rQ=row('Recibidos en esta sesión',''); const tbl=h('div');
  const draw=()=>{
    const p=proj.points[proj.points.length-1];
    big.textContent=''; big.append(h('span',{class:'nm'},p?p.id:'—'),h('span',{class:'cd'},p?(p.code||''):'Esperando puntos'));
    rN.querySelector('.v').textContent=p?fmtN(p.n)+' m':'—'; rE.querySelector('.v').textContent=p?fmtN(p.e)+' m':'—'; rH.querySelector('.v').textContent=p?fmtN(p.z)+' m':'—';
    rS.querySelector('.v').textContent=rxText().txt; rQ.querySelector('.v').textContent=String(rx.sess);
    tbl.textContent=''; const last=proj.points.slice(-8).reverse(); if(last.length) tbl.append(pointRows(last,()=>null,()=>{}));
    updateStatus();
  };
  const body=h('div',null,h('div',{class:'row',style:{minHeight:'40px'}},h('span',{class:'l'},'Recepción'),rxWidget()),h('div',{class:'rxprog','data-rx':true,'data-state':'off'}),big,rN,rE,rH,rS,rQ,band('Últimos puntos'),tbl);
  const acts=()=>[{l:rx.on?'Detener':'Conectar',fn:()=>{ if(!rx.on&&NATIVE&&!link.sel){ go('comm'); } else linkToggle(); }},{l:'Deshacer último',cls:'sec',fn:()=>{ if(!proj.points.length) return; const p=proj.points.pop(); touch(); toast('Se quitó '+p.id); }},{l:'Dibujo',cls:'sec',fn:()=>go('plan')}];
  return {title:'Recepción en vivo',body,actions:acts(),refresh:()=>{ draw(); const b=$('#actions').firstChild; if(b) b.textContent=rx.on?'Detener':'Conectar'; },mounted:draw,
    help:'Muestra el último punto recibido. Los puntos se guardan solos en el dispositivo.'};
};
