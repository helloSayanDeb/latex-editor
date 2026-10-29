// Keep the browser module, parsing worker and font data on the same pinned version.
const fs = require('node:fs'), path = require('node:path');
const root = path.resolve(__dirname,'..'), source = path.dirname(require.resolve('pdfjs-dist/package.json'));
const target = path.join(root,'public','vendor');
fs.mkdirSync(target,{recursive:true});
for(const file of ['pdf.min.mjs','pdf.worker.min.mjs']) fs.copyFileSync(path.join(source,'build',file),path.join(target,file));
for(const directory of ['cmaps','standard_fonts']) fs.cpSync(path.join(source,directory),path.join(target,'pdfjs',directory),{recursive:true});
fs.copyFileSync(path.join(source,'LICENSE'),path.join(target,'PDFJS-LICENSE'));
console.log('Synchronized PDF.js '+require('pdfjs-dist/package.json').version+' browser assets.');
