import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import type { Plugin } from 'vite';

// Cache exactly the files emitted by this build; no CDN or runtime dependency.
export function verseNestPwa(): Plugin {
  let outDir: string;
  return {
    name: 'versenest-pwa',
    apply: 'build',
    configResolved(config) {
      if (config.base !== '/') throw new Error('VerseNest PWA must be hosted at the domain root (base: /).');
      outDir = join(config.root, config.build.outDir);
    },
    closeBundle() {
      const files = (dir: string): string[] => readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
        const file = join(dir, entry.name);
        return entry.isDirectory() ? files(file) : [file];
      });
      const assets = files(outDir).filter(file => !file.endsWith('.zip') && !file.endsWith('/sw.js') && !file.endsWith('.map'));
      const version = createHash('sha256');
      for (const file of assets.sort()) { version.update(relative(outDir, file)); version.update(readFileSync(file)); }
      const template = readFileSync(join(process.cwd(), 'scripts/sw-template.js'), 'utf8');
      version.update(template);
      const urls = assets.map(file => '/' + relative(outDir, file).split('\\').join('/'));
      writeFileSync(join(outDir, 'sw.js'), template.replace('__CACHE_NAME__', JSON.stringify('versenest-shell-' + version.digest('hex').slice(0, 16))).replace('__PRECACHE_URLS__', JSON.stringify(urls)));
    },
  };
}
