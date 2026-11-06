// Extrae los textos envueltos en tr() para traducirlos y detecta los que faltan.
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const files = ['App.tsx', ...fs.readdirSync(path.join(root, 'src')).filter(name => name.endsWith('.tsx')).map(name => `src/${name}`)];
const call = /tr\((["'])((?:\\.|(?!\1).)*)\1\)/g;
const found = new Map();

for (const file of files) {
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  for (const match of source.matchAll(call)) {
    const text = match[2].replace(/\\'/g, "'").replace(/\\"/g, '"');
    if (!/[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/.test(text)) continue;
    if (!text.includes(' ') && !/[ÁÉÍÓÚÑáéíóúñ¿¡]/.test(text)) continue; // palabras sueltas tipo GHOVO
    if (!found.has(text)) found.set(text, []);
    const list = found.get(text);
    if (!list.includes(file)) list.push(file);
  }
}

const sorted = [...found.keys()].sort((a, b) => a.localeCompare(b, 'es'));
fs.writeFileSync(path.join(root, 'tools/i18n-strings.json'), JSON.stringify(sorted, null, 2));
console.log(`textos distintos: ${sorted.length}`);
for (const text of sorted) console.log(`- ${text}`);
