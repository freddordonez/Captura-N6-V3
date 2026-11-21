const C=require('./core.js'); let ok=0,bad=0;
const t=(n,c)=>{ if(c){ok++}else{bad++;console.log('FALLA:',n)} };
const near=(a,b,e)=>Math.abs(a-b)<(e||1e-6);
// inversa 3-4-5
let r=C.inverse({n:0,e:0,z:0},{n:4,e:3,z:1.2}); t('hd',near(r.hd,5)); t('az',near(r.az,36.8698976,1e-5)); t('dz',near(r.dz,1.2)); t('sd',near(r.sd,Math.hypot(5,1.2)));
t('az cuadrante',near(C.inverse({n:0,e:0},{n:-1,e:-1}).az,225,1e-9));
// radiación ida y vuelta
let b=C.radiate({n:100,e:200,z:10},123.456,50,2); r=C.inverse({n:100,e:200,z:10},b); t('rad hd',near(r.hd,50)); t('rad az',near(r.az,123.456,1e-9)); t('rad z',near(b.z,12));
// área/perímetro: rectángulo 10x20, triángulo
let m=C.polygonMetrics([{n:0,e:0},{n:0,e:10},{n:20,e:10},{n:20,e:0}]); t('area',near(m.area,200)); t('per',near(m.perimeter,60));
m=C.polygonMetrics([{n:0,e:0},{n:0,e:4},{n:3,e:0}]); t('tri',near(m.area,6)&&near(m.perimeter,12));
// ángulos
t('dms',C.fmtAngle(36.8698976,'dms',2)==="36°52'11.63\""); t('dms2',C.fmtAngle(36.8698976,'dms2')==='36.5211'); t('gon',C.fmtAngle(90,'gon').startsWith('100.0000'));
t('dmsToDeg',near(C.dmsToDeg(36.5211),36.869722,1e-5)); t('59.60',C.fmtAngle(59.99999999,'dms',2)==="60°00'00.00\"");
// UTM ida y vuelta
let u=C.latLonToUTM(-3.99,-79.20,17); t('utm e',near(u.e,699845.5,1)&&near(u.n,9558759.5,1)&&u.south); let ll=C.utmToLatLon(u.e,u.n,17,true); t('rt',near(ll[0],-3.99,1e-7)&&near(ll[1],-79.2,1e-7));
u=C.latLonToUTM(40.4168,-3.7038); t('zona auto',u.zone===30&&!u.south);
// división de línea
let d=C.divideLine({n:0,e:0,z:0},{n:10,e:20,z:5},4); t('div',d.length===3&&near(d[1].n,5)&&near(d[1].e,10)&&near(d[2].z,3.75));
// parseo: cass, prefijo, siguiente
let p=C.parseText("1,BLDG,2000.5,1000.25,50.1\n2,,2001,1001,51\nPt3,POSTE ALTO,2002,1002,52",{mode:'coord',order:'CASS'},1);
t('cass',p.pts.length===3&&p.pts[0].e===2000.5&&p.pts[0].n===1000.25&&p.pts[0].code==='BLDG'&&p.pts[1].code===''&&p.pts[2].code==='POSTE ALTO'&&p.pts[2].id==='Pt3');
p=C.parseText("1000,2000,50\n1001,2001,51",{mode:'coord',order:'NEZ',prefix:'Pt'},7); t('prefijo',p.pts[0].id==='Pt7'&&p.pts[1].id==='Pt8'&&p.next===9);
p=C.parseText("A1,100,200,5,X",{mode:'coord',order:'NEZ'},1); t('neh',p.pts[0].n===100&&p.pts[0].e===200);
// exportación
const P=[{id:'1',n:100.5,e:200.25,z:10,code:'A,B'},{id:'2',n:101,e:201,z:11,code:''}];
t('neh csv',C.toNEH(P,',',true,3)==="Punto,Norte,Este,Altura,Codigo\r\n1,100.500,200.250,10.000,A,B\r\n2,101.000,201.000,11.000,\r\n");
t('cass out',C.toCass(P,3).startsWith('1,A,B,200.250,100.500,10.000'));
let k=C.toKML([{id:'a&b',n:9558759.5,e:699845.5,z:5,code:'<x>'}],17,true,'Prueba'); const kc=k.match(/<coordinates>([-\d.]+),([-\d.]+),5\.000/); t('kml',k.includes('a&amp;b')&&k.includes('&lt;x&gt;')&&kc&&near(+kc[1],-79.2,1e-6)&&near(+kc[2],-3.99,1e-6));
let cu=C.toCustom(P,{pattern:'[Nombre];[Este];[Norte];[Altura];[Código]',sep:';',head:true},17,true,2); t('custom',cu==="Nombre;Este;Norte;Altura;Código\r\n1;200.25;100.50;10.00;A,B\r\n2;201.00;101.00;11.00;\r\n");
const cl=C.toCustom([{id:'1',n:9558759.5,e:699845.5,z:1,code:''}],{pattern:'[Latitud],[Longitud]',sep:',',head:false},17,true,3).trim().split(','); t('custom ll',near(+cl[0],-3.99,1e-6)&&near(+cl[1],-79.2,1e-6));
t('html esc',!C.toHTMLReport(P,{name:'<b>'},3).includes('<b>'));
// DXF con curvas
const pts=[];for(let i=0;i<8;i++)for(let j=0;j<8;j++)pts.push({id:''+pts.length,e:i*5,n:j*5,z:100+10*Math.exp(-((i-3.5)**2+(j-3.5)**2)/6),code:''});
const cr=C.computeContours(pts,{}); const dx=C.toDXF(pts.slice(0,3),cr); t('dxf curvas',dx.includes('POLYLINE')&&dx.includes('CURVAS')&&dx.split('SEQEND').length-1===cr.lines.length);
console.log(ok+' correctas, '+bad+' fallas'); process.exit(bad?1:0);
