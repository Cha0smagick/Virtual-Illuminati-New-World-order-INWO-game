/* audit_stats.cjs — cruza 3 fuentes: estimados originales (cards.js sin fixes) vs OCR de esquinas
   vs tabla verificada CMU (hardcodeada). Reporte: research/audit_report.txt */
const fs = require('fs'); const path = require('path');
global.window = {};
require(path.join(__dirname, '../game/js/images.js'));
require(path.join(__dirname, '../game/js/cards.js')); // SIN statsfix = valores previos al fix
const C = global.window.INWO_CARDS;
const ocr = JSON.parse(fs.readFileSync(path.join(__dirname, '../research/stats_ocr.json'), 'utf8'));
const CMU = { ama:[3,4],batf:[3,2],brazil:[5,3],cia:[6,5],canada:[3,4],congressionalwives:[4,4],england:[6,2],finland:[6,5],france:[3,5],fraternalorders:[5,5],freddiebirchsociety:[4,4],germany:[4,3],hawaii:[0,2],japan:[6,4],libertarians:[4,4],localpolice:[4,4],mossad:[2,1],nsa:[5,2],nephewsofgod:[1,1],newyork:[7,8],nuclearpowercompanies:[4,null],pentagon:[6,6],russia:[4,4],saddamhussein:[5,4],texas:[14,9],vaticancity:[4,4],witch:[3,3],clonarrangers:[6,2],hackers:[3,2],sca:[1,null],autoduelassociation:[1,null],wargamers:[1,null],mafia:[6,null] };
function norm(n){return String(n||'').toLowerCase().replace(/[^a-z0-9]/g,'');}
let agree=0,ocrFixed=[],cmuMatch=0,cmuMiss=[];
C.cards.filter(c=>c.type==='group').forEach(c=>{
  const k=norm(c.name), o=ocr[k];
  const before={power:c.power,resistance:c.resistance};
  if(o&&typeof o.power==='number'&&typeof o.resistance==='number'){
    if(o.power===before.power&&o.resistance===before.resistance)agree++;
    else ocrFixed.push(`${c.name}: antes ${before.power}/${before.resistance} → imagen ${o.power}/${o.resistance}`);
  }
  const cm=CMU[k];
  if(cm){
    const now=(o&&typeof o.power==='number')?o:before;
    if(now.power===cm[0]&&((now.resistance??null)===(cm[1]??null)))cmuMatch++;
    else cmuMiss.push(`${c.name}: fuente=imagen ${now.power}/${now.resistance} vs CMU ${cm[0]}/${cm[1]}`);
  }
});
const rpt=[`ACUERDO OCR↔estimado (sin cambio): ${agree}`,`CORREGIDOS por imagen: ${ocrFixed.length}`,...ocrFixed.slice(0,40),``,`CMU verificados coinciden: ${cmuMatch}`,`DISCREPANCIAS vs CMU (${cmuMiss.length}):`,...cmuMiss].join('\n');
fs.writeFileSync(path.join(__dirname,'../research/audit_report.txt'),rpt);
console.log(rpt.split('\n').slice(0,8).join('\n'));
