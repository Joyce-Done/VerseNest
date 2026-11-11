import { emptyFamily, validateFamily } from '../familyData';
import {accountMismatch} from './accountApi';
const reply=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
function identity(request:Request){return request.headers.get('oai-authenticated-user-id');}
export async function getFamily(request:Request,db?:D1Database){
  const user=identity(request);if(!user)return reply({error:'Sign in to open your family records.'},401);
  if(accountMismatch(request,user))return reply({error:'The signed-in account changed. Reload VerseNest.'},403);
  if(!db)return reply({error:'Family storage is not available yet.'},503);
  const row=await db.prepare('SELECT content, revision, updated_at FROM family_documents WHERE owner_id = ?').bind(user).first<{content:string;revision:number;updated_at:string}>();
  return reply({data:row?JSON.parse(row.content):null,revision:row?.revision??0,updatedAt:row?.updated_at??null});
}
export async function putFamily(request:Request,db?:D1Database){
  const user=identity(request);if(!user)return reply({error:'Sign in to save your family records.'},401);
  if(accountMismatch(request,user))return reply({error:'The signed-in account changed. Reload VerseNest.'},403);
  const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)return reply({error:'Invalid request origin.'},403);
  if(!request.headers.get('content-type')?.includes('application/json'))return reply({error:'Send a VerseNest JSON record.'},415);
  if(!db)return reply({error:'Family storage is not available yet.'},503);
  let input:{data:unknown;revision:number};
  try {const body=await request.text();if(body.length>4_000_000)return reply({error:'Family backup is too large.'},413);input=JSON.parse(body);if(!Number.isInteger(input.revision)||input.revision<0)throw new Error();input.data=validateFamily(input.data);}catch{return reply({error:'The family records could not be validated.'},400);}
  const now=new Date().toISOString();
  await db.prepare('INSERT INTO family_documents (owner_id, content, revision, updated_at) VALUES (?, ?, 0, ?) ON CONFLICT(owner_id) DO NOTHING').bind(user,JSON.stringify(emptyFamily()),now).run();
  const results=await db.batch([
    db.prepare('INSERT INTO family_history (owner_id, revision, content, saved_at) SELECT owner_id, revision, content, ? FROM family_documents WHERE owner_id = ? AND revision = ? ON CONFLICT(owner_id, revision) DO NOTHING').bind(now,user,input.revision),
    db.prepare('UPDATE family_documents SET content = ?, revision = revision + 1, updated_at = ? WHERE owner_id = ? AND revision = ? RETURNING revision').bind(JSON.stringify(input.data),now,user,input.revision),
  ]);
  const updated=results[1].results[0] as {revision:number}|undefined;
  if(!updated)return reply({error:'Another device saved newer changes. Both copies are preserved.'},409);
  return reply({revision:updated.revision,updatedAt:now});
}
