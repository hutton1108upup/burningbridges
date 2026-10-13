import {betterAuth} from 'better-auth/minimal';
import {drizzleAdapter} from 'better-auth/adapters/drizzle';
import {drizzle} from 'drizzle-orm/d1';
import * as schema from './google-schema.mjs';
import {digest,secret,userFrom,loginSession,rateLimit} from './auth.mjs';
import {HttpError,sql} from './commerce.mjs';

export function googleEnabled(env) {
  return env.GOOGLE_LOGIN_ENABLED==='true' && typeof env.GOOGLE_CLIENT_ID==='string' && env.GOOGLE_CLIENT_ID.endsWith('.apps.googleusercontent.com') && Boolean(env.GOOGLE_CLIENT_SECRET) && typeof env.BETTER_AUTH_SECRET==='string' && env.BETTER_AUTH_SECRET.length>=32;
}
export function googleAuth(env) {
  if(!googleEnabled(env))throw new HttpError(503,'GOOGLE_LOGIN_UNAVAILABLE');
  return betterAuth({
    appName:'Burning Bridges',baseURL:env.SITE_ORIGIN,basePath:'/api/oauth',secret:env.BETTER_AUTH_SECRET,
    trustedOrigins:[env.SITE_ORIGIN],database:drizzleAdapter(drizzle(env.DB,{schema}),{provider:'sqlite',schema}),
    emailAndPassword:{enabled:false},account:{accountLinking:{enabled:false},encryptOAuthTokens:true},
    socialProviders:{google:{clientId:env.GOOGLE_CLIENT_ID,clientSecret:env.GOOGLE_CLIENT_SECRET,prompt:'select_account',accessType:'online'}},
    session:{expiresIn:600,cookieCache:{enabled:false}},advanced:{cookiePrefix:'bb_google'},
    logger:{disabled:true},
  });
}
const attemptCookieName=request=>new URL(request.url).protocol==='https:'?'__Host-bb_google_attempt':'bb_google_attempt';
function attemptCookie(request,value,maxAge=600) {
  return `${attemptCookieName(request)}=${value}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAge}${new URL(request.url).protocol==='https:'?'; Secure':''}`;
}
function attemptToken(request) {
  return (request.headers.get('cookie')||'').split(';').map(part=>part.trim()).find(part=>part.startsWith(`${attemptCookieName(request)}=`))?.split('=')[1];
}
export async function startGoogle(request,env,body) {
  const auth=googleAuth(env);
  await rateLimit(env.DB,`google:${request.headers.get('cf-connecting-ip')||'local'}`,15,600000);
  const linking=body.link===true;
  const user=linking?await userFrom(request,env.DB):null;
  if(linking && !user)throw new HttpError(401,'SIGN_IN_REQUIRED');
  const returnPath=['/','/pricing','/#burning-bridges-ai-generator'].includes(body.returnPath)?body.returnPath:'/';
  const token=secret(),now=Date.now();
  await sql(env.DB,'DELETE FROM google_login_attempts WHERE expires_at<?',now).run();
  await sql(env.DB,'INSERT INTO google_login_attempts(token_hash,user_id,return_path,expires_at) VALUES(?,?,?,?)',digest(token),user?.id||null,returnPath,now+600000).run();
  const response=await auth.handler(new Request(`${env.SITE_ORIGIN}/api/oauth/sign-in/social`,{
    method:'POST',headers:request.headers,body:JSON.stringify({provider:'google',callbackURL:`${env.SITE_ORIGIN}/api/auth/google/complete`,errorCallbackURL:`${env.SITE_ORIGIN}/?auth_error=GOOGLE_LOGIN_FAILED`}),
  }));
  const headers=new Headers(response.headers);headers.append('Set-Cookie',attemptCookie(request,token));headers.set('Cache-Control','no-store');
  return new Response(response.body,{status:response.status,headers});
}
export async function completeGoogle(request,env) {
  const headers=new Headers({'Cache-Control':'no-store'});headers.append('Set-Cookie',attemptCookie(request,'',0));
  let returnPath='/';
  try {
    const token=attemptToken(request);
    if(!/^[A-Za-z0-9_-]{43}$/.test(token||''))throw new HttpError(400,'GOOGLE_LOGIN_EXPIRED');
    // DELETE RETURNING consumes this browser's attempt atomically, preventing replay.
    const attempt=await sql(env.DB,'DELETE FROM google_login_attempts WHERE token_hash=? RETURNING *',digest(token)).first();
    if(!attempt || attempt.expires_at<=Date.now())throw new HttpError(400,'GOOGLE_LOGIN_EXPIRED');
    returnPath=attempt.return_path;
    const authenticated=await googleAuth(env).api.getSession({headers:request.headers});
    const identity=authenticated?.user;
    if(!identity?.emailVerified || !identity.email || !authenticated.session || new Date(authenticated.session.createdAt).getTime()<attempt.expires_at-600000)throw new HttpError(401,'GOOGLE_LOGIN_FAILED');
    const googleAccount=await sql(env.DB,"SELECT account_id FROM google_auth_account WHERE user_id=? AND provider_id='google'",identity.id).first();
    if(!googleAccount)throw new HttpError(401,'GOOGLE_LOGIN_FAILED');
    const email=identity.email.trim().toLowerCase();
    const mapped=await sql(env.DB,'SELECT user_id FROM google_identities WHERE auth_user_id=?',identity.id).first();
    let userId=mapped?.user_id;
    if(attempt.user_id) {
      const current=await userFrom(request,env.DB);
      if(!current || current.id!==attempt.user_id)throw new HttpError(401,'GOOGLE_LINK_SESSION_CHANGED');
      if(current.email!==email)throw new HttpError(409,'GOOGLE_EMAIL_MISMATCH');
      if(userId && userId!==current.id)throw new HttpError(409,'GOOGLE_ACCOUNT_ALREADY_LINKED');
      if(!userId)await sql(env.DB,'INSERT INTO google_identities(auth_user_id,user_id,created_at) VALUES(?,?,?)',identity.id,current.id,Date.now()).run();
      userId=current.id;
    } else if(!userId) {
      if(await sql(env.DB,'SELECT id FROM users WHERE email=?',email).first())throw new HttpError(409,'GOOGLE_ACCOUNT_LINK_REQUIRED');
      userId=crypto.randomUUID();
      // Google-only accounts have no usable password or recovery secret; email signup remains separate.
      await env.DB.batch([
        sql(env.DB,'INSERT INTO users(id,email,password_hash,salt,recovery_hash,created_at) VALUES(?,?,?,?,?,?)',userId,email,digest(secret()).repeat(2),secret(),digest(secret()),Date.now()),
        sql(env.DB,'INSERT INTO google_identities(auth_user_id,user_id,created_at) VALUES(?,?,?)',identity.id,userId,Date.now()),
      ]);
    }
    headers.append('Set-Cookie',await loginSession(env.DB,userId,request));
    const target=new URL(returnPath,env.SITE_ORIGIN);target.searchParams.set('auth_success',attempt.user_id?'linked':'google');headers.set('Location',target.href);
  } catch(error) {
    const target=new URL(returnPath,env.SITE_ORIGIN);target.searchParams.set('auth_error',error instanceof HttpError?error.code:'GOOGLE_LOGIN_FAILED');headers.set('Location',target.href);
  }
  return new Response(null,{status:303,headers});
}
