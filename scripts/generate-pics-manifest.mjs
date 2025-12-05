import fs from 'fs';
import path from 'path';

const root = process.cwd();
const picsDir = path.join(root, 'public', 'pics');
const outFile = path.join(root, 'public', 'pics-manifest.json');

function isImage(file) {
  return /\.(png|jpe?g|webp|gif|svg)$/i.test(file);
}

async function main() {
  try {
    if (!fs.existsSync(picsDir)) {
      console.log('No public/pics directory. Skipping manifest generation.');
      return;
    }
    const files = fs.readdirSync(picsDir).filter(isImage).sort();
    const urls = files.map((f) => `/pics/${f}`);
    fs.writeFileSync(outFile, JSON.stringify({ images: urls }, null, 2));
    console.log(`Wrote ${urls.length} entries to public/pics-manifest.json`);
  } catch (e) {
    console.error('Failed to generate pics manifest:', e);
    process.exitCode = 1;
  }
}

main();



