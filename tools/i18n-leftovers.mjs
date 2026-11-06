// Busca textos de interfaz que se hayan quedado sin envolver en tr().
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const files = ['App.tsx', ...fs.readdirSync(path.join(root, 'src')).filter(name => name.endsWith('.tsx')).map(name => `src/${name}`)];
const suspicious = /<Text[^>]*>\s*([A-ZÁÉÍÓÚÑ][^<>{}]{2,}?)\s*</g;

for (const file of files) {
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  const lines = source.split('\n');
  lines.forEach((line, index) => {
    if (!line.includes('<Text')) return;
    const match = suspicious.exec(line);
    suspicious.lastIndex = 0;
    if (match) console.log(`${file}:${index + 1}: ${match[1].slice(0, 60)}`);
  });
}
