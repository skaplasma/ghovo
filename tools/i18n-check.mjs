// Comprueba que todos los textos envueltos tengan traducción en los tres idiomas.
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const files = ['App.tsx', ...fs.readdirSync(path.join(root, 'src')).filter(name => name.endsWith('.tsx')).map(name => `src/${name}`)];
const call = /tr\((["'])((?:\\.|(?!\1).)*)\1\)/g;
const used = new Set();

for (const file of files) {
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  for (const match of source.matchAll(call)) {
    const text = match[2].replace(/\\'/g, "'").replace(/\\"/g, '"');
    if (!/[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/.test(text)) continue;
    if (!text.includes(' ') && !/[ÁÉÍÓÚÑáéíóúñ¿¡]/.test(text)) continue;
    used.add(text);
  }
}

const load = (file) => {
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  const map = new Map();
  for (const match of source.matchAll(/^  '((?:\\.|[^'])*)':/gm)) map.set(match[1].replace(/\\'/g, "'"), true);
  for (const match of source.matchAll(/^  "((?:\\.|[^"])*)":/gm)) map.set(match[1], true);
  return map;
};

const dictionaries = {eu: load('src/phrases-eu.ts'), ca: load('src/phrases-ca.ts'), fr: load('src/phrases-fr.ts')};
let missing = 0;
for (const language of Object.keys(dictionaries)) {
  const gaps = [...used].filter(text => !dictionaries[language].has(text));
  if (gaps.length) {
    missing += gaps.length;
    console.log(`\n${language}: faltan ${gaps.length}`);
    for (const text of gaps.slice(0, 40)) console.log(`  - ${text}`);
  }
}
console.log(`\ntextos en uso: ${used.size}, huecos totales: ${missing}`);
