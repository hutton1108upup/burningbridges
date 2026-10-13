import {randomBytes, createHash, scrypt as scryptCallback, timingSafeEqual} from 'node:crypto';
import {promisify} from 'node:util';
import {HttpError,sql} from './commerce.mjs';
const scrypt=promisify(scryptCallback);
export const digest=value=>createHash('sha256').update(value).digest('hex');
export const secret=()=>randomBytes(32).toString('base64url');
const cookieName=request=>new URL(request.url).protocol==='https:'?'__Host-bb_session':'bb_session';
export function sessionCookie(request,token,maxAge=2592000) {
  return `${cookieName(request)}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAge}${new URL(request.url).protocol==='https:'?'; Secure':''}`;
}
export async function rateLimit(db,key,limit,windowMs,now=Date.now()) {
  await sql(db,`INSERT INTO rate_limits(key,hits,reset_at) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET hits=CASE WHEN reset_at<=? THEN 1 ELSE hits+1 END, reset_at=CASE WHEN reset_at<=? THEN ? ELSE reset_at END`,key,now+windowMs,now,now,now+windowMs).run();
  if((await sql(db,'SELECT hits FROM rate_limits WHERE key=?',key).first()).hits>limit) throw new HttpError(429,'TRY_LATER');
}
export async function userFrom(request,db) {
  const cookie=request.headers.get('cookie')||'';
  const token=cookie.split(';').map(x=>x.trim()).find(x=>x.startsWith(`${cookieName(request)}=`))?.split('=')[1];
  if(!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
  return sql(db,'SELECT u.id,u.email FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>?',digest(token),Date.now()).first();
}
export async function requireUser(request,db) {
  const user=await userFrom(request,db); if(!user) throw new HttpError(401,'SIGN_IN_REQUIRED'); return user;
}
export async function loginSession(db,userId,request) {
  const token=secret();
  await sql(db,'INSERT INTO sessions(token_hash,user_id,expires_at) VALUES(?,?,?)',digest(token),userId,Date.now()+2592000000).run();
  return sessionCookie(request,token);
}
export async function authenticate(request,db,body,action) {
  const email=String(body.email||'').trim().toLowerCase(), password=body.password;
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length>254 || typeof password!=='string' || password.length<12 || password.length>128) throw new HttpError(400,'EMAIL_OR_PASSWORD_INVALID');
  const ip=request.headers.get('cf-connecting-ip')||'local';
  await rateLimit(db,`auth:${action}:${ip}`,action==='signup'?5:20,900000);
  await rateLimit(db,`email:${digest(email)}`,10,900000);
  let user=await sql(db,'SELECT * FROM users WHERE email=?',email).first();
  if(action==='signup') {
    if(user) throw new HttpError(409,'ACCOUNT_EXISTS_USE_SIGN_IN');
    const salt=secret(), recovery=secret(), id=crypto.randomUUID();
    const hashed=(await scrypt(password,salt,64)).toString('hex');
    try {await sql(db,'INSERT INTO users(id,email,password_hash,salt,recovery_hash,created_at) VALUES(?,?,?,?,?,?)',id,email,hashed,salt,digest(recovery),Date.now()).run();}
    catch(error) {if(String(error).includes('UNIQUE')) throw new HttpError(409,'ACCOUNT_EXISTS_USE_SIGN_IN'); throw error;}
    user={id,email};
    return {user, recovery, cookie:await loginSession(db,id,request)};
  }
  const actual=await scrypt(password,user?.salt||'unknown-user-timing-padding',64);
  const expected=Buffer.from(user?.password_hash||'0'.repeat(128),'hex');
  if(!timingSafeEqual(actual,expected) || !user) throw new HttpError(401,'SIGN_IN_FAILED');
  return {user:{id:user.id,email:user.email},cookie:await loginSession(db,user.id,request)};
}
export async function recover(request,db,body) {
  await rateLimit(db,`recover:${request.headers.get('cf-connecting-ip')||'local'}`,5,900000);
  if(typeof body.code!=='string' || !/^[A-Za-z0-9_-]{43}$/.test(body.code) || typeof body.password!=='string' || body.password.length<12 || body.password.length>128) throw new HttpError(400,'RECOVERY_INVALID');
  const user=await sql(db,'SELECT id,email FROM users WHERE recovery_hash=?',digest(body.code)).first();
  if(!user) throw new HttpError(401,'RECOVERY_INVALID');
  const salt=secret(), recovery=secret(), hashed=(await scrypt(body.password,salt,64)).toString('hex');
  await db.batch([sql(db,'UPDATE users SET password_hash=?,salt=?,recovery_hash=? WHERE id=?',hashed,salt,digest(recovery),user.id),sql(db,'DELETE FROM sessions WHERE user_id=?',user.id)]);
  return {user,recovery,cookie:await loginSession(db,user.id,request)};
}
export async function logout(request,db) {
  const token=(request.headers.get('cookie')||'').split(';').map(x=>x.trim()).find(x=>x.startsWith(`${cookieName(request)}=`))?.split('=')[1];
  if(token) await sql(db,'DELETE FROM sessions WHERE token_hash=?',digest(token)).run();
  return sessionCookie(request,'',0);
}
