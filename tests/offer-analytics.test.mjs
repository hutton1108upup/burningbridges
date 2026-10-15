import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source=readFileSync(new URL('../public/analytics.js',import.meta.url),'utf8');
const origin='https://burningbridgesaivideo.pro';
function storage() {const data=new Map();return {getItem:key=>data.get(key)||null,setItem:(key,value)=>data.set(key,value),removeItem:key=>data.delete(key)};}
function run(path='/',shared={session:storage(),local:storage()}) {
  const window={sessionStorage:shared.session,localStorage:shared.local};
  const context=vm.createContext({window,URL,Date,location:new URL(origin+path),document:{referrer:origin+'/?email=private@example.test',head:{append(){}},createElement:()=>({})}});
  vm.runInContext(source,context);
  return {api:window.BBAnalytics,shared,window,events:()=>Array.from(window.dataLayer).filter(args=>args[0]==='event').map(args=>JSON.parse(JSON.stringify({name:args[1],params:args[2]})))};
}
const id='11111111-1111-4111-8111-111111111111';
const paid={mode:'prod',credited:true,order:{id},analytics:{transaction_id:id+':1',item_id:'pack100',item_name:'100 credits',value:9.4,currency:'USD'}};

test('offer tracking strips unapproved data and reports real surface, trigger and close reason',()=>{
  const app=run('/?email=private@example.test#secret');
  app.api.offer('view',{surface:'modal',trigger:'exit_top',email:'private@example.test',filename:'secret-photo.png'});
  app.api.offer('close',{surface:'modal',trigger:'exit_top',reason:'escape'});
  app.api.offer('click',{surface:'modal',trigger:'exit_top'});
  assert.deepEqual(app.events().map(e=>e.name),['offer_view','offer_close','offer_click']);
  assert.equal(app.events()[1].params.close_method,'escape');
  assert.equal(app.events()[2].params.destination_path,'/pricing');
  assert.equal(app.events()[0].params.page_location,origin+'/');
  assert.equal(app.events()[0].params.page_referrer,origin+'/');
  assert.doesNotMatch(JSON.stringify(app.events()),/private@|secret-photo|#secret|email=/);
});

test('pricing visit and confirmed purchase carry the clicked offer across documents',()=>{
  const landing=run('/examples');landing.api.offer('view',{surface:'teaser',trigger:'scroll_up'});landing.api.offer('open',{surface:'teaser',trigger:'scroll_up'});landing.api.offer('click',{surface:'modal',trigger:'teaser_click'});
  const pricing=run('/pricing',landing.shared);
  assert.equal(pricing.events()[0].name,'pricing_view');
  assert.equal(pricing.events()[0].params.offer_engagement,'clicked');
  assert.equal(pricing.events()[0].params.offer_source_path,'/examples');
  pricing.api.purchase(paid);
  assert.deepEqual(pricing.events().map(e=>e.name),['pricing_view','purchase']);
  assert.equal(pricing.events()[1].params.value,9.4);
  assert.equal(pricing.events()[1].params.offer_engagement,'clicked');
  assert.equal(pricing.events()[1].params.transaction_id,id+':1');
});

test('pending/test/refunded or malformed receipt data cannot emit purchase; confirmed receipts deduplicate across reloads',()=>{
  const app=run('/pricing');
  for(const data of [{...paid,credited:false},{...paid,mode:'test'},{...paid,analytics:null},{...paid,analytics:{...paid.analytics,value:0}},{...paid,analytics:{...paid.analytics,transaction_id:'secret-token'}},{...paid,order:{id:'different-user'}}])app.api.purchase(data);
  assert.equal(app.events().filter(e=>e.name==='purchase').length,0);
  app.api.purchase(paid);app.api.purchase(paid);
  assert.equal(app.events().filter(e=>e.name==='purchase').length,1);
  const reload=run('/pricing',app.shared);reload.api.purchase(paid);
  assert.equal(reload.events().filter(e=>e.name==='purchase').length,0);
});

test('no offer interaction and expired attribution remain in the none cohort',()=>{
  assert.equal(run('/pricing').events()[0].params.offer_engagement,'none');
  const app=run('/');app.api.offer('click',{surface:'modal',trigger:'exit_top'});
  const saved=JSON.parse(app.shared.session.getItem('bb:offer-attribution:v1'));saved.at=Date.now()-31*60000;
  app.shared.session.setItem('bb:offer-attribution:v1',JSON.stringify(saved));
  assert.equal(run('/pricing',app.shared).events()[0].params.offer_engagement,'none');
});

test('blocked storage and analytics errors cannot interrupt navigation or payment UI',()=>{
  const denied={getItem(){throw Error('denied');},setItem(){throw Error('denied');}};
  const app=run('/pricing',{session:denied,local:denied});
  assert.doesNotThrow(()=>app.api.offer('click',{surface:'modal',trigger:'exit_top'}));
  app.window.gtag=()=>{throw Error('blocked tag');};
  assert.doesNotThrow(()=>app.api.purchase(paid));
});
