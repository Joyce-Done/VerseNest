import assert from 'node:assert/strict';
import {readFileSync,existsSync,readdirSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const root='dist/client';
const manifest=JSON.parse(readFileSync(root+'/manifest.webmanifest','utf8'));
assert.equal(manifest.display,'standalone');assert.equal(manifest.start_url,'/');
for(const icon of manifest.icons){const data=readFileSync(root+icon.src);assert.equal(data.subarray(1,4).toString(),'PNG');assert.equal(`${data.readUInt32BE(16)}x${data.readUInt32BE(20)}`,icon.sizes);}
const code=readFileSync(root+'/sw.js','utf8');
const callbacks={},stores=new Map([['unrelated-cache',new Map()],['versenest-shell-old',new Map()]]);
let online=true,authRedirect=false,skipped=false,claimed=false;
const shell='<html><body><div id="root">VerseNest account app</div></body></html>';
const context={URL,Response,self:{location:{origin:'https://versenest.test'},clients:{claim:async()=>{claimed=true;}},skipWaiting:()=>{skipped=true;},addEventListener:(name,callback)=>callbacks[name]=callback},caches:{keys:async()=>[...stores.keys()],delete:async key=>stores.delete(key),open:async key=>{if(!stores.has(key))stores.set(key,new Map());const cache=stores.get(key);return{put:async(key,value)=>cache.set(key,value.clone()),match:async key=>cache.get(key)?.clone()};}},fetch:async(request,options)=>{if(typeof request==='string'){if(!online)throw new Error('offline');const response=new Response(request==='/'?shell:readFileSync(root+request));Object.defineProperties(response,{url:{value:authRedirect?'https://chatgpt.com/auth':'https://versenest.test'+request},redirected:{value:authRedirect}});return response;}assert.equal(options.redirect,'manual');if(!online)throw new Error('offline');return Response.redirect('https://chatgpt.com/auth',302);}};
runInNewContext(code,context);
async function lifecycle(name){let promise;callbacks[name]({waitUntil:value=>promise=value});await promise;}
async function request(path,mode='cors'){let response;callbacks.fetch({request:{url:'https://versenest.test'+path,mode,method:'GET'},respondWith:value=>response=value});return response;}
await lifecycle('install');await lifecycle('activate');assert.ok(skipped&&claimed);assert.ok(stores.has('unrelated-cache'));assert.ok(!stores.has('versenest-shell-old'));
online=false;assert.equal(await(await request('/','navigate')).text(),shell);assert.equal(await(await request('/index.html','navigate')).text(),shell);
for(const file of ['/brand/versenest-logo.png','/brand/versenest-logo-print.png','/fonts/DejaVuSans.ttf'])assert.deepEqual(Buffer.from(await(await request(file)).arrayBuffer()),readFileSync(root+file));
assert.equal(await request('/api/family'),undefined,'Account records must never enter app-shell caches');assert.equal(await request('/'),undefined,'RSC or other root fetches must not receive cached HTML');
online=true;assert.equal((await request('/','navigate')).status,302);authRedirect=true;await assert.rejects(lifecycle('install'),/redirect/);
assert.ok(existsSync('dist/server/index.js')||existsSync('dist/server/wrangler.json'));
console.log('PASS Worker PWA: real emitted assets, phone icons, offline authenticated shell, offline branding and fonts, auth redirects, no caching of account data, cache isolation, and service-worker activation');
