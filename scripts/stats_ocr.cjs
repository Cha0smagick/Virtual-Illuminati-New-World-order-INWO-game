/* stats_ocr.cjs — lee Power/Resistance de las esquinas inferiores de cada carta GRUPO
   Salida: game/js/cardstats_fix.js (window.INWO_STATS_FIX) + research/stats_ocr.json */
const fs = require('fs');
const path = require('path');
const { createRequire: cr } = require('module');
global.window = {};
require(path.join(__dirname, '../game/js/images.js'));
require(path.join(__dirname, '../game/js/cards.js'));
const C = global.window.INWO_CARDS;
const Tesseract = require('tesseract.js');
const OUT = path.join(__dirname, '../research/stats_ocr.json');
let db = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : {};
function norm(n) { return String(n || '').toLowerCase().replace(/[^a-z0-9]/g, ''); }
const groups = C.cards.filter(c => c.type === 'group' || c.type === 'resource');
(async () => {
  const w = await Tesseract.createWorker('eng');
  let i = 0;
  for (const c of groups) {
    const key = norm(c.name);
    if (db[key] && typeof db[key].power === 'number') { i++; continue; }
    const abs = path.join(__dirname, '..', c.img);
    try {
      const buf = fs.readFileSync(abs);
      const W = buf.readUInt32BE(16), H = buf.readUInt32BE(20); // PNG IHDR
      async function corner(x0, x1) {
        const { data } = await w.recognize(buf, {}, {
          rectangle: { left: Math.round(W * x0), top: Math.round(H * 0.60), width: Math.round(W * (x1 - x0)), height: Math.round(H * 0.40) }
        });
        const m = (data.text || '').match(/\d+/g);
        return m ? m.map(Number).filter(n => n >= 0 && n <= 25) : [];
      }
      const res = await corner(0.02, 0.34);   // esquina inferior izquierda = Resistance
      const pow = await corner(0.64, 0.98);   // esquina inferior derecha = Power
      db[key] = { power: pow.length ? pow[pow.length - 1] : null, resistance: res.length ? res[res.length - 1] : null };
    } catch (e) { console.error('ERR', c.name, e.message); db[key] = { power: null, resistance: null }; }
    i++;
    if (i % 10 === 0) { fs.writeFileSync(OUT, JSON.stringify(db)); console.log(`[${i}/${groups.length}]`); }
  }
  await w.terminate();
  fs.writeFileSync(OUT, JSON.stringify(db));
  /* generar fix solo donde AMBOS valores son confiables */
  const fix = {};
  for (const k in db) if (typeof db[k].power === 'number' && typeof db[k].resistance === 'number') fix[k] = db[k];
  fs.writeFileSync(path.join(__dirname, '../game/js/cardstats_fix.js'),
    '/* AUTO-GENERADO por stats_ocr.cjs — P/R leídos de las imágenes */\nwindow.INWO_STATS_FIX=' + JSON.stringify(fix) + ';');
  console.log('STATS OCR COMPLETO · fixes confiables:', Object.keys(fix).length);
})();
