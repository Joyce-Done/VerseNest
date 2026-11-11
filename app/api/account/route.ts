import {env} from 'cloudflare:workers';
import {getAccount,putAccount} from '../../../src/server/accountApi';
export const dynamic='force-dynamic';
export const GET=(request:Request)=>getAccount(request,env.DB);
export const PUT=(request:Request)=>putAccount(request,env.DB);
