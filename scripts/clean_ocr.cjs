/* clean_ocr.mjs — limpia card_ocr.json: elimina ruido gráfico, deja solo líneas legibles */
const fs = require('fs');
const p = 'D:/Illuminati NWO/research/card_ocr.json';
const db = JSON.parse(fs.readFileSync(p, 'utf8'));
function good(line) {
  const s = line.trim();
  if (s.length < 12) return false;                       // trozos cortos = ruido
  const alpha = (s.match(/[A-Za-z]/g) || []).length / s.length;
  if (alpha < 0.72) return false;                        // demasiados símbolos/números sueltos
  const words = s.split(/\s+/);
  if (words.length < 3) return false;
  const dicty = words.filter(w => /^[A-Za-z][a-z']{1,}$/.test(w)).length;
  if (dicty / words.length < 0.55) return false;         // palabras "reales"
  return true;
}
let out = {}, dropped = 0;
for (const k in db) {
  const lines = db[k].split('\n').map(s => s.replace(/\s+/g, ' ').trim()).filter(good);
  if (lines.length >= 1) out[k] = lines.join('\n'); else dropped++;
}
fs.writeFileSync(p, JSON.stringify(out, null, 1));
fs.writeFileSync('D:/Illuminati NWO/game/js/cardtexts_data.js',
  '/* AUTO-GENERADO por ocr_cards.mjs + clean_ocr.mjs — texto OCR verbatim */\nwindow.INWO_OCR=' + JSON.stringify(out) + ';');
console.log('Limpias:', Object.keys(out).length, '· descartadas sin texto útil:', dropped);
