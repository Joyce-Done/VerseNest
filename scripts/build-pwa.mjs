import {createHash} from 'node:crypto';
import {readFileSync,readdirSync,writeFileSync} from 'node:fs';
import {join,relative} from 'node:path';
const root='dist/client';
const walk=dir=>readdirSync(dir,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?walk(join(dir,entry.name)):[join(dir,entry.name)]);
const files=walk(root).filter(path=>!path.endsWith('/sw.js')&&!path.endsWith('.map'));
const hash=createHash('sha256');for(const file of files.sort()){hash.update(relative(root,file));hash.update(readFileSync(file));}
const template=readFileSync('scripts/sw-template.js','utf8');hash.update(template);
const urls=['/',...files.map(file=>'/'+relative(root,file).split('\\').join('/'))];
writeFileSync(join(root,'sw.js'),template.replace('__CACHE_NAME__',JSON.stringify('versenest-shell-'+hash.digest('hex').slice(0,16))).replace('__PRECACHE_URLS__',JSON.stringify(urls)));
