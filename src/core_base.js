/* ===== CORE:BEGIN ===== */
function isNum(s){ return s!==undefined && s!=='' && /^[+-]?(\d+\.?\d*|\.\d+)$/.test(s); }

function toRad(v, unit){
  if(unit==='deg') return v*Math.PI/180;
  if(unit==='gon') return v*Math.PI/200;
  // GGG.MMSS
  const sign = v<0?-1:1, a=Math.abs(v);
  const d=Math.floor(a);
  const rest=Math.round((a-d)*1e6)/1e6;
  const mm=Math.floor(rest*100+1e-9);
  const ss=(rest*100-mm)*100;
  return sign*(d+mm/60+ss/3600)*Math.PI/180;
}

function parseGSI(line){
  const re=/(\d\d)(\S{4})([+-])(\w{8,16})/g;
  const w={}; let m;
  const body=line.replace(/^\*/,'');
  while((m=re.exec(body))){
    const wi=m[1], unit=m[2].slice(-1);
    let v=parseInt(m[4],10);
    if(isNaN(v)) { w[wi]=m[4]; continue; }
    if(m[3]==='-') v=-v;
    w[wi]={v,unit};
  }
  const scale=u=> u==='6'?1e-4: u==='8'?1e-5 : 1e-3;
  const get=k=> w[k]&&typeof w[k]==='object' ? w[k].v*scale(w[k].unit) : undefined;
  if(get('81')===undefined||get('82')===undefined) return null;
  const idw=w['11'];
  const id=idw&&typeof idw==='object'? String(idw.v) : (typeof idw==='string'? idw.replace(/^0+/,''):'');
  const codeW=w['71'];
  const code=codeW&&typeof codeW==='object'? String(codeW.v):'';
  return {id:id||'', n:get('82'), e:get('81'), z:get('83')!==undefined?get('83'):0, code};
}

function parseText(text, opts, startIndex){
  const pts=[], errors=[];
  let auto=startIndex||1;
  const lines=text.split(/\r?\n/);
  const first=Math.max(1,Math.floor(opts.startRow||1));
  lines.forEach((raw,i)=>{
    if(i+1<first) return;
    const line=raw.trim();
    if(!line) return;
    if(/^\*?11\S{4}[+-]\w+/.test(line)){
      const p=parseGSI(line);
      if(p){ if(!p.id) p.id=String(auto++); pts.push(p); }
      else errors.push('Línea '+(i+1)+': GSI sin coordenadas.');
      return;
    }
    const delim=/[,;\t]/.test(line);
    const t=(delim?line.split(/\s*[,;\t]\s*/):line.split(/\s+/)).filter(Boolean);
    let k=-1;
    for(let j=1;j<=3;j++){
      if(isNum(t[j])&&isNum(t[j+1])&&isNum(t[j+2])){k=j;break;}
    }
    // "PT 2 1005.25 2003.10 350.40": ID separado por espacio en dos palabras
    if(!delim && k===1 && !isNum(t[0]) && isNum(t[4])) k=2;
    let id, a,b,c, code;
    if(k===-1){
      if(t.length===3 && t.every(isNum)){ id=String(auto++); a=+t[0]; b=+t[1]; c=+t[2]; code=''; }
      else { errors.push('Línea '+(i+1)+' no reconocida: '+line.slice(0,60)); return; }
    } else {
      id=t.slice(0,k).join('_'); a=+t[k]; b=+t[k+1]; c=+t[k+2]; code=t.slice(k+3).join(' ');
    }
    if(opts.mode==='polar'){
      const hz=toRad(a,opts.angUnit), z=toRad(b,opts.angUnit), sd=c;
      const orient=toRad(opts.orient||0,opts.angUnit);
      const hd=sd*Math.sin(z), dz=sd*Math.cos(z);
      const az=hz+orient;
      pts.push({id, n:opts.stN+hd*Math.cos(az), e:opts.stE+hd*Math.sin(az),
                z:opts.stZ+opts.hi+dz-opts.hr, code});
    } else {
      if(opts.order==='ENZ') pts.push({id,n:b,e:a,z:c,code});
      else pts.push({id,n:a,e:b,z:c,code});
    }
  });
  return {pts,errors};
}

function csvEscape(s){ s=String(s); return /[",\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s; }
function toCSV(pts){
  const rows=['Punto,Norte,Este,Cota,Codigo'];
  pts.forEach(p=>rows.push([csvEscape(p.id),p.n.toFixed(3),p.e.toFixed(3),p.z.toFixed(3),csvEscape(p.code||'')].join(',')));
  return '﻿'+rows.join('\r\n')+'\r\n';
}

function toDXF(pts,contours){
  const o=[];
  const g=(c,v)=>{o.push(String(c));o.push(String(v));};
  const layers=['PUNTOS','NUMEROS','COTAS','CODIGOS','CURVAS','CURVAS_MAESTRAS'];
  g(0,'SECTION');g(2,'HEADER');g(9,'$ACADVER');g(1,'AC1009');g(0,'ENDSEC');
  g(0,'SECTION');g(2,'TABLES');
  g(0,'TABLE');g(2,'LAYER');g(70,layers.length);
  layers.forEach((l,i)=>{g(0,'LAYER');g(2,l);g(70,0);g(62,[7,3,2,4,30,1][i]);g(6,'CONTINUOUS');});
  g(0,'ENDTAB');g(0,'ENDSEC');
  g(0,'SECTION');g(2,'ENTITIES');
  const txt=(layer,x,y,z,h,s)=>{ if(!s) return; g(0,'TEXT');g(8,layer);g(10,x.toFixed(3));g(20,y.toFixed(3));g(30,z.toFixed(3));g(40,h);g(1,String(s).replace(/[\r\n]/g,' '));};
  pts.forEach(p=>{
    // DXF: X = Este, Y = Norte
    g(0,'POINT');g(8,'PUNTOS');g(10,p.e.toFixed(3));g(20,p.n.toFixed(3));g(30,p.z.toFixed(3));
    txt('NUMEROS',p.e+0.3,p.n+0.3,p.z,0.4,p.id);
    txt('COTAS',p.e+0.3,p.n-0.5,p.z,0.3,p.z.toFixed(3));
    txt('CODIGOS',p.e+0.3,p.n-1.1,p.z,0.3,p.code);
  });
  if(contours&&contours.lines){
    contours.lines.forEach(l=>{
      const layer=l.index?'CURVAS_MAESTRAS':'CURVAS';
      g(0,'POLYLINE');g(8,layer);g(66,1);g(10,0);g(20,0);g(30,l.z.toFixed(3));g(70,l.closed?1:0);
      l.pts.forEach(q=>{g(0,'VERTEX');g(8,layer);g(10,q[0].toFixed(3));g(20,q[1].toFixed(3));g(30,l.z.toFixed(3));});
      g(0,'SEQEND');g(8,layer);
      if(l.index&&l.pts.length>=4){ const m=l.pts[Math.floor(l.pts.length/2)]; txt(layer,m[0],m[1],l.z,0.4,l.z.toFixed(contours.step>=1?0:2)); }
    });
  }
  g(0,'ENDSEC');g(0,'EOF');
  return o.join('\r\n')+'\r\n';
}
// UTM WGS84 (este, norte) a [latitud, longitud] en grados
function utmToLatLon(E,N,zone,south){
  const a=6378137, f=1/298.257223563, k0=0.9996;
  const e2=f*(2-f), ep2=e2/(1-e2);
  const x=E-500000, y=south?N-10000000:N;
  const M=y/k0;
  const mu=M/(a*(1-e2/4-3*e2*e2/64-5*e2*e2*e2/256));
  const e1=(1-Math.sqrt(1-e2))/(1+Math.sqrt(1-e2));
  const phi1=mu+(3*e1/2-27*Math.pow(e1,3)/32)*Math.sin(2*mu)
    +(21*e1*e1/16-55*Math.pow(e1,4)/32)*Math.sin(4*mu)
    +(151*Math.pow(e1,3)/96)*Math.sin(6*mu)
    +(1097*Math.pow(e1,4)/512)*Math.sin(8*mu);
  const s1=Math.sin(phi1), c1=Math.cos(phi1), t1=Math.tan(phi1);
  const N1=a/Math.sqrt(1-e2*s1*s1);
  const T1=t1*t1, C1=ep2*c1*c1;
  const R1=a*(1-e2)/Math.pow(1-e2*s1*s1,1.5);
  const D=x/(N1*k0);
  const lat=phi1-(N1*t1/R1)*(D*D/2-(5+3*T1+10*C1-4*C1*C1-9*ep2)*Math.pow(D,4)/24
    +(61+90*T1+298*C1+45*T1*T1-252*ep2-3*C1*C1)*Math.pow(D,6)/720);
  const lon0=((zone-1)*6-180+3)*Math.PI/180;
  const lon=lon0+(D-(1+2*T1+C1)*Math.pow(D,3)/6
    +(5-2*C1+28*T1-3*C1*C1+8*ep2+24*T1*T1)*Math.pow(D,5)/120)/c1;
  return [lat*180/Math.PI, lon*180/Math.PI];
}
// Triangulación de Delaunay (Bowyer-Watson). pts: [{x,y}] -> [[i,j,k], ...]
function delaunay(pts){
  const n=pts.length; if(n<3) return [];
  let minx=Infinity,miny=Infinity,maxx=-Infinity,maxy=-Infinity;
  pts.forEach(p=>{minx=Math.min(minx,p.x);maxx=Math.max(maxx,p.x);miny=Math.min(miny,p.y);maxy=Math.max(maxy,p.y);});
  const dm=Math.max(maxx-minx,maxy-miny)||1, mx=(minx+maxx)/2, my=(miny+maxy)/2;
  // pequeño desplazamiento determinista para evitar puntos cocirculares exactos (mallas regulares)
  const P=pts.map((p,i)=>[p.x+Math.sin(i*12.9898)*1e-7*dm, p.y+Math.cos(i*78.233)*1e-7*dm]);
  P.push([mx-20*dm,my-dm],[mx,my+20*dm],[mx+20*dm,my-dm]);
  function mkTri(a,b,c){
    const ax=P[a][0],ay=P[a][1],bx=P[b][0],by=P[b][1],cx=P[c][0],cy=P[c][1];
    const d=2*(ax*(by-cy)+bx*(cy-ay)+cx*(ay-by));
    if(Math.abs(d)<1e-30) return {a,b,c,x:0,y:0,r2:Infinity};
    const a2=ax*ax+ay*ay,b2=bx*bx+by*by,c2=cx*cx+cy*cy;
    const ux=(a2*(by-cy)+b2*(cy-ay)+c2*(ay-by))/d, uy=(a2*(cx-bx)+b2*(ax-cx)+c2*(bx-ax))/d;
    return {a,b,c,x:ux,y:uy,r2:(ax-ux)*(ax-ux)+(ay-uy)*(ay-uy)};
  }
  let tris=[mkTri(n,n+1,n+2)];
  for(let i=0;i<n;i++){
    const px=P[i][0],py=P[i][1];
    const bad=[], keep=[];
    for(const t of tris){
      const dx=px-t.x,dy=py-t.y;
      (dx*dx+dy*dy<t.r2?bad:keep).push(t);
    }
    const edges=new Map();
    const addE=(u,v)=>{ const k=u<v?u+'_'+v:v+'_'+u; const e=edges.get(k); if(e) e.c++; else edges.set(k,{u,v,c:1}); };
    for(const t of bad){ addE(t.a,t.b); addE(t.b,t.c); addE(t.c,t.a); }
    tris=keep;
    edges.forEach(e=>{ if(e.c===1) tris.push(mkTri(e.u,e.v,i)); });
  }
  return tris.filter(t=>t.a<n&&t.b<n&&t.c<n).map(t=>[t.a,t.b,t.c]);
}

function niceNum(v){ const p=Math.pow(10,Math.floor(Math.log10(v))); const m=v/p; return (m>=5?5:m>=2?2:1)*p; }

function chaikin(line,closed,iters){
  let pts=line;
  for(let it=0;it<iters;it++){
    const out=[]; const n=pts.length;
    if(!closed) out.push(pts[0]);
    const last=closed?n:n-1;
    for(let i=0;i<last;i++){
      const a=pts[i], b=pts[(i+1)%n];
      out.push([0.75*a[0]+0.25*b[0],0.75*a[1]+0.25*b[1]]);
      out.push([0.25*a[0]+0.75*b[0],0.25*a[1]+0.75*b[1]]);
    }
    if(!closed) out.push(pts[n-1]);
    pts=out;
  }
  return pts;
}

// Curvas de nivel por triangulación (TIN). Devuelve {step,lines:[{z,index,closed,pts:[[e,n],..]}],info}
function computeContours(points, opt){
  opt=opt||{};
  const res={step:0,levels:0,lines:[],info:''};
  // quitar puntos duplicados en planta (a 1 mm)
  const seen=new Map(), P=[];
  points.forEach(p=>{
    if(!isFinite(p.e)||!isFinite(p.n)||!isFinite(p.z)) return;
    const k=Math.round(p.e*1000)+'_'+Math.round(p.n*1000);
    if(!seen.has(k)){ seen.set(k,P.length); P.push({x:p.e,y:p.n,z:p.z}); }
  });
  if(P.length<3){ res.info='Se necesitan al menos 3 puntos con cota.'; return res; }
  if(P.length>4000){ res.info='Hay más de 4000 puntos: las curvas de nivel se desactivan para no bloquear la app.'; return res; }
  let zmin=Infinity,zmax=-Infinity; P.forEach(p=>{zmin=Math.min(zmin,p.z);zmax=Math.max(zmax,p.z);});
  if(zmax-zmin<1e-6){ res.info='Todos los puntos tienen la misma cota.'; return res; }
  let step=+opt.step>0?+opt.step:niceNum((zmax-zmin)/10);
  while((zmax-zmin)/step>250) step*=2;
  res.step=step;
  let tris=delaunay(P);
  // quitar triángulos casi sin área
  tris=tris.filter(t=>{
    const a=P[t[0]],b=P[t[1]],c=P[t[2]];
    return Math.abs((b.x-a.x)*(c.y-a.y)-(c.x-a.x)*(b.y-a.y))>1e-9;
  });
  if(!tris.length){ res.info='Los puntos están alineados: no se puede formar una superficie.'; return res; }
  if(opt.trim!==false){
    const longest=tris.map(t=>{
      const d=(i,j)=>Math.hypot(P[i].x-P[j].x,P[i].y-P[j].y);
      return Math.max(d(t[0],t[1]),d(t[1],t[2]),d(t[2],t[0]));
    });
    const sorted=longest.slice().sort((a,b)=>a-b);
    const med=sorted[Math.floor(sorted.length/2)];
    const lim=(+opt.maxEdge>0)?+opt.maxEdge:3*med;
    tris=tris.filter((t,i)=>longest[i]<=lim);
    if(!tris.length){ res.info='Todos los triángulos quedaron fuera del límite de lado.'; return res; }
  }
  const lv0=Math.ceil(zmin/step-1e-9), lv1=Math.floor(zmax/step+1e-9);
  const smooth=opt.smooth!==false;
  for(let li=lv0;li<=lv1;li++){
    const lv=li*step;
    // puntos de cruce identificados por la arista (exactos y compartidos entre triángulos vecinos)
    const crossing=new Map();
    const cp=(i,j)=>{
      const lo=i<j?i:j, hi=i<j?j:i, k=lo+'_'+hi;
      let c=crossing.get(k);
      if(!c){
        const a=P[lo], b=P[hi], t=(lv-a.z)/(b.z-a.z);
        c=[a.x+t*(b.x-a.x), a.y+t*(b.y-a.y)];
        crossing.set(k,c);
      }
      return k;
    };
    const adj=new Map();
    const link=(ka,kb)=>{
      if(ka===kb) return;
      if(!adj.has(ka)) adj.set(ka,[]); if(!adj.has(kb)) adj.set(kb,[]);
      adj.get(ka).push(kb); adj.get(kb).push(ka);
    };
    for(const t of tris){
      const z=[P[t[0]].z,P[t[1]].z,P[t[2]].z];
      const up=[z[0]>=lv,z[1]>=lv,z[2]>=lv];
      const s=up[0]+up[1]+up[2];
      if(s===0||s===3) continue;
      const keys=[];
      for(let e=0;e<3;e++){
        const i=t[e], j=t[(e+1)%3];
        if(up[e]!==up[(e+1)%3]) keys.push(cp(i,j));
      }
      if(keys.length===2) link(keys[0],keys[1]);
    }
    // unir segmentos en polilíneas
    const used=new Set();
    const walk=(start)=>{
      const path=[start]; used.add(start);
      let cur=start, prev=null;
      for(;;){
        const nb=adj.get(cur).filter(k=>k!==prev);
        let nx=null;
        for(const k of nb){ if(!used.has(k)){ nx=k; break; } }
        if(nx===null){
          // ¿cierra con el inicio?
          const closes=nb.includes(start)&&path.length>2;
          return {path,closed:closes};
        }
        used.add(nx); path.push(nx); prev=cur; cur=nx;
      }
    };
    const out=[];
    adj.forEach((nbs,k)=>{ if(nbs.length===1&&!used.has(k)) out.push(walk(k)); });
    adj.forEach((nbs,k)=>{ if(!used.has(k)) out.push(walk(k)); });
    const isIndex=(li%5===0);
    out.forEach(o=>{
      if(o.path.length<2) return;
      let pts=o.path.map(k=>crossing.get(k));
      if(smooth&&pts.length>=3) pts=chaikin(pts,o.closed,2);
      res.lines.push({z:lv,index:isIndex,closed:o.closed,pts});
    });
  }
  res.levels=lv1-lv0+1;
  res.info=res.lines.length?'':'No hay curvas con esta equidistancia.';
  return res;
}

/* ===== CORE:END ===== */