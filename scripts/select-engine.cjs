 
const fs = require('node:fs');
const path = require('node:path');
const engines = ['pdflatex', 'xelatex', 'lualatex'];
async function selectEngine(args = process.argv.slice(3)) {
  const engineFlag = args.findIndex(value => value === '--engine' || value.startsWith('--engine='));
  let selected = engineFlag < 0 ? process.env.LEMMATA_ENGINE : (args[engineFlag].split('=')[1] || args[engineFlag + 1]);
  if (engineFlag >= 0 && !selected) throw new Error('Use --engine pdflatex, xelatex or lualatex.');
  if (selected && !engines.includes(selected)) throw new Error('Unsupported engine. Choose pdflatex, xelatex or lualatex.');
  if (selected) {
    const file = path.join(process.env.LEMMATA_DATA_DIR || path.resolve(__dirname, '..'), 'lemmata-settings.json');
    let settings = {};
    try { settings = JSON.parse(fs.readFileSync(file, 'utf8')); } catch { /* First launch. */ }
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify({ ...settings, defaultEngine: selected }, null, 2));
  }
  return selected;
}
module.exports = { selectEngine };
