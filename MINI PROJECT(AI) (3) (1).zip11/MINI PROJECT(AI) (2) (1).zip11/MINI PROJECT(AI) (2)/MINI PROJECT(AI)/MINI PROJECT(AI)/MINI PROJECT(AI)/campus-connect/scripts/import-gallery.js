const fs = require('fs');
const path = require('path');

function findGalleryRoot() {
  const cwd = __dirname; // campus-connect/scripts
  const candidates = [
    path.resolve(cwd, '..', '..', 'gallery of colleges', 'gallery of colleges'),
    path.resolve(cwd, '..', '..', '..', 'gallery of colleges', 'gallery of colleges'),
    path.resolve(cwd, '..', '..', '..', '..', 'gallery of colleges', 'gallery of colleges'),
    path.resolve(cwd, '..', '..', '..', '..', '..', 'gallery of colleges', 'gallery of colleges')
  ];
  for (const p of candidates) {
    if (fs.existsSync(p) && fs.statSync(p).isDirectory()) return p;
  }
  return null;
}

function normalize(s) {
  return (s||'').toString().toLowerCase().replace(/[^a-z0-9]+/g, '');
}

(async function main(){
  const srcRoot = findGalleryRoot();
  if (!srcRoot) {
    console.error('Could not locate "gallery of colleges/gallery of colleges" folder.\nChecked relative candidates.');
    process.exit(2);
  }
  const campusRoot = path.resolve(__dirname, '..');
  const destRoot = path.join(campusRoot, 'public', 'gallery');
  const collegesPath = path.join(campusRoot, 'data', 'colleges.json');

  if (!fs.existsSync(collegesPath)) {
    console.error('Missing colleges.json at', collegesPath);
    process.exit(3);
  }

  fs.mkdirSync(destRoot, { recursive: true });

  const colleges = JSON.parse(fs.readFileSync(collegesPath, 'utf8'));

  const folders = fs.readdirSync(srcRoot).filter(n => fs.statSync(path.join(srcRoot, n)).isDirectory());

  const summary = {};

  for (const folder of folders) {
    const folderPath = path.join(srcRoot, folder);
    const files = fs.readdirSync(folderPath).filter(f => !f.startsWith('.'));
    if (!files.length) continue;
    const outFolder = path.join(destRoot, folder);
    fs.mkdirSync(outFolder, { recursive: true });

    const webPaths = [];
    for (const f of files) {
      const src = path.join(folderPath, f);
      const dest = path.join(outFolder, f);
      try {
        if (!fs.existsSync(dest)) fs.copyFileSync(src, dest);
        webPaths.push('/gallery/' + encodeURIComponent(folder) + '/' + encodeURIComponent(f));
      } catch (e) {
        console.warn('Failed copying', src, '->', dest, e.message);
      }
    }

    // try to match this folder to a college entry
    const nfolder = normalize(folder);
    let matched = false;
    for (const c of colleges) {
      const candidates = [c.name, c.image, c.city, c.type].filter(Boolean).map(normalize);
      if (candidates.some(x => x.includes(nfolder) || nfolder.includes(x))) {
        c.gallery = webPaths.slice(0, 12);
        matched = true;
        summary[folder] = c.name;
        break;
      }
    }

    if (!matched) {
      // try fuzzy match by rank or short name: look for folder name present in any college name tokens
      for (const c of colleges) {
        const tokens = (c.name || '').toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
        if (tokens.includes(folder.toLowerCase())) {
          c.gallery = webPaths.slice(0, 12);
          matched = true;
          summary[folder] = c.name;
          break;
        }
      }
    }

    if (!matched) {
      // if still not matched, create a placeholder entry in summary
      summary[folder] = null;
    }
  }

  // backup existing file
  fs.copyFileSync(collegesPath, collegesPath + '.bak');
  fs.writeFileSync(collegesPath, JSON.stringify(colleges, null, 2), 'utf8');

  console.log('Imported gallery folders from', srcRoot);
  console.log('Written images into', destRoot);
  console.log('Summary (folder -> matched college name or null):');
  console.log(summary);
  console.log('Updated', collegesPath, ' (backup at .bak)');
})();
