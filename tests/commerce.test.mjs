import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync,sign} from 'node:crypto';
import {openDB} from '../scripts/sqlite-db.mjs';
import {PLANS} from '../src/catalog.mjs';
import {applyEvent,balance,createJob,failJob,sql} from '../src/commerce.mjs';
import worker from '../src/worker.mjs';
const now=Date.now(),userId='user-one',orderId='order-one',draftId=crypto.randomUUID();
function setup(planId='pack100') {
  const db=openDB();
  db.sqlite.prepare('INSERT INTO users VALUES(?,?,?,?,?,?)').run(userId,'one@example.test','hash','salt','recovery',now);
  db.sqlite.prepare('INSERT INTO orders(id,user_id,mode,plan_id,product_id,draft_id,created_at) VALUES(?,?,?,?,?,?,?)').run(orderId,userId,'test',planId,'PROD_test',draftId,now);
  return db;
}
const env={PAYMENT_MODE:'test',WAFFO_STORE_ID:'STO_test'};
function event(planId='pack100',type='order.completed',period=1) {
  const plan=PLANS[planId],price=(plan.cents/100).toFixed(2);
  return {eventId:`event-${type}-${period}`,eventType:type,mode:'test',storeId:'STO_test',timestamp:new Date(now).toISOString(),data:{orderId:'ORD_test',orderMerchantExternalId:orderId,merchantProvidedBuyerIdentity:userId,orderStatus:plan.kind==='monthly'?'active':'completed',paymentStatus:'succeeded',paymentId:`PAY_test${period}`,chargedAmount:price,currency:'USD',listPrice:{subtotal:price},planPrice:{subtotal:price},orderMetadata:{orderId,userId,planId,draftId},productMetadata:{planId},periodNumber:period,billingPeriod:'monthly',currentPeriodStart:new Date(now).toISOString(),currentPeriodEnd:new Date(now+30*86400000).toISOString()}};
}
const job=key=>({userId,mode:'test',key:key||crypto.randomUUID(),draftId,cost:50,resolution:'480',format:'Auto'});
test('verified one-time order grants once, including duplicate business delivery',async()=>{
  const db=setup(),payload=event();await applyEvent(db,payload,env,now);await applyEvent(db,payload,env,now);payload.eventId='retry-another-envelope';await applyEvent(db,payload,env,now);
  assert.equal(await balance(db,userId,'test',now),100);assert.equal(await balance(db,userId,'prod',now),0);db.close();
});
test('wrong mode, store, currency, price, user, draft, product or status never grants',async()=>{
  const changes=[e=>e.mode='prod',e=>e.storeId='STO_other',e=>e.data.currency='EUR',e=>e.data.listPrice.subtotal='0.01',e=>e.data.merchantProvidedBuyerIdentity='attacker',e=>e.data.orderMetadata.draftId='other',e=>e.data.productMetadata.planId='studio',e=>e.data.paymentStatus='failed',e=>e.data.chargedAmount='0.00'];
  for(const change of changes) {const db=setup(),payload=event();change(payload);await assert.rejects(()=>applyEvent(db,payload,env,now));assert.equal(await balance(db,userId,'test',now),0);db.close();}
});
test('monthly receipt and period join works with either delivery order, no double grant',async()=>{
  for(const reversed of [false,true]) {
    const db=setup('starter'),receipt=event('starter','subscription.payment_succeeded'),period=event('starter','subscription.activated');
    const first=reversed?period:receipt,second=reversed?receipt:period;
    await applyEvent(db,first,env,now);assert.equal(await balance(db,userId,'test',now),0);
    await applyEvent(db,second,env,now);assert.equal(await balance(db,userId,'test',now),400);
    await applyEvent(db,receipt,env,now);await applyEvent(db,period,env,now);assert.equal(await balance(db,userId,'test',now),400);db.close();
  }
});
test('renewals require a matching paid period and expire at the actual period end',async()=>{
  const db=setup('starter');await applyEvent(db,event('starter','subscription.payment_succeeded'),env,now);await applyEvent(db,event('starter','subscription.activated'),env,now);
  const renewal=event('starter','subscription.renewed',2);renewal.data.currentPeriodStart=new Date(now+30*86400000).toISOString();renewal.data.currentPeriodEnd=new Date(now+60*86400000).toISOString();
  await applyEvent(db,renewal,env,now);assert.equal(await balance(db,userId,'test',now),400);
  await applyEvent(db,event('starter','subscription.payment_succeeded',2),env,now);assert.equal(await balance(db,userId,'test',now),400);assert.equal(await balance(db,userId,'test',now+31*86400000),400);
  assert.equal(await balance(db,userId,'test',now+61*86400000),0);db.close();
});
test('unknown or abandoned checkout has no credits; changing redirect query is ineffective',async()=>{
  const db=setup();assert.equal(await balance(db,userId,'test',now),0);
  const response=await worker.fetch(new Request('https://site.example/api/orders/order-one?success=true'),{DB:db,...env});assert.equal(response.status,401);assert.equal(await balance(db,userId,'test',now),0);db.close();
});
test('credit allocation is FIFO, atomic, and insufficient funds leaves no partial job',async()=>{
  const db=setup();await applyEvent(db,event(),env,now);await createJob(db,job(),now);assert.equal(await balance(db,userId,'test',now),50);
  await assert.rejects(()=>createJob(db,{...job(),cost:100,resolution:'720'},now),e=>e.code==='INSUFFICIENT_CREDITS');assert.equal(await balance(db,userId,'test',now),50);
  assert.equal(db.sqlite.prepare('SELECT COUNT(*) AS n FROM jobs').get().n,1);db.close();
});
test('retries with same request key do not spend twice; changing settings is rejected',async()=>{
  const db=setup();await applyEvent(db,event(),env,now);const request=job(),first=await createJob(db,request,now),retry=await createJob(db,request,now);assert.equal(first.id,retry.id);assert.equal(await balance(db,userId,'test',now),50);
  await assert.rejects(()=>createJob(db,{...request,format:'9:16'},now),e=>e.code==='REQUEST_KEY_REUSED');db.close();
});
test('expired credits cannot fund a job',async()=>{
  const db=setup();await applyEvent(db,event(),env,now);await assert.rejects(()=>createJob(db,job(),now+31*86400000));assert.equal(await balance(db,userId,'test',now+31*86400000),0);db.close();
});
test('failed job returns credits exactly once; successful job is not refunded',async()=>{
  const db=setup();await applyEvent(db,event(),env,now);const first=await createJob(db,job(),now);await failJob(db,first.id);await failJob(db,first.id);assert.equal(await balance(db,userId,'test',now),100);
  const second=await createJob(db,job(),now);await sql(db,"UPDATE jobs SET status='succeeded' WHERE id=?",second.id).run();await failJob(db,second.id);assert.equal(await balance(db,userId,'test',now),50);db.close();
});
test('partial and full refunds remove unused credits proportionately and idempotently',async()=>{
  const db=setup();await applyEvent(db,event(),env,now);
  const partial=event('pack100','refund.succeeded');partial.eventId='RFD_partial';partial.data.refundStatus='succeeded';partial.data.refundedAmount='4.95';partial.data.originalChargedAmount='9.90';await applyEvent(db,partial,env,now);await applyEvent(db,partial,env,now);assert.equal(await balance(db,userId,'test',now),50);
  const full=structuredClone(partial);full.eventId='RFD_remaining';await applyEvent(db,full,env,now);assert.equal(await balance(db,userId,'test',now),0);db.close();
});
test('refund of used credits cannot mint funds when a job later fails',async()=>{
  const db=setup();await applyEvent(db,event(),env,now);const first=await createJob(db,job(),now);const refund=event('pack100','refund.succeeded');refund.data.refundStatus='succeeded';refund.data.refundedAmount='9.90';refund.data.originalChargedAmount='9.90';await applyEvent(db,refund,env,now);await failJob(db,first.id);assert.equal(await balance(db,userId,'test',now),0);db.close();
});
test('partial refund delivered before monthly period cannot grant full credits later',async()=>{
  const db=setup('starter');await applyEvent(db,event('starter','subscription.payment_succeeded'),env,now);
  const refund=event('starter','refund.succeeded');refund.data.refundStatus='succeeded';refund.data.refundedAmount='9.50';refund.data.originalChargedAmount='19.00';
  await applyEvent(db,refund,env,now);await applyEvent(db,event('starter','subscription.activated'),env,now);
  assert.equal(await balance(db,userId,'test',now),200);db.close();
});
test('account signup/login/recovery/logout and private order access',async()=>{
  const db=openDB(),base='https://site.example',settings={DB:db,SITE_ORIGIN:base,...env},password=`test-${crypto.randomUUID()}`;
  const post=(path,body,cookie='')=>worker.fetch(new Request(base+path,{method:'POST',headers:{origin:base,'content-type':'application/json',cookie},body:JSON.stringify(body)}),settings);
  const signup=await post('/api/auth/signup',{email:'account@example.test',password});assert.equal(signup.status,200);const info=await signup.json(),cookie=signup.headers.get('set-cookie').split(';')[0];assert.match(signup.headers.get('set-cookie'),/HttpOnly/);assert.match(signup.headers.get('set-cookie'),/Secure/);
  const signed=await worker.fetch(new Request(base+'/api/session',{headers:{cookie}}),settings);assert.equal((await signed.json()).user.email,'account@example.test');
  const wrong=await post('/api/auth/signin',{email:'account@example.test',password:crypto.randomUUID()});assert.equal(wrong.status,401);
  const csrf=await worker.fetch(new Request(base+'/api/auth/logout',{method:'POST',headers:{origin:'https://attacker.example','content-type':'application/json',cookie},body:'{}'}),settings);assert.equal(csrf.status,403);
  const recovered=await post('/api/auth/recover',{code:info.recovery,password:crypto.randomUUID()});assert.equal(recovered.status,200);
  const previous=await worker.fetch(new Request(base+'/api/session',{headers:{cookie}}),settings);assert.equal((await previous.json()).user,null);
  const newCookie=recovered.headers.get('set-cookie').split(';')[0];assert.equal((await post('/api/auth/logout',{},newCookie)).status,200);db.close();
});
test('signed webhook is verified as raw text; invalid/stale/future/other environment rejected',async()=>{
  const db=setup(),keys=generateKeyPairSync('rsa',{modulusLength:2048}),publicKey=keys.publicKey.export({type:'spki',format:'pem'}),payload=event(),raw=JSON.stringify(payload),stamp=String(Date.now());
  const header=(text,time=stamp)=>`t=${time},v1=${sign('sha256',Buffer.from(`${time}.${text}`),keys.privateKey).toString('base64')}`;
  const send=(text,signature)=>worker.fetch(new Request('https://site.example/api/waffo/webhook',{method:'POST',headers:{'x-waffo-signature':signature},body:text}),{DB:db,...env,WAFFO_WEBHOOK_PUBLIC_KEY:publicKey});
  assert.equal((await send(raw,header(raw))).status,200);assert.equal(await balance(db,userId,'test'),100);
  assert.equal((await send(raw+' ',header(raw))).status,401);
  assert.equal((await send(raw,header(raw,String(Date.now()-3600000)))).status,401);
  assert.equal((await send(raw,header(raw,String(Date.now()+120000)))).status,401);
  const prod=JSON.stringify({...payload,mode:'prod'});assert.equal((await send(prod,header(prod))).status,400);db.close();
});
test('mock generation refuses production credits even with a logged-in user',async()=>{
  const db=setup();await applyEvent(db,event(),env,now);await sql(db,'INSERT INTO sessions VALUES(?,?,?)',(await import('../src/auth.mjs')).digest('a'.repeat(43)),userId,now+86400000).run();
  const response=await worker.fetch(new Request('https://site.example/api/jobs',{method:'POST',headers:{origin:'https://site.example','content-type':'application/json',cookie:`__Host-bb_session=${'a'.repeat(43)}`},body:JSON.stringify(job())}),{DB:db,SITE_ORIGIN:'https://site.example',PAYMENT_MODE:'prod',GENERATION_MODE:'mock'});assert.equal(response.status,503);db.close();
});
