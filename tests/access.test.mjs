import test from 'node:test';
import assert from 'node:assert/strict';
import {openDB} from '../scripts/sqlite-db.mjs';
import {digest} from '../src/auth.mjs';
import {applyEvent,balance,createJob} from '../src/commerce.mjs';
import worker from '../src/worker.mjs';
const origin='https://site.example';
function setup() {
  const db=openDB(),now=Date.now(),owner=crypto.randomUUID(),other=crypto.randomUUID(),order=crypto.randomUUID();
  for(const id of [owner,other])db.sqlite.prepare('INSERT INTO users VALUES(?,?,?,?,?,?)').run(id,`${id}@example.test`,'hash','salt',id,now);
  db.sqlite.prepare('INSERT INTO sessions VALUES(?,?,?)').run(digest('a'.repeat(43)),other,now+86400000);
  db.sqlite.prepare('INSERT INTO orders(id,user_id,mode,plan_id,product_id,draft_id,created_at) VALUES(?,?,?,?,?,?,?)').run(order,owner,'test','pack100','PROD_test','',now);
  return {db,owner,other,order,now,env:{DB:db,SITE_ORIGIN:origin,PAYMENT_MODE:'test',GENERATION_MODE:'mock',WAFFO_STORE_ID:'STO_test'},cookie:`__Host-bb_session=${'a'.repeat(43)}`};
}
test('signed-in user cannot read another account order, job or download',async()=>{
  const {db,owner,order,env,cookie,now}=setup(),job=crypto.randomUUID();
  db.sqlite.prepare('INSERT INTO jobs VALUES(?,?,?,?,?,?,?,?,?,?,?)').run(job,owner,'test','key',crypto.randomUUID(),50,'480','Auto','succeeded',1,now);
  for(const path of [`/api/orders/${order}`,`/api/jobs/${job}`,`/api/jobs/${job}/result`]) {const response=await worker.fetch(new Request(origin+path,{headers:{cookie}}),env);assert.equal(response.status,404);assert.equal(response.headers.get('cache-control'),'no-store');}
  db.close();
});
test('API rejects malformed or oversized bodies before account or credit writes',async()=>{
  const {db,env,cookie}=setup();
  for(const [body,status] of [['null',400],['[]',400],['{',400],['x'.repeat(9000),413]]) {
    const response=await worker.fetch(new Request(origin+'/api/jobs',{method:'POST',headers:{origin,'content-type':'application/json',cookie},body}),env);assert.equal(response.status,status);
  }
  assert.equal(db.sqlite.prepare('SELECT COUNT(*) AS n FROM jobs').get().n,0);db.close();
});
test('payment mismatch does not mark event processed so corrected signed delivery can retry',async()=>{
  const {db,owner,order,env}=setup();const e={eventType:'order.completed',eventId:'PAY_test',timestamp:new Date().toISOString(),mode:'test',storeId:'STO_test',data:{orderId:'ORD_test',orderMerchantExternalId:order,merchantProvidedBuyerIdentity:owner,orderMetadata:{orderId:order,userId:owner,planId:'pack100',draftId:''},productMetadata:{planId:'pack100'},orderStatus:'completed',paymentStatus:'succeeded',paymentId:'PAY_test',currency:'USD',chargedAmount:'9.90',listPrice:{subtotal:'0.01'}}};
  await assert.rejects(()=>applyEvent(db,e,env));assert.equal(db.sqlite.prepare('SELECT COUNT(*) AS n FROM events').get().n,0);
  e.data.listPrice.subtotal='9.90';await applyEvent(db,e,env);assert.equal(await balance(db,owner,'test'),100);db.close();
});
test('FIFO allocation spans multiple lots and two competing jobs cannot overspend',async()=>{
  const {db,owner,order,now}=setup();
  for(const [id,expiry] of [['first',now+100000],['second',now+200000]]) {
    db.sqlite.prepare('INSERT INTO receipts VALUES(?,?,?,?,?,?,?)').run(id,order,1,`PAY_${id}`,990,0,now);
    db.sqlite.prepare('INSERT INTO lots VALUES(?,?,?,?,?,?,?,?,?,?,?,?)').run(id,order,id,owner,'test',100,100,0,now,expiry,0,now);
  }
  const draftId=crypto.randomUUID();
  const request={userId:owner,mode:'test',key:crypto.randomUUID(),draftId,cost:150,resolution:'720',format:'Auto'};
  const first=await createJob(db,request,now);
  assert.deepEqual(db.sqlite.prepare('SELECT lot_id,cost FROM allocations WHERE job_id=? ORDER BY lot_id').all(first.id).map(x=>({...x})),[{lot_id:'first',cost:100},{lot_id:'second',cost:50}]);
  await assert.rejects(()=>createJob(db,{...request,key:crypto.randomUUID()},now));assert.equal(await balance(db,owner,'test',now),50);db.close();
});
