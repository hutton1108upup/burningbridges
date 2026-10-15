import {WaffoPancake,verifyWebhook} from '@waffo/pancake-ts';
import {PLANS,COSTS,FORMATS} from './catalog.mjs';
import {HttpError,sql,balance,applyEvent,createJob,failJob} from './commerce.mjs';
import {userFrom,requireUser,authenticate,recover,logout,rateLimit} from './auth.mjs';
import {MAX_IMAGE_BYTES,assetKey,generationReady,imageDimensions,imageType,sha256,signAsset,verifyAsset} from './generation-assets.mjs';
import {reserveProviderJob} from './provider-jobs.mjs';
import {processProviderJob} from './generation-executor.mjs';
import {ApimartClient} from './apimart.mjs';
import {GENERATION_PROFILE} from './generation-policy.mjs';
import {googleEnabled,googleAuth,startGoogle,completeGoogle} from './google-auth.mjs';
const json=(body,status=200,extra={})=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','X-Robots-Tag':'noindex, nofollow',...extra}});
const mode=env=>['test','prod'].includes(env.PAYMENT_MODE)?env.PAYMENT_MODE:'test';
const paymentKey=env=>mode(env)==='prod'?env.WAFFO_PRODUCTION_PRIVATE_KEY:env.WAFFO_PRIVATE_KEY;
const checkoutReady=env=>env.CHECKOUT_ENABLED==='true' && Boolean(paymentKey(env)) && Boolean(env.WAFFO_MERCHANT_ID && env.WAFFO_STORE_ID);
function waffo(env) {
  if(!checkoutReady(env)) throw new HttpError(503,'CHECKOUT_PAUSED');
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
async function limitedBytes(request,limit) { if(Number(request.headers.get('content-length'))>limit)throw new HttpError(413,'REQUEST_TOO_LARGE');const reader=request.body?.getReader();if(!reader)return new Uint8Array();const chunks=[];let size=0;while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>limit){await reader.cancel();throw new HttpError(413,'REQUEST_TOO_LARGE');}chunks.push(value);}const out=new Uint8Array(size);let at=0;for(const c of chunks){out.set(c,at);at+=c.byteLength;}return out;}
async function bodyJSON(request) {
  try {const data=JSON.parse(await limitedText(request,8192));if(!data || typeof data!=='object' || Array.isArray(data))throw new HttpError(400,'INVALID_JSON');return data;}
  catch(error) {if(error instanceof HttpError)throw error;throw new HttpError(400,'INVALID_JSON');}
}
function summary(job) {
  const status=job.provider_status==='unknown'?'unknown':job.status;
  return {id:job.id,status,credits:job.cost,resolution:job.resolution,format:job.format,mock:Boolean(job.mock),draftId:job.draft_id,createdAt:job.created_at,
    resultUrl:job.status==='succeeded'?`/api/jobs/${job.id}/result`:null,stage:job.stage||null,audioStatus:job.audio_status||null,providerError:job.provider_error||null};
}
async function api(request,env) {
  const url=new URL(request.url),path=url.pathname;
  // Keep the existing sandbox receiver isolated after the public app goes live.
  if(path==='/api/waffo/webhook' && mode(env)==='prod') {
    if(!env.TEST_DB) throw new HttpError(503,'SERVICE_PAUSED');
    env={...env,DB:env.TEST_DB,PAYMENT_MODE:'test'};
  }
  // A separate production receiver never writes live events into the Test ledger.
  if(path==='/api/waffo/webhook/production') {
    if(!env.PRODUCTION_DB) throw new HttpError(503,'SERVICE_PAUSED');
    env={...env,DB:env.PRODUCTION_DB,PAYMENT_MODE:'prod',WAFFO_WEBHOOK_PUBLIC_KEY:env.WAFFO_PRODUCTION_WEBHOOK_PUBLIC_KEY};
  }
  const db=env.DB;
  if(!db) throw new HttpError(503,'SERVICE_PAUSED');
  if(path.startsWith('/api/oauth/')) {
    if(url.origin!==env.SITE_ORIGIN) throw new HttpError(403,'ORIGIN_REJECTED');
    if(path!=='/api/oauth/callback/google'||request.method!=='GET') throw new HttpError(404,'API_NOT_FOUND');
    return googleAuth(env).handler(request);
  }
  const assetRoute=path.match(/^\/api\/generation\/assets\/([a-f0-9-]{36})$/);
  if(assetRoute&&request.method==='GET'){
    const asset=await sql(db,'SELECT id,user_id,object_key,mime FROM generation_assets WHERE id=? AND mode=?',assetRoute[1],mode(env)).first();if(!asset||!env.GENERATION_INPUTS||!env.GENERATION_SIGNING_SECRET||!verifyAsset(env.GENERATION_SIGNING_SECRET,url.searchParams.get('token'),asset.id,asset.user_id))throw new HttpError(403,'ASSET_FORBIDDEN');const object=await env.GENERATION_INPUTS.get(asset.object_key);if(!object)throw new HttpError(404,'ASSET_NOT_FOUND');return new Response(object.body,{headers:{'Content-Type':asset.mime,'Cache-Control':'private, no-store'}});
  }
  if(['/api/waffo/webhook','/api/waffo/webhook/production'].includes(path) && request.method==='POST') {
    const raw=await limitedText(request,65536);
    let event;
    try {event=verifyWebhook(raw,request.headers.get('x-waffo-signature')||'',{environment:mode(env),...(env.WAFFO_WEBHOOK_PUBLIC_KEY?{publicKey:env.WAFFO_WEBHOOK_PUBLIC_KEY.replace(/\\n/g,'\n')}:{})});}
    catch {throw new HttpError(401,'SIGNATURE_INVALID');}
    return json(await applyEvent(db,event,{...env,PAYMENT_MODE:mode(env)}));
  }
  if(!['GET','POST'].includes(request.method)) throw new HttpError(405,'METHOD_NOT_ALLOWED');
  if(request.method==='POST' && path==='/api/generation/uploads') {
    if(!generationReady(env)) throw new HttpError(503,'GENERATION_PAUSED');
    if(request.headers.get('origin')!==url.origin || url.origin!==env.SITE_ORIGIN) throw new HttpError(403,'ORIGIN_REJECTED');
  } else if(request.method==='POST') {
    // Reject browser CSRF and unapproved mirror hosts; local dev sets its own origin.
    if(request.headers.get('origin')!==url.origin || url.origin!==env.SITE_ORIGIN || !request.headers.get('content-type')?.startsWith('application/json')) throw new HttpError(403,'ORIGIN_REJECTED');
  }
  if(path==='/api/session' && request.method==='GET') {
    const user=await userFrom(request,db);
    const googleLinked=Boolean(user&&googleEnabled(env)&&await sql(db,'SELECT auth_user_id FROM google_identities WHERE user_id=?',user.id).first());
    return json({user,googleLoginEnabled:googleEnabled(env),googleLinked,mode:mode(env),generationMode:env.GENERATION_MODE||'mock',generationReady:generationReady(env),generationProfile:GENERATION_PROFILE,checkoutEnabled:checkoutReady(env),balance:user?await balance(db,user.id,mode(env)):0,plans:PLANS});
  }
  if(path==='/api/auth/google/start'&&request.method==='POST') return startGoogle(request,env,await bodyJSON(request));
  if(path==='/api/auth/google/complete'&&request.method==='GET') {if(url.origin!==env.SITE_ORIGIN)throw new HttpError(403,'ORIGIN_REJECTED');return completeGoogle(request,env);}
  if(['/api/auth/signup','/api/auth/signin','/api/auth/recover'].includes(path) && request.method==='POST') {
    const body=await bodyJSON(request),result=path.endsWith('recover')?await recover(request,db,body):await authenticate(request,db,body,path.split('/').pop());
    return json({user:result.user,...(result.recovery?{recovery:result.recovery}:{})},200,{'Set-Cookie':result.cookie});
  }
  if(path==='/api/auth/logout' && request.method==='POST') return json({ok:true},200,{'Set-Cookie':await logout(request,db)});
  const user=await requireUser(request,db);
  if(path==='/api/generation/uploads' && request.method==='POST') {
    const type=request.headers.get('content-type')||'',bytes=await limitedBytes(request,MAX_IMAGE_BYTES),ext=imageType(type,bytes),dimensions=ext&&imageDimensions(ext,Buffer.from(bytes));if(!ext||!dimensions?.width||!dimensions?.height)throw new HttpError(400,'PHOTO_INVALID');
    const id=crypto.randomUUID(),key=assetKey(user.id,id,ext);await env.GENERATION_INPUTS.put(key,bytes,{httpMetadata:{contentType:type}});
    await sql(db,'INSERT INTO generation_assets(id,user_id,mode,object_key,mime,size,sha256,width,height,created_at) VALUES(?,?,?,?,?,?,?,?,?,?)',id,user.id,mode(env),key,type,bytes.byteLength,sha256(bytes),dimensions.width,dimensions.height,Date.now()).run();return json({assetId:id,mime:type,size:bytes.byteLength,width:dimensions.width,height:dimensions.height});
  }
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
    // Only verified, non-revoked receipts with a corresponding credit grant qualify.
    const receipt=grant&&mode(env)==='prod'?await sql(db,'SELECT r.id,r.charged_cents FROM receipts r JOIN lots l ON l.receipt_id=r.id WHERE r.order_id=? AND r.revoked=0 AND l.revoked=0 ORDER BY r.period ASC LIMIT 1',order.id).first():null;
    const plan=PLANS[order.plan_id];
    const analytics=receipt&&plan?{transaction_id:receipt.id,currency:'USD',value:receipt.charged_cents/100,item_id:order.plan_id,item_name:plan.name}:null;
    return json({order,credited:Boolean(grant),balance:await balance(db,user.id,mode(env)),mode:mode(env),analytics});
  }
  if(path==='/api/billing/portal' && request.method==='POST') {
    const {portalUrl}=await waffo(env).auth.createCustomerPortalLink({storeId:env.WAFFO_STORE_ID,buyerIdentity:user.id});
    const target=new URL(portalUrl);
    if(target.protocol!=='https:' || target.hostname!=='pancake.waffo.ai') throw new HttpError(502,'PORTAL_FAILED');
    return json({portalUrl});
  }
  if(path==='/api/jobs' && request.method==='GET') {
    const rows=await sql(db,'SELECT j.*,p.status AS provider_status,p.stage,p.audio_status,p.error_code AS provider_error FROM jobs j LEFT JOIN provider_jobs p ON p.job_id=j.id WHERE j.user_id=? AND j.mode=? ORDER BY j.created_at DESC LIMIT 20',user.id,mode(env)).all();
    return json({jobs:rows.results.map(summary)});
  }
  if(path==='/api/jobs' && request.method==='POST') {
    if(mode(env)==='prod' && env.GENERATION_MODE==='provider') {
      if(!generationReady(env)) throw new HttpError(503,'GENERATION_PAUSED');
      const body=await bodyJSON(request),cost=COSTS[body.resolution],asset=await sql(db,'SELECT id,object_key FROM generation_assets WHERE id=? AND user_id=? AND mode=?',body.photoAssetId,user.id,mode(env)).first();
      if(!cost||body.resolution!=='720'||body.format!=='16:9'||body.templateId!=='burning-bridges-template-15s'||!asset||!/^[a-f0-9-]{36}$/.test(body.requestKey||''))throw new HttpError(400,'JOB_INVALID');
      const job=await createJob(db,{userId:user.id,mode:mode(env),key:body.requestKey,draftId:asset.id,cost,resolution:body.resolution,format:body.format,mock:0});
      let provider;try{provider=await reserveProviderJob(db,{jobId:job.id,userId:user.id,mode:mode(env),requestKey:body.requestKey,estimatedCredits:15.644,photoKey:asset.object_key,referenceKey:'assets/7deb9d22ede5-burning-bridges-template-16x9-crop.mp4'});}catch(error){const owned=await sql(db,'SELECT id FROM provider_jobs WHERE job_id=?',job.id).first();if(!owned)await failJob(db,job.id);throw new HttpError(String(error).includes('REQUEST_KEY_REUSED')?409:503,'GENERATION_RESERVE_FAILED');}
      const enqueueToken=crypto.randomUUID(),enqueue=await db.prepare("UPDATE provider_jobs SET enqueue_token=?,enqueue_until=? WHERE id=? AND status='reserved' AND enqueued_at IS NULL AND (enqueue_until IS NULL OR enqueue_until<?) RETURNING id").bind(enqueueToken,Date.now()+90000,provider.id,Date.now()).first();
      if(enqueue){try{await env.GENERATION_QUEUE.send({jobId:job.id});await db.prepare('UPDATE provider_jobs SET enqueue_token=NULL,enqueue_until=NULL,enqueued_at=? WHERE id=? AND enqueue_token=?').bind(Date.now(),provider.id,enqueueToken).run();}catch{await db.batch([sql(db,"UPDATE provider_jobs SET status='failed',enqueue_token=NULL,enqueue_until=NULL,error_code='QUEUE_SEND_FAILED',updated_at=? WHERE id=? AND enqueue_token=?",Date.now(),provider.id,enqueueToken),sql(db,"UPDATE jobs SET status='failed' WHERE id=? AND status IN ('pending','running')",job.id),sql(db,"UPDATE allocations SET refunded=1 WHERE job_id=? AND refunded=0",job.id)]);throw new HttpError(503,'GENERATION_QUEUE_FAILED');}}
      return json({job:summary({...job,mock:0}),providerJobId:provider.id,balance:await balance(db,user.id,mode(env))});
    }
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
    let job=await sql(db,'SELECT j.*,p.status AS provider_status,p.stage,p.audio_status,p.error_code AS provider_error FROM jobs j LEFT JOIN provider_jobs p ON p.job_id=j.id WHERE j.id=? AND j.user_id=? AND j.mode=?',jobMatch[1],user.id,mode(env)).first();
    if(!job) throw new HttpError(404,'JOB_NOT_FOUND');
    if(job.status==='running' && mode(env)==='test' && job.mock && Date.now()-job.created_at>=2500) {
      if(mode(env)!=='test' || !job.mock) throw new HttpError(503,'GENERATION_PAUSED');
      const clip=await env.ASSETS.fetch(new Request(`${url.origin}/assets/6d6c14be4081-burning-bridges-example-1.mp4`));
      if(!clip.ok) {await failJob(db,job.id);job.status='failed';}
      else {await sql(db,"UPDATE jobs SET status='succeeded' WHERE id=? AND status='running'",job.id).run();job.status='succeeded';}
    }
    if(jobMatch[2]&&!job.mock){const provider=await sql(db,'SELECT result_key,status FROM provider_jobs WHERE job_id=?',job.id).first();if(!provider||provider.status!=='succeeded'||!provider.result_key||!env.GENERATION_OUTPUTS)throw new HttpError(409,'RESULT_NOT_READY');const rawRange=request.headers.get('range'),head=await env.GENERATION_OUTPUTS.head?.(provider.result_key),size=Number(head?.size||0);let range;if(rawRange){const m=rawRange.match(/^bytes=(\d*)-(\d*)$/);if(!m||(!m[1]&&!m[2])||!size)throw new HttpError(416,'RANGE_INVALID');let start=m[1]?Number(m[1]):Math.max(0,size-Number(m[2]));let end=m[2]&&m[1]?Number(m[2]):size-1;if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start<0||end<start||start>=size)throw new HttpError(416,'RANGE_INVALID');end=Math.min(end,size-1);range={offset:start,length:end-start+1};}const object=await env.GENERATION_OUTPUTS.get(provider.result_key,range?{range}:undefined);if(!object)throw new HttpError(404,'RESULT_NOT_FOUND');const total=Number(object.size||size);const headers=new Headers();headers.set('Content-Type','video/mp4');headers.set('Cache-Control','private, no-store');headers.set('Content-Disposition',`attachment; filename="burning-bridges-${job.id}.mp4"`);headers.set('Accept-Ranges','bytes');headers.set('Content-Length',String(range?range.length:total));if(range){headers.set('Content-Range',`bytes ${range.offset}-${range.offset+range.length-1}/${total}`);return new Response(object.body,{status:206,headers});}return new Response(object.body,{status:200,headers});}
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
  async queue(batch,env){for(const message of batch.messages){try{const body=message.body||{},jobId=typeof body.jobId==='string'?body.jobId:null;if(!jobId){message.ack?.();continue;}const row=await env.DB.prepare('SELECT id FROM provider_jobs WHERE job_id=?').bind(jobId).first();if(!row){message.ack?.();continue;}const reference=await env.ASSETS.fetch(new Request(`${env.SITE_ORIGIN}/assets/7deb9d22ede5-burning-bridges-template-16x9-crop.mp4`));if(!reference.ok)throw Error('REFERENCE_NOT_FOUND');const referenceBytes=new Uint8Array(await reference.arrayBuffer()),provider=env.PROVIDER_ADAPTER||new ApimartClient({apiKey:env.APIMART_API_KEY});const result=await processProviderJob({db:env.DB,inputs:env.GENERATION_INPUTS,outputs:env.GENERATION_OUTPUTS,assets:{providerJobId:row.id},env,provider,referenceBytes});if(['waiting','busy'].includes(result.status)){if(typeof env.GENERATION_QUEUE?.send==='function'){await env.GENERATION_QUEUE.send({jobId},{delaySeconds:30});message.ack?.();}else{message.retry?.({delaySeconds:30});continue;}}else message.ack?.();}catch{message.retry?.({delaySeconds:30});}}},
};
