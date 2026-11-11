import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,readdirSync} from 'node:fs';
import React from 'react';
import {act,create} from 'react-test-renderer';
import {getAccount,putAccount,listParents} from '../src/server/accountApi';
import {getFamily,putFamily} from '../src/server/familyApi';
import {CONSENT_VERSION,type AccountInfo} from '../src/accountTypes';
import {emptyFamily} from '../src/familyData';
import {subscriberCsv} from '../src/parentCsv';
import {FamilyCloudStorage,familyCloudStorage} from '../src/cloudStorage';
import {ParentForm,ParentAccountGate} from '../src/components/ParentAccount';
const sql=new DatabaseSync(':memory:');
for(const name of readdirSync('drizzle').filter(name=>name.endsWith('.sql')).sort())sql.exec(readFileSync('drizzle/'+name,'utf8'));
class Statement {constructor(readonly query:string,readonly params:any[]=[]){ }bind(...params:any[]){return new Statement(this.query,params);}async first(){return (sql.prepare(this.query).all(...this.params) as any[])[0]??null;}async all(){return {results:sql.prepare(this.query).all(...this.params),success:true};}async run(){return this.all();}}
const db={prepare:(query:string)=>new Statement(query),batch:async(statements:Statement[])=>{sql.exec('BEGIN');try{const results=[];for(const statement of statements)results.push(await statement.all());sql.exec('COMMIT');return results;}catch(error){sql.exec('ROLLBACK');throw error;}}} as unknown as D1Database;
const users={a:{id:'parent-a',email:'a@example.com'},b:{id:'parent-b',email:'b@example.com'},owner:{id:'site-owner-id',email:'star.joyce23@gmail.com'}};
function request(path:string,user?:keyof typeof users,method='GET',data?:unknown,extra:Record<string,string>={}){return new Request('https://versenest.test'+path,{method,headers:{...(user?{'oai-authenticated-user-id':users[user].id,'oai-authenticated-user-email':users[user].email}:{}),'Content-Type':'application/json',Origin:'https://versenest.test',...extra},...(data?{body:JSON.stringify(data)}:{})});}
async function body(response:Response){assert.equal(response.headers.get('cache-control')?.includes('no-store'),true);return response.json() as Promise<any>;}
assert.equal((await getAccount(request('/api/account'),db)).status,401);
assert.equal((await putAccount(request('/api/account',undefined,'PUT',{name:'Fake',marketingOptIn:true}),db)).status,401);
let result=await body(await getAccount(request('/api/account','a'),db));assert.equal(result.profile,null);assert.equal(result.isOwner,false);
const form={name:'Parent A',marketingOptIn:false,consentVersion:CONSENT_VERSION,email:'forged@example.com'};
result=await body(await putAccount(request('/api/account','a','PUT',form),db));assert.equal(result.profile.email,'a@example.com');assert.equal(result.profile.marketingOptIn,false);
await putAccount(request('/api/account','a','PUT',form),db);
assert.equal((sql.prepare('SELECT COUNT(*) AS n FROM parent_consent_events').get() as any).n,1,'Duplicate save does not fabricate repeated consent');
await putAccount(request('/api/account','b','PUT',{...form,name:'Parent B',marketingOptIn:true}),db);
assert.equal((await putAccount(request('/api/account','a','PUT',{...form,marketingOptIn:true,consentVersion:'wrong'}),db)).status,400);
assert.equal((await putAccount(request('/api/account','a','PUT',form,{Origin:'https://other.test'}),db)).status,403);
assert.equal((await putAccount(request('/api/account','a','PUT',form,{'X-VerseNest-Account':'parent-b'}),db)).status,403);
assert.equal((await listParents(request('/api/admin/parents','a'),db)).status,403);
assert.equal((await listParents(request('/api/admin/parents'),db)).status,401);
result=await body(await listParents(request('/api/admin/parents','owner'),db));assert.equal(result.parents.length,2);assert.ok(result.parents.every((parent:any)=>!('children' in parent)));
result=await body(await listParents(request('/api/admin/parents?subscribers=1','owner'),db));assert.deepEqual(result.parents.map((parent:any)=>parent.email),['b@example.com']);
await putAccount(request('/api/account','b','PUT',{...form,name:'Parent B',marketingOptIn:false}),db);
assert.equal((await body(await listParents(request('/api/admin/parents?subscribers=1','owner'),db))).parents.length,0,'Withdrawn consent disappears from exports immediately');
assert.equal((sql.prepare("SELECT COUNT(*) AS n FROM parent_consent_events WHERE user_id='parent-b'").get() as any).n,2);
// Pagination is bounded and does not skip rows.
for(let i=0;i<55;i++)await putAccount(request('/api/account','b','PUT',form,{'oai-authenticated-user-id':`extra-${String(i).padStart(3,'0')}`}),db);
const page=await body(await listParents(request('/api/admin/parents','owner'),db));assert.equal(page.parents.length,50);assert.ok(page.nextCursor);
const next=await body(await listParents(request('/api/admin/parents?cursor='+page.nextCursor,'owner'),db));assert.equal(next.parents.length,7);assert.equal(next.nextCursor,null);assert.equal(new Set([...page.parents,...next.parents].map(parent=>parent.userId)).size,57);
// Real SQLite migrations plus the real family API: two identities cannot cross-read or overwrite.
const a=emptyFamily();a.children=[{id:'child-a',name:'A child',avatarColor:'purple',createdAt:new Date().toISOString()}];
const b=emptyFamily();b.children=[{id:'child-b',name:'B child',avatarColor:'blue',createdAt:new Date().toISOString()}];
assert.equal((await putFamily(request('/api/family','a','PUT',{data:a,revision:0}),db)).status,200);
assert.equal((await putFamily(request('/api/family','b','PUT',{data:b,revision:0}),db)).status,200);
assert.equal((await body(await getFamily(request('/api/family','a'),db))).data.children[0].name,'A child');
assert.equal((await body(await getFamily(request('/api/family','b'),db))).data.children[0].name,'B child');
assert.equal((await putFamily(request('/api/family','b','PUT',{data:a,revision:1},{'X-VerseNest-Account':'parent-a'}),db)).status,403);
assert.equal((await getFamily(request('/api/family','b','GET',undefined,{'X-VerseNest-Account':'parent-a'}),db)).status,403);
assert.equal((await getFamily(request('/api/family'),db)).status,401);
assert.equal((await putFamily(request('/api/family','a','PUT',{data:a,revision:0}),db)).status,409);
const csv=subscriberCsv([{userId:'1',name:'=DANGER()',email:'ok@example.com',marketingOptIn:true,consentAt:'2026-10-19',createdAt:'2026-10-19',updatedAt:''},{userId:'2',name:'No',email:'declined@example.com',marketingOptIn:false,consentAt:null,createdAt:'',updatedAt:''}]);assert.match(csv,/'=DANGER/);assert.ok(!csv.includes('declined@example.com'));
// Device storage namespaces and legacy adoption cannot leak the owner's family to friends.
class Local {items=new Map<string,string>();getItem(key:string){return this.items.get(key)??null;}setItem(key:string,value:string){this.items.set(key,value);}removeItem(key:string){this.items.delete(key);}}
const local=new Local();local.setItem('versenest_database_v1',JSON.stringify(a));
const send:typeof fetch=async()=>{throw new Error('offline');};
const cloudA=new FamilyCloudStorage(local as any,send);cloudA.bindAccount('owner',true);assert.equal(JSON.parse((await cloudA.getItem('versenest_database_v1'))!).children[0].name,'A child');
const cloudB=new FamilyCloudStorage(local as any,send);cloudB.bindAccount('friend',false);assert.equal(await cloudB.getItem('versenest_database_v1'),null);await cloudB.setItem('versenest_database_v1',JSON.stringify(b));
const returning=new FamilyCloudStorage(local as any,send);returning.bindAccount('owner',true);assert.equal(JSON.parse((await returning.getItem('versenest_database_v1'))!).children[0].name,'A child');assert.throws(()=>returning.bindAccount('friend'),/account changed/);
// Parent signup UI: optional consent starts unchecked and cannot change platform email.
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});let submitted:any,saved:AccountInfo|null=null;
const originalFetch=globalThis.fetch;globalThis.fetch=async(_url,init)=>{submitted=JSON.parse(init!.body as string);return Response.json({userId:'parent-a',email:'a@example.com',isOwner:false,profile:{name:submitted.name,email:'a@example.com',marketingOptIn:submitted.marketingOptIn}});};
let view:any;await act(async()=>{view=create(<ParentForm account={{userId:'parent-a',email:'a@example.com',isOwner:false,profile:null}} onSaved={value=>{saved=value;}}/>);});
assert.equal(view.root.findByProps({autoComplete:'name'}).props.value,'','New parent name starts blank');assert.equal(view.root.findByProps({type:'checkbox'}).props.checked,false);assert.equal(view.root.findByProps({type:'email'}).props.readOnly,true);
await act(async()=>{view.root.findByProps({autoComplete:'name'}).props.onChange({target:{value:'Parent A'}});});
await act(async()=>{await view.root.findByType('form').props.onSubmit({preventDefault(){}});});assert.equal(submitted.marketingOptIn,false);assert.equal(saved!.userId,'parent-a');
await act(async()=>{view.root.findByProps({type:'checkbox'}).props.onChange({target:{checked:true}});});await act(async()=>{await view.root.findByType('form').props.onSubmit({preventDefault(){}});});assert.equal(submitted.marketingOptIn,true);assert.equal(submitted.consentVersion,CONSENT_VERSION);
await act(async()=>view.unmount());
const bind=familyCloudStorage.bindAccount;let bound='';familyCloudStorage.bindAccount=(id:string)=>{bound=id;};
Object.assign(globalThis,{window:{addEventListener(){},removeEventListener(){},location:{reload(){throw new Error('Unexpected reload');}}},sessionStorage:new Local()});
Object.defineProperty(globalThis,'navigator',{configurable:true,value:{onLine:true}});
let info:AccountInfo={userId:'parent-a',email:'a@example.com',isOwner:false,profile:null};globalThis.fetch=async()=>Response.json(info);
await act(async()=>{view=create(<ParentAccountGate><div data-testid="private-family">Family records</div></ParentAccountGate>);await new Promise(resolve=>setTimeout(resolve,0));});
assert.equal(view.root.findAllByProps({'data-testid':'private-family'}).length,0,'Family records do not mount before signup');assert.equal(bound,'parent-a');
info={...info,profile:{name:'Parent A',email:info.email,marketingOptIn:false,consentAt:null,createdAt:'',updatedAt:''}};
await act(async()=>{await view.root.findByType(ParentForm).props.onSaved(info);});
assert.equal(view.root.findAllByProps({'data-testid':'private-family'}).length,1);
assert.equal(view.root.findAllByType('button').some((button:any)=>button.children.includes('Parent signups')),false,'Normal parents do not get owner controls');
await act(async()=>view.unmount());info={...info,isOwner:true};
await act(async()=>{view=create(<ParentAccountGate><div>Family</div></ParentAccountGate>);await new Promise(resolve=>setTimeout(resolve,0));});
assert.ok(view.root.findAllByType('button').some((button:any)=>button.children.includes('Parent signups')),'The owner can open parent signups');
await act(async()=>view.unmount());familyCloudStorage.bindAccount=bind;globalThis.fetch=originalFetch;sql.close();
console.log('PASS real migrated database: signup, trusted email, explicit consent, withdrawal, audit dates, owner-only paginated lists, opt-in-only CSV, two-family isolation, stale-account rejection, account-specific device copies, preserved legacy records, and signup form submission');
