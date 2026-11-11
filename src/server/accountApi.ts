import { CONSENT_TEXT,CONSENT_VERSION,type ParentProfile } from '../accountTypes';
// Confirmed Site owner. This file is imported only by server routes.
const OWNER_EMAIL='star.joyce23@gmail.com';
export const json=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'private, no-store','Vary':'Cookie'}});
export function requestUser(request:Request){
 const id=request.headers.get('oai-authenticated-user-id');
 const email=request.headers.get('oai-authenticated-user-email')?.trim().toLowerCase();
 if(!id||!email)return null;
 return {id,email,isOwner:email===OWNER_EMAIL};
}
export function accountMismatch(request:Request,userId:string){const expected=request.headers.get('X-VerseNest-Account');return Boolean(expected&&expected!==userId);}
interface ProfileRow {user_id:string;name:string;email:string;marketing_opt_in:number;consent_at:string|null;consent_version:string|null;created_at:string;updated_at:string}
function profile(row:ProfileRow):ParentProfile{return {name:row.name,email:row.email,marketingOptIn:Boolean(row.marketing_opt_in),consentAt:row.consent_at,createdAt:row.created_at,updatedAt:row.updated_at};}
export async function getAccount(request:Request,db?:D1Database){
 const user=requestUser(request);if(!user)return json({error:'Sign in with ChatGPT to open your parent account.'},401);
 if(!db)return json({error:'Parent accounts are temporarily unavailable.'},503);
 const row=await db.prepare('SELECT * FROM parent_profiles WHERE user_id = ?').bind(user.id).first<ProfileRow>();
 // Consent is bound to the account email; a changed address must opt in again.
 const saved=row?{...profile(row),email:user.email,...(row.email!==user.email?{marketingOptIn:false,consentAt:null}:{})}:null;
 return json({userId:user.id,email:user.email,isOwner:user.isOwner,profile:saved});
}
export async function putAccount(request:Request,db?:D1Database){
 const user=requestUser(request);if(!user)return json({error:'Sign in to save your parent account.'},401);
 if(accountMismatch(request,user.id))return json({error:'The signed-in account changed. Reload VerseNest before saving.'},403);
 if(request.headers.get('origin')&&request.headers.get('origin')!==new URL(request.url).origin)return json({error:'Invalid request origin.'},403);
 if(!request.headers.get('content-type')?.includes('application/json'))return json({error:'Send a JSON profile.'},415);
 if(!db)return json({error:'Parent accounts are temporarily unavailable.'},503);
 let input:{name:string;marketingOptIn:boolean;consentVersion:string};
 try{const body=await request.text();if(body.length>4000)return json({error:'Profile is too large.'},413);input=JSON.parse(body);if(typeof input.name!=='string'||!input.name.trim()||input.name.trim().length>80||typeof input.marketingOptIn!=='boolean'||(input.marketingOptIn&&input.consentVersion!==CONSENT_VERSION))throw Error();}catch{return json({error:'Enter your name and choose your email preference.'},400);}
 const now=new Date().toISOString(),name=input.name.trim(),opt=input.marketingOptIn?1:0;
 // Keep a dated, versioned consent history. Server identity supplies the email.
 await db.batch([
  db.prepare(`INSERT INTO parent_consent_events (id,user_id,email,opted_in,consent_text,consent_version,recorded_at)
   SELECT ?,?,?,?,?,?,? WHERE NOT EXISTS(SELECT 1 FROM parent_profiles WHERE user_id=? AND email=? AND marketing_opt_in=?)`).bind(crypto.randomUUID(),user.id,user.email,opt,CONSENT_TEXT,CONSENT_VERSION,now,user.id,user.email,opt),
  db.prepare(`INSERT INTO parent_profiles (user_id,name,email,marketing_opt_in,consent_at,consent_version,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)
   ON CONFLICT(user_id) DO UPDATE SET name=excluded.name,email=excluded.email,marketing_opt_in=excluded.marketing_opt_in,
   consent_at=CASE WHEN parent_profiles.email=excluded.email AND parent_profiles.marketing_opt_in=excluded.marketing_opt_in THEN parent_profiles.consent_at ELSE excluded.consent_at END,
   consent_version=excluded.consent_version,updated_at=excluded.updated_at`).bind(user.id,name,user.email,opt,now,CONSENT_VERSION,now,now),
 ]);
 return getAccount(request,db);
}
export async function listParents(request:Request,db?:D1Database){
 const user=requestUser(request);if(!user)return json({error:'Sign in first.'},401);
 if(!user.isOwner)return json({error:'Only the VerseNest owner can view parent signups.'},403);
 if(!db)return json({error:'Parent accounts are temporarily unavailable.'},503);
 const url=new URL(request.url),cursor=url.searchParams.get('cursor')??'',subscribers=url.searchParams.get('subscribers')==='1';
 if(cursor.length>300)return json({error:'Invalid page.'},400);
 const result=await db.prepare(`SELECT * FROM parent_profiles WHERE user_id > ? ${subscribers?'AND marketing_opt_in = 1':''} ORDER BY user_id LIMIT 51`).bind(cursor).all<ProfileRow>();
 const rows=result.results.slice(0,50);
 return json({parents:rows.map(row=>({userId:row.user_id,...profile(row)})),nextCursor:result.results.length>50?rows.at(-1)!.user_id:null});
}
