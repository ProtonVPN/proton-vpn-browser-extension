/**
 * Pequeno helper para recompactar o zip gerado em nome consistente.
 * Uso: `node scripts/repack.js vpn-proton-chrome.zip`
 */
const fs = require('fs');
const path = require('path');
const src = process.argv[2];
if (!src) {
  console.error('Usage: node scripts/repack.js <zipname>');
  process.exit(1);
}
if (!fs.existsSync(src)) {
  console.error(`File not found: ${src}`);
  process.exit(1);
}
const target = src.replace(/\.zip$/i, '').replace(/[^a-z0-9\-]+/ig, '-') + '.zip';
if (target !== src) {
  fs.copyFileSync(src, target);
  console.log(`Repacked: ${src} -> ${target}`);
} else {
  console.log(`No rename needed: ${src}`);
}
