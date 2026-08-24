/* ocr_cards.mjs — OCR de las 421 cartas INWO con tesseract.js
   Salida: research/card_ocr.json  { "<normname>": "texto exacto", ... }
   + game/js/cardtexts_data.js (window.INWO_OCR) listo para el juego.
   Reanudable: guarda progreso cada carta en research/card_ocr.json. */
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const require = createRequire(import.meta.url);
const Tesseract = require('tesseract.js');
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

global.window = {};
await import(path.join(ROOT, 'game/js/images.js')).catch(() => {});
require(path.join(ROOT, 'game/js/cards.js'));
const C = global.window.INWO_CARDS;
if (!C) { console.error('cards.js no cargó'); process.exit(1); }

const OUT_JSON = path.join(ROOT, 'research/card_ocr.json');
const OUT_JS = path.join(ROOT, 'game/js/cardtexts_data.js');
let db = fs.existsSync(OUT_JSON) ? JSON.parse(fs.readFileSync(OUT_JSON, 'utf8')) : {};

function norm(n) { return String(n || '').toLowerCase().replace(/[^a-z0-9]/g, ''); }
const jobs = C.cards.map(c => ({ name: c.name, img: '../' === '' ? c.img : c.img, key: norm(c.name), rel: c.img }))
  .filter(j => !(db[j.key] && db[j.key].length > 10));

console.log('Pendientes:', jobs.length, '/', C.cards.length);
const worker = await Tesseract.createWorker('eng');
let done = 0;
for (const j of jobs) {
  const abs = path.join(ROOT, j.rel);
  try {
    const { data } = await worker.recognize(abs);
    let t = (data.text || '').replace(/\s+\n/g, '\n').replace(/[ \t]{2,}/g, ' ').trim();
    /* quitar la primera línea si repite el nombre de la carta */
    const lines = t.split('\n');
    if (lines.length && norm(lines[0]).includes(norm(j.name).slice(0, 8))) lines.shift();
    t = lines.join('\n').trim();
    if (t.length > 10) db[j.key] = t;
  } catch (e) { console.error('ERR', j.name, e.message); }
  done++;
  if (done % 5 === 0 || done === jobs.length) {
    fs.mkdirSync(path.dirname(OUT_JSON), { recursive: true });
    fs.writeFileSync(OUT_JSON, JSON.stringify(db, null, 1));
    console.log(`[${done}/${jobs.length}] guardado · total claves=${Object.keys(db).length}`);
  }
}
await worker.terminate();
fs.writeFileSync(OUT_JSON, JSON.stringify(db, null, 1));
fs.writeFileSync(OUT_JS, '/* AUTO-GENERADO por ocr_cards.mjs — texto OCR verbatim de las cartas */\nwindow.INWO_OCR=' + JSON.stringify(db) + ';');
console.log('OCR COMPLETO. Cartas con texto:', Object.keys(db).length);
