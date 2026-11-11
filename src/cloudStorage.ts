import { validateFamily } from './familyData';
import type { IStorageAdapter } from './storage';
const DATA='versenest_database_v1', META='versenest_sync_v1', SAFETY='versenest_local_safety_copy_v1';
export interface SyncState {status:'loading'|'synced'|'pending'|'conflict'|'signin';updatedAt:string|null;message:string}
function browserStorage():Storage|undefined {try{return typeof window!=='undefined'?window.localStorage:undefined;}catch{return undefined;}}
export class FamilyCloudStorage implements IStorageAdapter {
  private initialized:Promise<void>|null=null;
  private revision=0;
  private pending=false;
  private conflict=false;
  private chain:Promise<void>=Promise.resolve();
  private listeners=new Set<()=>void>();
  private accountId:string|null=null;
  state:SyncState={status:'loading',updatedAt:null,message:'Opening your private family records…'};
  constructor(private local:Storage|undefined=browserStorage(),private send:typeof fetch=(input,init)=>fetch(input,init)){}
  bindAccount(userId:string,migrateLegacy=false){
    if(this.accountId===userId)return;
    if(this.accountId||this.initialized)throw new Error('The account changed. Reload VerseNest to open the correct family.');
    if(!userId||!this.local)throw new Error('Sign in and enable device storage to open your family.');
    const device=this.local,prefix=`versenest_account_${encodeURIComponent(userId)}:`;
    if(migrateLegacy&&!device.getItem(prefix+'legacy_migrated')){
      for(const key of [DATA,META,SAFETY]){const value=device.getItem(key);if(value!==null&&device.getItem(prefix+key)===null)device.setItem(prefix+key,value);}
      device.setItem(prefix+'legacy_migrated','1');
    }
    // Legacy records stay untouched; only the confirmed original owner adopts them.
    this.local={getItem:key=>device.getItem(prefix+key),setItem:(key,value)=>device.setItem(prefix+key,value),removeItem:key=>device.removeItem(prefix+key)} as Storage;
    this.accountId=userId;
  }
  subscribe=(listener:()=>void)=>{this.listeners.add(listener);return()=>{this.listeners.delete(listener);};};
  snapshot=()=>this.state;
  private report(status:SyncState['status'],message:string,updatedAt=this.state.updatedAt){this.state={status,message,updatedAt};for(const listener of this.listeners)listener();}
  private writeMeta(){this.local?.setItem(META,JSON.stringify({revision:this.revision,pending:this.pending}));}
  private async request(method='GET',body?:unknown){
    const response=await this.send('/api/family',{method,credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json',...(this.accountId?{'X-VerseNest-Account':this.accountId}:{})},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(6000)});
    if(response.status===403){this.report('signin','The signed-in account changed. Reload VerseNest. Your device copy is preserved.');throw new Error('signin');}
    if(response.status===401){this.report('signin','Sign in again to sync. Your device copy is preserved.');throw new Error('signin');}
    if(response.status===409){this.conflict=true;this.report('conflict','Another device has newer changes. Both copies are preserved.');throw new Error('conflict');}
    if(!response.ok||!response.headers.get('content-type')?.includes('application/json'))throw new Error('offline');
    return response.json() as Promise<{data?:unknown;revision:number;updatedAt?:string}>;
  }
  private async initialize(){
    if(!this.local)throw new Error('Device storage is unavailable.');
    try {const meta=JSON.parse(this.local.getItem(META)||'{}');this.revision=meta.revision||0;this.pending=Boolean(meta.pending);}catch{this.pending=true;}
    try {
      const remote=await this.request();const local=this.local.getItem(DATA);
      if(remote.data){
        validateFamily(remote.data);
        if(local&&((this.pending&&this.revision!==remote.revision)||(this.revision===0&&remote.revision>0))&&JSON.stringify(JSON.parse(local))!==JSON.stringify(remote.data)){
          this.local.setItem(SAFETY,local);this.conflict=true;this.report('conflict','This device and your account have different records. Choose which copy to use; neither has been overwritten.');return;
        }
        if(!this.pending){if(local)this.local.setItem(SAFETY,local);this.local.setItem(DATA,JSON.stringify(remote.data));this.revision=remote.revision;this.writeMeta();this.report('synced','Saved to your private account',remote.updatedAt);}
        else await this.push();
      }else{
        this.revision=0;
        if(local){this.pending=true;this.writeMeta();await this.push();}
        else this.report('synced','Your private account is ready');
      }
    }catch(error){if(!['signin','conflict'].includes((error as Error).message))this.report('pending','Saved on this device. Account sync will retry when connected.');}
  }
  async getItem(key:string){this.initialized??=this.initialize();await this.initialized;return this.local?.getItem(key)??null;}
  async setItem(key:string,value:string){
    if(!this.local)throw new Error('Device storage is unavailable.');
    // Local save must succeed before success is shown; cloud failures stay visibly pending.
    this.local.setItem(key,value);if(key!==DATA)return;
    this.pending=true;this.writeMeta();
    this.chain=this.chain.catch(()=>{}).then(()=>this.push());await this.chain;
  }
  async removeItem(key:string){this.local?.removeItem(key);}
  private async push(){
    if(this.conflict)return;
    const raw=this.local?.getItem(DATA);if(!raw||!this.pending)return;
    this.report('pending','Saved on this device · syncing…');
    try {const result=await this.request('PUT',{data:validateFamily(JSON.parse(raw)),revision:this.revision});this.revision=result.revision;this.pending=this.local?.getItem(DATA)!==raw;this.writeMeta();this.report(this.pending?'pending':'synced',this.pending?'Saved on this device · syncing…':'Saved to your private account',result.updatedAt);}
    catch(error){if(!['signin','conflict'].includes((error as Error).message))this.report('pending','Saved on this device. Account sync will retry when connected.');}
  }
  async sync(){this.initialized??=this.initialize();await this.initialized;if(this.conflict)return;if(this.pending)await this.push();else{this.initialized=this.initialize();await this.initialized;}}
  async resolve(use:'account'|'device'){
    const remote=await this.request();const local=this.local?.getItem(DATA);if(local)this.local?.setItem(SAFETY,local);
    this.conflict=false;this.revision=remote.revision;
    if(use==='account'){if(remote.data)this.local?.setItem(DATA,JSON.stringify(validateFamily(remote.data)));this.pending=false;this.writeMeta();this.report('synced','Saved account copy loaded',remote.updatedAt);}
    else {this.pending=true;this.writeMeta();await this.push();}
  }
}
export const familyCloudStorage=new FamilyCloudStorage();
