import fs from 'fs';
import path from 'path';
import JSZip from 'jszip';

const zip = new JSZip();

function addDirectoryToZip(zipFolder, dirPath, rootDir) {
  const items = fs.readdirSync(dirPath);
  for (const item of items) {
    if (item === 'node_modules' || item === 'dist' || item === '.git' || item === 'versenest-project.zip' || item === '.openai' || item === 'bun.lock' || (item.startsWith('.env') && item !== '.env.example')) {
      continue;
    }
    const fullPath = path.join(dirPath, item);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      const subFolder = zipFolder.folder(item);
      addDirectoryToZip(subFolder, fullPath, rootDir);
    } else {
      const content = fs.readFileSync(fullPath);
      zipFolder.file(item, content);
    }
  }
}

async function main() {
  const rootDir = process.cwd();
  console.log('Packaging project files into ZIP...');
  addDirectoryToZip(zip, rootDir, rootDir);

  const publicDir = path.join(rootDir, 'public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  const zipBuffer = await zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 9 },
  });

  const outputPath = path.join(publicDir, 'versenest-project.zip');
  fs.writeFileSync(outputPath, zipBuffer);
  console.log(`Successfully created ZIP archive: ${outputPath} (${(zipBuffer.length / 1024).toFixed(1)} KB)`);
}

main().catch(err => {
  console.error('Error creating ZIP:', err);
  process.exit(1);
});
