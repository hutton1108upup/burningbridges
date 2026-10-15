import test from 'node:test';
import assert from 'node:assert/strict';
import {openDB} from '../scripts/sqlite-db.mjs';
import {digest} from '../src/auth.mjs';
import {applyEvent} from '../src/commerce.mjs';
import worker from '../src/worker.mjs';
const origin='https://site.example';

test('order analytics uses authenticated confirmed receipt amount, excludes pending/test/revoked payments and never returns provider credentials',async()=>{
  for(const mode of ['prod','test']) {
    const db=openDB(),now=Date.now(),owner=crypto.randomUUID(),order=crypto.randomUUID(),token='b'.repeat(43);
    const env={DB:db,SITE_ORIGIN:origin,PAYMENT_MODE:mode,GENERATION_MODE:'mock',WAFFO_STORE_ID:'STO_test'};
    db.sqlite.prepare('INSERT INTO users VALUES(?,?,?,?,?,?)').run(owner,'private@example.test','hash','salt','recovery',now);
    db.sqlite.prepare('INSERT INTO sessions VALUES(?,?,?)').run(digest(token),owner,now+86400000);
    db.sqlite.prepare('INSERT INTO orders(id,user_id,mode,plan_id,product_id,draft_id,created_at) VALUES(?,?,?,?,?,?,?)').run(order,owner,mode,'pack100','PROD_test','',now);
    const read=async()=>{const response=await worker.fetch(new Request(origin+`/api/orders/${order}`,{headers:{cookie:`__Host-bb_session=${token}`}}),env);assert.equal(response.status,200);return response.json();};
    try {
      assert.equal((await read()).analytics,null);
      await applyEvent(db,{eventType:'order.completed',eventId:'confirmed-payment',timestamp:new Date(now).toISOString(),mode,storeId:'STO_test',data:{orderId:'ORD_test',orderMerchantExternalId:order,merchantProvidedBuyerIdentity:owner,orderMetadata:{orderId:order,userId:owner,planId:'pack100',draftId:''},productMetadata:{planId:'pack100'},orderStatus:'completed',paymentStatus:'succeeded',paymentId:'PAY_do_not_expose',currency:'USD',chargedAmount:'9.40',listPrice:{subtotal:'9.90'}}},env,now);
      const data=await read();assert.equal(data.credited,true);
      if(mode==='prod') {
        assert.deepEqual(data.analytics,{transaction_id:order+':1',currency:'USD',value:9.4,item_id:'pack100',item_name:'100 credits'});
        assert.doesNotMatch(JSON.stringify(data.analytics),/private@|PAY_do_not_expose|buyer|password/);
      } else assert.equal(data.analytics,null);
      db.sqlite.prepare('UPDATE lots SET revoked=1 WHERE order_id=?').run(order);
      assert.equal((await read()).analytics,null);
    } finally {db.close();}
  }
});
