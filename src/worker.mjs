import {WaffoPancake,verifyWebhook} from '@waffo/pancake-ts';
import {PLANS,COSTS,FORMATS} from './catalog.mjs';
import {HttpError,sql,balance,applyEvent,createJob,failJob} from './commerce.mjs';
import {userFrom,requireUser,authenticate,recover,logout,rateLimit} from './auth.mjs';
const json=(body,status=200,extra={})=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','X-Robots-Tag':'noindex, nofollow',...extra}});
const mode=env=>['test','prod'].includes(env.PAYMENT_MODE)?env.PAYMENT_MODE:'test';
const paymentKey=env=>mode(env)==='prod'?env.WAFFO_PRODUCTION_PRIVATE_KEY:env.WAFFO_PRIVATE_KEY;
const checkoutReady=env=>env.CHECKOUT_ENABLED==='true' && Boolean(paymentKey(env)) && Boolean(env.WAFFO_MERCHANT_ID && env.WAFFO_STORE_ID) && (mode(env)!=='prod' || env.GENERATION_MODE==='provider');
function waffo(env) {
  if(!checkoutReady(env)) throw new HttpError(503,'CHECKOUT_PAUSED');
  // No real payments while generation uses a reference clip.
  if(mode(env)==='prod' && env.GENERATION_MODE!=='provider') throw new HttpError(503,'CHECKOUT_PAUSED');
  return new WaffoPancake({merchantId:env.WAFFO_MERCHANT_ID,privateKey:paymentKey(env).replace(/\\n/g,'\n'),environment:mode(env)});
}
async function limitedText(request,limit) {
  if(Number(request.headers.get('content-length'))>limit)throw new HttpError(413,'REQUEST_TOO_LARGE');
  if(!request.body)return '';
  const reader=request.body.getReader(),chunks=[];let size=0;
  while(true) {const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>limit){await reader.cancel();throw new HttpError(413,'REQUEST_TOO_LARGE');}chunks.push(value);}
  const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
  return new TextDecoder().decode(bytes);
}
async function bodyJSON(request) {
  try {const data=JSON.parse(await limitedText(request,8192));if(!data || typeof data!=='object' || Array.isArray(data))throw new HttpError(400,'INVALID_JSON');return data;}
  catch(error) {if(error instanceof HttpError)throw error;throw new HttpError(400,'INVALID_JSON');}
}
function summary(job) {
  return {id:job.id,status:job.status,credits:job.cost,resolution:job.resolution,format:job.format,mock:Boolean(job.mock),draftId:job.draft_id,createdAt:job.created_at,
    resultUrl:job.status==='succeeded'?`/api/jobs/${job.id}/result`:null};
}
async function api(request,env) {
  const url=new URL(request.url),path=url.pathname;
  // A separate production receiver never writes live events into the Test ledger.
  if(path==='/api/waffo/webhook/production') {
    if(!env.PRODUCTION_DB) throw new HttpError(503,'SERVICE_PAUSED');
    env={...env,DB:env.PRODUCTION_DB,PAYMENT_MODE:'prod',WAFFO_WEBHOOK_PUBLIC_KEY:env.WAFFO_PRODUCTION_WEBHOOK_PUBLIC_KEY};
  }
  const db=env.DB;
  if(!db) throw new HttpError(503,'SERVICE_PAUSED');
  if(['/api/waffo/webhook','/api/waffo/webhook/production'].includes(path) && request.method==='POST') {
    const raw=await limitedText(request,65536);
    let event;
    try {event=verifyWebhook(raw,request.headers.get('x-waffo-signature')||'',{environment:mode(env),...(env.WAFFO_WEBHOOK_PUBLIC_KEY?{publicKey:env.WAFFO_WEBHOOK_PUBLIC_KEY.replace(/\\n/g,'\n')}:{})});}
    catch {throw new HttpError(401,'SIGNATURE_INVALID');}
    return json(await applyEvent(db,event,{...env,PAYMENT_MODE:mode(env)}));
  }
  if(!['GET','POST'].includes(request.method)) throw new HttpError(405,'METHOD_NOT_ALLOWED');
  if(request.method==='POST') {
    // Reject browser CSRF and unapproved mirror hosts; local dev sets its own origin.
    if(request.headers.get('origin')!==url.origin || url.origin!==env.SITE_ORIGIN || !request.headers.get('content-type')?.startsWith('application/json')) throw new HttpError(403,'ORIGIN_REJECTED');
  }
  if(path==='/api/session' && request.method==='GET') {
    const user=await userFrom(request,db);
    return json({user,mode:mode(env),generationMode:env.GENERATION_MODE||'mock',checkoutEnabled:checkoutReady(env),balance:user?await balance(db,user.id,mode(env)):0,plans:PLANS});
  }
  if(['/api/auth/signup','/api/auth/signin','/api/auth/recover'].includes(path) && request.method==='POST') {
    const body=await bodyJSON(request),result=path.endsWith('recover')?await recover(request,db,body):await authenticate(request,db,body,path.split('/').pop());
    return json({user:result.user,...(result.recovery?{recovery:result.recovery}:{})},200,{'Set-Cookie':result.cookie});
  }
  if(path==='/api/auth/logout' && request.method==='POST') return json({ok:true},200,{'Set-Cookie':await logout(request,db)});
  const user=await requireUser(request,db);
  if(path==='/api/checkout' && request.method==='POST') {
    const body=await bodyJSON(request),plan=PLANS[body.planId];
    if(!plan) throw new HttpError(400,'PLAN_INVALID');
    await rateLimit(db,`checkout:${user.id}`,10,600000);
    const products=JSON.parse(env.WAFFO_PRODUCTS||'{}'),productId=products[body.planId];
    if(!/^PROD_[A-Za-z0-9]+$/.test(productId||'')) throw new HttpError(503,'CHECKOUT_PAUSED');
    const client=waffo(env),id=crypto.randomUUID();
    const draftId=typeof body.draftId==='string' && /^[a-f0-9-]{36}$/.test(body.draftId)?body.draftId:'';
    const current=await sql(db,"SELECT id FROM orders WHERE user_id=? AND mode=? AND plan_id IN ('starter','creator','studio') AND status IN ('active','paid','canceling','past_due')",user.id,mode(env)).first();
    if(plan.kind==='monthly' && current) throw new HttpError(409,'SUBSCRIPTION_EXISTS');
    await sql(db,'INSERT INTO orders(id,user_id,mode,plan_id,product_id,draft_id,created_at) VALUES(?,?,?,?,?,?,?)',id,user.id,mode(env),body.planId,productId,draftId,Date.now()).run();
    try {
      const session=await client.checkout.authenticated.create({productId,buyerIdentity:user.id,buyerEmail:user.email,currency:'USD',withTrial:false,expiresInSeconds:1800,language:'en',successUrl:`${env.SITE_ORIGIN}/pricing?checkout=${id}`,
        metadata:{orderId:id,userId:user.id,planId:body.planId,draftId},orderMerchantExternalId:id},{idempotencyKey:id});
      const redirect=new URL(session.checkoutUrl);
      if(redirect.protocol!=='https:' || redirect.hostname!=='pancake.waffo.ai') throw new HttpError(502,'CHECKOUT_FAILED');
      return json({orderId:id,checkoutUrl:session.checkoutUrl,mode:mode(env)});
    } catch(error) {
      await sql(db,"UPDATE orders SET status='checkout_failed' WHERE id=? AND status='pending'",id).run();
      if(error instanceof HttpError) throw error;
      throw new HttpError(502,'CHECKOUT_FAILED');
    }
  }
  if(path==='/api/orders' && request.method==='GET') {
    const rows=await sql(db,'SELECT id,plan_id,status,created_at FROM orders WHERE user_id=? AND mode=? ORDER BY created_at DESC LIMIT 30',user.id,mode(env)).all();
    return json({orders:rows.results});
  }
  const orderMatch=path.match(/^\/api\/orders\/([a-f0-9-]{36})$/);
  if(orderMatch && request.method==='GET') {
    const order=await sql(db,'SELECT id,status,plan_id FROM orders WHERE id=? AND user_id=? AND mode=?',orderMatch[1],user.id,mode(env)).first();
    if(!order) throw new HttpError(404,'ORDER_NOT_FOUND');
    const grant=await sql(db,'SELECT id FROM lots WHERE order_id=? AND revoked=0 LIMIT 1',order.id).first();
    return json({order,credited:Boolean(grant),balance:await balance(db,user.id,mode(env)),mode:mode(env)});
  }
  if(path==='/api/billing/portal' && request.method==='POST') {
    const {portalUrl}=await waffo(env).auth.createCustomerPortalLink({storeId:env.WAFFO_STORE_ID,buyerIdentity:user.id});
    const target=new URL(portalUrl);
    if(target.protocol!=='https:' || target.hostname!=='pancake.waffo.ai') throw new HttpError(502,'PORTAL_FAILED');
    return json({portalUrl});
  }
  if(path==='/api/jobs' && request.method==='GET') {
    const rows=await sql(db,'SELECT * FROM jobs WHERE user_id=? AND mode=? ORDER BY created_at DESC LIMIT 20',user.id,mode(env)).all();
    return json({jobs:rows.results.map(summary)});
  }
  if(path==='/api/jobs' && request.method==='POST') {
    // Until a provider is implemented, production credits cannot be consumed.
    if(env.GENERATION_MODE!=='mock' || mode(env)!=='test') throw new HttpError(503,'GENERATION_PAUSED');
    await rateLimit(db,`jobs:${user.id}`,30,600000);
    const body=await bodyJSON(request),cost=COSTS[body.resolution];
    if(!cost || !FORMATS.includes(body.format) || !/^[a-f0-9-]{36}$/.test(body.draftId||'') || !/^[a-f0-9-]{36}$/.test(body.requestKey||'')) throw new HttpError(400,'JOB_INVALID');
    const job=await createJob(db,{userId:user.id,mode:mode(env),key:body.requestKey,draftId:body.draftId,cost,resolution:body.resolution,format:body.format});
    return json({job:summary(job),balance:await balance(db,user.id,mode(env))});
  }
  const jobMatch=path.match(/^\/api\/jobs\/([a-f0-9-]{36})(\/result)?$/);
  if(jobMatch && request.method==='GET') {
    let job=await sql(db,'SELECT * FROM jobs WHERE id=? AND user_id=? AND mode=?',jobMatch[1],user.id,mode(env)).first();
    if(!job) throw new HttpError(404,'JOB_NOT_FOUND');
    if(job.status==='running' && Date.now()-job.created_at>=2500) {
      if(mode(env)!=='test' || !job.mock) throw new HttpError(503,'GENERATION_PAUSED');
      const clip=await env.ASSETS.fetch(new Request(`${url.origin}/assets/6d6c14be4081-burning-bridges-example-1.mp4`));
      if(!clip.ok) {await failJob(db,job.id);job.status='failed';}
      else {await sql(db,"UPDATE jobs SET status='succeeded' WHERE id=? AND status='running'",job.id).run();job.status='succeeded';}
    }
    if(jobMatch[2]) {
      if(job.status!=='succeeded' || !job.mock || mode(env)!=='test') throw new HttpError(409,'RESULT_NOT_READY');
      const response=await env.ASSETS.fetch(new Request(`${url.origin}/assets/6d6c14be4081-burning-bridges-example-1.mp4`,{headers:request.headers.has('range')?{range:request.headers.get('range')}:{}}));
      const headers=new Headers(response.headers);headers.set('Cache-Control','private, no-store');headers.set('Content-Disposition',`attachment; filename="burning-bridges-test-${job.id}.mp4"`);
      return new Response(response.body,{status:response.status,headers});
    }
    return json({job:summary(job),balance:await balance(db,user.id,mode(env))});
  }
  throw new HttpError(404,'API_NOT_FOUND');
}
export default {
  async fetch(request,env) {
    if(!new URL(request.url).pathname.startsWith('/api/')) return env.ASSETS.fetch(request);
    try {return await api(request,env);} catch(error) {
      // Do not log raw checkout errors, signed payloads, account or payment details.
      if(error instanceof HttpError) return json({error:error.code},error.status);
      console.error('Commerce request failed');return json({error:'SERVICE_ERROR'},500);
    }
  },
};
