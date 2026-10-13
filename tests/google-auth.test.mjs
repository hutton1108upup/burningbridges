import test from 'node:test';
import assert from 'node:assert/strict';
import {createHmac,generateKeyPairSync,sign} from 'node:crypto';
import {openDB} from '../scripts/sqlite-db.mjs';
import {digest,userFrom} from '../src/auth.mjs';
import worker from '../src/worker.mjs';

const origin='https://site.example';
const authSecret='local-test-auth-secret-only-0123456789abcdef';
const attemptToken='a'.repeat(43),googleToken='google-session-token';
function setup() {
  const db=openDB();
  return {db,env:{DB:db,SITE_ORIGIN:origin,PAYMENT_MODE:'test',GENERATION_MODE:'mock',GOOGLE_LOGIN_ENABLED:'true',GOOGLE_CLIENT_ID:'test.apps.googleusercontent.com',GOOGLE_CLIENT_SECRET:'local-test-only',BETTER_AUTH_SECRET:authSecret}};
}
function post(env,body={}) {
  return worker.fetch(new Request(origin+'/api/auth/google/start',{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify(body)}),env);
}
function seedGoogle(db,{existing=false,linked=false,verified=true,link=false,old=false}={}) {
  const now=Date.now(),email='person@example.com';
  if(existing)db.sqlite.prepare('INSERT INTO users VALUES(?,?,?,?,?,?)').run('original',email,'x'.repeat(128),'salt','recovery',now);
  db.sqlite.prepare('INSERT INTO google_auth_user VALUES(?,?,?,?,?,?,?)').run('google-user','Person',email,Number(verified),null,now,now);
  db.sqlite.prepare('INSERT INTO google_auth_account(id,account_id,provider_id,user_id,created_at,updated_at) VALUES(?,?,?,?,?,?)').run('account','google-sub','google','google-user',now,now);
  db.sqlite.prepare('INSERT INTO google_auth_session(id,token,expires_at,created_at,updated_at,user_id) VALUES(?,?,?,?,?,?)').run('session',googleToken,now+600000,old?now-10000:now,now,'google-user');
  db.sqlite.prepare('INSERT INTO google_login_attempts VALUES(?,?,?,?)').run(digest(attemptToken),link?'original':null,'/pricing',now+599000);
  if(linked)db.sqlite.prepare('INSERT INTO google_identities VALUES(?,?,?)').run('google-user','original',now);
  let cookie=`__Host-bb_google_attempt=${attemptToken}; __Secure-bb_google.session_token=${encodeURIComponent(googleToken+'.'+createHmac('sha256',authSecret).update(googleToken).digest('base64'))}`;
  if(link){db.sqlite.prepare('INSERT INTO sessions VALUES(?,?,?)').run(digest('b'.repeat(43)),'original',now+600000);cookie+=`; __Host-bb_session=${'b'.repeat(43)}`;}
  return cookie;
}
const complete=(env,cookie)=>worker.fetch(new Request(origin+'/api/auth/google/complete',{headers:{cookie}}),env);
test('Google is disabled without explicit complete configuration and start rejects CSRF',async()=>{
  const {db,env}=setup();delete env.GOOGLE_CLIENT_SECRET;
  assert.equal((await (await worker.fetch(new Request(origin+'/api/session'),env)).json()).googleLoginEnabled,false);
  assert.equal((await post(env)).status,503);
  assert.equal(db.sqlite.prepare('SELECT COUNT(*) AS n FROM google_login_attempts').get().n,0);
  assert.equal((await worker.fetch(new Request(origin+'/api/auth/google/start',{method:'POST',headers:{origin:'https://evil.example','content-type':'application/json'},body:'{}'}),env)).status,403);db.close();
});
test('Better Auth creates the Google authorization URL with state and an owned callback',async()=>{
  const {db,env}=setup(),response=await post(env,{returnPath:'https://evil.example'});
  assert.equal(response.status,200);const url=new URL((await response.json()).url);
  assert.equal(url.origin,'https://accounts.google.com');assert(url.searchParams.get('state'));
  assert.equal(url.searchParams.get('redirect_uri'),origin+'/api/oauth/callback/google');
  assert.equal(db.sqlite.prepare('SELECT return_path FROM google_login_attempts').get().return_path,'/');
  assert(response.headers.getSetCookie().some(cookie=>cookie.startsWith('__Host-bb_google_attempt=')));
  assert.equal((await worker.fetch(new Request(origin+'/api/oauth/get-session'),env)).status,404);db.close();
});
test('verified Google identity becomes a private application session and cannot replay',async()=>{
  const {db,env}=setup(),cookie=seedGoogle(db),response=await complete(env,cookie);
  assert.equal(new URL(response.headers.get('location')).searchParams.get('auth_success'),'google');
  const appCookie=response.headers.getSetCookie().find(value=>value.startsWith('__Host-bb_session='));assert(appCookie);
  const user=await userFrom(new Request(origin,{headers:{cookie:appCookie.split(';')[0]}}),db);assert.equal(user.email,'person@example.com');
  assert.equal(new URL((await complete(env,cookie)).headers.get('location')).searchParams.get('auth_error'),'GOOGLE_LOGIN_EXPIRED');
  db.close();
});
test('existing email is not silently merged; explicit signed-in linking preserves user and order IDs',async()=>{
  for(const link of [false,true]) {
    const {db,env}=setup(),cookie=seedGoogle(db,{existing:true,link});
    db.sqlite.prepare('INSERT INTO orders(id,user_id,mode,plan_id,product_id,created_at) VALUES(?,?,?,?,?,?)').run('order','original','test','pack100','PROD_test',Date.now());
    const response=await complete(env,cookie),target=new URL(response.headers.get('location'));
    assert.equal(target.searchParams.get(link?'auth_success':'auth_error'),link?'linked':'GOOGLE_ACCOUNT_LINK_REQUIRED');
    assert.equal(db.sqlite.prepare('SELECT COUNT(*) AS n FROM users').get().n,1);
    assert.equal(db.sqlite.prepare('SELECT user_id FROM orders').get().user_id,'original');
    if(link)assert.equal(db.sqlite.prepare('SELECT user_id FROM google_identities').get().user_id,'original');db.close();
  }
});
test('unverified identity, stale auth session and expired or missing attempts cannot create app sessions',async()=>{
  for(const variant of ['unverified','old','expired','missing']) {
    const {db,env}=setup(),cookie=seedGoogle(db,{verified:variant!=='unverified',old:variant==='old'});
    if(variant==='expired')db.sqlite.prepare('UPDATE google_login_attempts SET expires_at=?').run(Date.now()-1);
    if(variant==='missing')db.sqlite.prepare('DELETE FROM google_login_attempts').run();
    const response=await complete(env,cookie);assert(new URL(response.headers.get('location')).searchParams.has('auth_error'));
    assert.equal(db.sqlite.prepare('SELECT COUNT(*) AS n FROM sessions').get().n,0);assert.equal(db.sqlite.prepare('SELECT COUNT(*) AS n FROM users').get().n,0);db.close();
  }
});
test('linked Google sign-in reuses the original user ID',async()=>{
  const {db,env}=setup(),cookie=seedGoogle(db,{existing:true,linked:true}),response=await complete(env,cookie);
  assert.equal(new URL(response.headers.get('location')).searchParams.get('auth_success'),'google');
  assert.equal(db.sqlite.prepare('SELECT user_id FROM sessions').get().user_id,'original');
  const appCookie=response.headers.getSetCookie().find(value=>value.startsWith('__Host-bb_session=')).split(';')[0];
  const appSession=await (await worker.fetch(new Request(origin+'/api/session',{headers:{cookie:appCookie}}),env)).json();
  assert.equal(appSession.googleLinked,true);db.close();
});
test('Google linking rejects a changed application session or a different email',async()=>{
  for(const changedSession of [true,false]) {
    const {db,env}=setup();let cookie=seedGoogle(db,{existing:true,link:true});
    if(changedSession)cookie=cookie.replace(/; __Host-bb_session=[^;]+/,'');
    else db.sqlite.prepare('UPDATE users SET email=? WHERE id=?').run('different@example.com','original');
    const response=await complete(env,cookie);
    assert.equal(new URL(response.headers.get('location')).searchParams.get('auth_error'),changedSession?'GOOGLE_LINK_SESSION_CHANGED':'GOOGLE_EMAIL_MISMATCH');
    assert.equal(db.sqlite.prepare('SELECT COUNT(*) AS n FROM google_identities').get().n,0);db.close();
  }
});
test('callback host and invalid OAuth state cannot grant application sessions',async()=>{
  const {db,env}=setup();
  assert.equal((await worker.fetch(new Request('https://evil.example/api/auth/google/complete'),env)).status,403);
  const callback=await worker.fetch(new Request(origin+'/api/oauth/callback/google?code=fake&state=invalid'),env);
  assert.equal(callback.status,302);assert(new URL(callback.headers.get('location')).searchParams.has('error'));
  assert.equal(db.sqlite.prepare('SELECT COUNT(*) AS n FROM sessions').get().n,0);db.close();
});
test('full Google callback runs through Better Auth with mocked provider, without contacting Google',async()=>{
  const {db,env}=setup(),jar=new Map();
  const collect=response=>{for(const header of response.headers.getSetCookie()){const pair=header.split(';')[0],index=pair.indexOf('=');jar.set(pair.slice(0,index),pair.slice(index+1));}};
  const start=await post(env);collect(start);const url=new URL((await start.json()).url);
  const {privateKey,publicKey}=generateKeyPairSync('rsa',{modulusLength:2048});
  const jwk={...publicKey.export({format:'jwk'}),kid:'test-google-key',alg:'RS256',use:'sig'};
  const encode=value=>Buffer.from(JSON.stringify(value)).toString('base64url');
  const claims={iss:'https://accounts.google.com',aud:env.GOOGLE_CLIENT_ID,sub:'real-provider-sub',email:'new@example.com',email_verified:true,name:'Person',iat:Math.floor(Date.now()/1000),exp:Math.floor(Date.now()/1000)+600};
  const unsigned=encode({alg:'RS256',kid:jwk.kid})+'.'+encode(claims),idToken=unsigned+'.'+sign('RSA-SHA256',Buffer.from(unsigned),privateKey).toString('base64url');
  const originalFetch=globalThis.fetch;
  globalThis.fetch=async input=>{
    const target=typeof input==='string'?input:input.url||String(input);
    if(target==='https://oauth2.googleapis.com/token')return Response.json({access_token:'test-access-token',token_type:'Bearer',expires_in:600,id_token:idToken});
    if(target==='https://www.googleapis.com/oauth2/v3/certs')return Response.json({keys:[jwk]});
    throw Error('Unexpected external call: '+target);
  };
  try {
    const cookie=()=>[...jar].map(([key,value])=>key+'='+value).join('; ');
    const callback=await worker.fetch(new Request(origin+'/api/oauth/callback/google?code=test-code&state='+encodeURIComponent(url.searchParams.get('state')),{headers:{cookie:cookie()}}),env);collect(callback);
    assert.equal(callback.status,302);assert.equal(callback.headers.get('location'),origin+'/api/auth/google/complete');
    const finished=await complete(env,cookie());assert.equal(new URL(finished.headers.get('location')).searchParams.get('auth_success'),'google');
    assert.equal(db.sqlite.prepare('SELECT email FROM users').get().email,'new@example.com');
  } finally {globalThis.fetch=originalFetch;db.close();}
});
