import {env} from 'cloudflare:workers';
import {getFamily,putFamily} from '../../../src/server/familyApi';
export const dynamic='force-dynamic';
export const GET=(request:Request)=>getFamily(request,env.DB);
export const PUT=(request:Request)=>putFamily(request,env.DB);
