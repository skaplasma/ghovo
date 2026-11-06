// Envuelve los textos de interfaz en tr() para que pasen por el traductor.
// Solo actúa sobre el contenido de las etiquetas <Text ...>TEXTO</Text> y sobre cuatro
// atributos visibles. Nada de código: el patrón se aplica únicamente al trozo de línea que
// va después de un <Text, así no toca flechas ni genéricos de TypeScript.
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const files = process.argv.slice(2);
const ATTRIBUTES = /(\baccessibilityLabel|\bplaceholder|\blabel|\btitle)="([^"{}<>]+)"/g;
const TEXT_NODE = />([ \t]*)([A-Za-zÁÉÍÓÚÜÑáéíóúüñ¿¡«][^<>{}();=[\]|&]*?)([ \t]*)</g;
const HAS_LETTER = /[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/;

const quote = (text) => (text.includes('"') ? `'${text.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'` : `"${text.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`);

function wrapTextNodes(line) {
  const marker = line.indexOf('<Text');
  if (marker < 0) return line;
  const head = line.slice(0, marker);
  const body = line.slice(marker);
  return head + body.replace(TEXT_NODE, (match, before, text, after) => {
    const trimmed = text.trim();
    if (!trimmed || !HAS_LETTER.test(trimmed)) return match;
    if (/["'`:?$\\]/.test(trimmed)) return match;
    return `>${before}{tr(${quote(trimmed)})}${after}<`;
  });
}

let touched = 0;
for (const file of files) {
  const full = path.join(root, file);
  let source = fs.readFileSync(full, 'utf8');
  const original = source;
  const relative = file.startsWith('src/') ? './i18n-core' : './src/i18n-core';

  if (!source.includes(`from '${relative}'`)) {
    const lines = source.split('\n');
    let index = 0;
    while (index < lines.length && !lines[index].startsWith('import ')) index += 1;
    lines.splice(index, 0, `import { t as tr } from '${relative}';`);
    source = lines.join('\n');
  }

  source = source.replace(ATTRIBUTES, (match, attribute, value) => `${attribute}={tr(${quote(value)})}`);
  source = source.split('\n').map(wrapTextNodes).join('\n');

  if (source !== original) {
    fs.writeFileSync(full, source);
    touched += 1;
  }
}
console.log(`archivos modificados: ${touched}`);
