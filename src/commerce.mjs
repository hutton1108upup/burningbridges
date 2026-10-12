import {PLANS, cents} from './catalog.mjs';
export class HttpError extends Error {
  constructor(status, code) {super(code); this.status=status; this.code=code;}
}
export const sql = (db, query, ...args) => db.prepare(query).bind(...args);
export const BALANCE_SQL = 'SELECT COALESCE(SUM(remaining),0) AS balance FROM lots WHERE user_id=? AND mode=? AND expires_at>? AND starts_at<=? AND revoked=0';
export async function balance(db, userId, mode, now=Date.now()) {
  return (await sql(db,BALANCE_SQL,userId,mode,now,now).first()).balance;
}
const grantSQL = `INSERT OR IGNORE INTO lots(id,order_id,receipt_id,user_id,mode,amount,remaining,refund_credits,starts_at,expires_at,created_at)
  SELECT id,order_id,id,user_id,mode,amount,amount-refund_credits,refund_credits,starts_at,ends_at,? FROM (
    SELECT r.id,o.id AS order_id,o.user_id,o.mode,? AS amount,
      MIN(?,CAST((?*COALESCE((SELECT SUM(cents) FROM refunds WHERE receipt_id=r.id),0)+r.charged_cents-1)/r.charged_cents AS INTEGER)) AS refund_credits,
      p.starts_at,p.ends_at FROM receipts r JOIN orders o ON o.id=r.order_id JOIN periods p ON p.id=r.id
      WHERE o.id=? AND r.revoked=0 AND p.ends_at>?
  )`;
export async function applyEvent(db, event, env, now=Date.now()) {
  if(event.mode!==env.PAYMENT_MODE || event.storeId!==env.WAFFO_STORE_ID) throw new HttpError(400,'EVENT_SCOPE_MISMATCH');
  if(!event.eventId || !event.eventType || !event.data?.orderId) throw new HttpError(400,'INVALID_EVENT');
  const data=event.data, eventKey=`${event.mode}:${event.eventType}:${event.eventId}`;
  if(await sql(db,'SELECT id FROM events WHERE id=?',eventKey).first()) return {duplicate:true};
  const metadata=data.orderMetadata;
  const order=await sql(db,'SELECT * FROM orders WHERE id=?',data.orderMerchantExternalId || '').first();
  if(!order || order.mode!==event.mode || metadata?.orderId!==order.id || metadata?.userId!==order.user_id || metadata?.planId!==order.plan_id || metadata?.draftId!==(order.draft_id||'') || data.merchantProvidedBuyerIdentity!==order.user_id) throw new HttpError(400,'ORDER_MISMATCH');
  if(order.provider_id && order.provider_id!==data.orderId) throw new HttpError(400,'PROVIDER_ORDER_MISMATCH');
  const plan=PLANS[order.plan_id];
  if(data.currency!=='USD') throw new HttpError(400,'CURRENCY_MISMATCH');
  const paid=event.eventType==='order.completed' || event.eventType==='subscription.payment_succeeded';
  const periodEvent=['subscription.activated','subscription.renewed','subscription.recovered'].includes(event.eventType);
  const period=plan.kind==='monthly' ? data.periodNumber : 1;
  const statements=[];
  // An order created for another product cannot acquire credits through copied metadata.
  if(data.productMetadata?.planId!==order.plan_id) throw new HttpError(400,'PRODUCT_MISMATCH');
  if(paid) {
    if((plan.kind==='one-time')!==(event.eventType==='order.completed') || cents(data.listPrice?.subtotal)!==plan.cents || data.paymentStatus!=='succeeded' || !data.paymentId || !Number.isSafeInteger(period) || period<1) throw new HttpError(400,'PAYMENT_MISMATCH');
    if(plan.kind==='one-time' && data.orderStatus!=='completed') throw new HttpError(400,'PAYMENT_MISMATCH');
    const charged=cents(data.chargedAmount);
    if(charged===null || charged<=0) throw new HttpError(400,'PAYMENT_MISMATCH');
    const previous=await sql(db,'SELECT payment_id FROM receipts WHERE id=?',`${order.id}:${period}`).first();
    if(previous && previous.payment_id!==data.paymentId) throw new HttpError(400,'PAYMENT_PERIOD_MISMATCH');
    statements.push(sql(db,'INSERT OR IGNORE INTO receipts(id,order_id,period,payment_id,charged_cents,created_at) VALUES(?,?,?,?,?,?)',`${order.id}:${period}`,order.id,period,data.paymentId,charged,now));
    if(plan.kind==='one-time') statements.push(sql(db,'INSERT OR IGNORE INTO periods(id,order_id,period,starts_at,ends_at,event_time) VALUES(?,?,?,?,?,?)',`${order.id}:1`,order.id,1,now,now+plan.days*86400000,now));
  } else if(periodEvent) {
    const start=Date.parse(data.currentPeriodStart), end=Date.parse(data.currentPeriodEnd);
    if(plan.kind!=='monthly' || data.billingPeriod!=='monthly' || cents(data.planPrice?.subtotal)!==plan.cents || !Number.isSafeInteger(period) || period<1 || !Number.isFinite(start) || !Number.isFinite(end) || end<=start || end-start>32*86400000 || !['active','canceling'].includes(data.orderStatus)) throw new HttpError(400,'PERIOD_MISMATCH');
    statements.push(sql(db,'INSERT OR IGNORE INTO periods(id,order_id,period,starts_at,ends_at,event_time) VALUES(?,?,?,?,?,?)',`${order.id}:${period}`,order.id,period,start,end,Date.parse(event.timestamp)||now));
  } else if(event.eventType==='refund.succeeded') {
    const refunded=cents(data.refundedAmount);
    if(!data.paymentId || data.refundStatus!=='succeeded' || refunded===null || refunded<=0) throw new HttpError(400,'REFUND_MISMATCH');
    const receipt=await sql(db,'SELECT id,charged_cents FROM receipts WHERE order_id=? AND payment_id=?',order.id,data.paymentId).first();
    if(!receipt) throw new HttpError(409,'RECEIPT_PENDING');
    if(cents(data.originalChargedAmount)!==receipt.charged_cents || refunded>receipt.charged_cents) throw new HttpError(400,'REFUND_MISMATCH');
    statements.push(sql(db,'INSERT OR IGNORE INTO refunds(id,receipt_id,cents) VALUES(?,?,?)',event.eventId,receipt.id,refunded));
    const target=`MIN(amount, CAST((amount*(SELECT SUM(cents) FROM refunds WHERE receipt_id=lots.receipt_id)+?-1)/? AS INTEGER))`;
    statements.push(sql(db,`UPDATE lots SET remaining=MAX(0,remaining-(${target}-refund_credits)),refund_credits=${target},revoked=CASE WHEN (SELECT SUM(cents) FROM refunds WHERE receipt_id=lots.receipt_id)>=? THEN 1 ELSE revoked END WHERE receipt_id=?`,receipt.charged_cents,receipt.charged_cents,receipt.charged_cents,receipt.charged_cents,receipt.charged_cents,receipt.id));
    statements.push(sql(db,'UPDATE receipts SET revoked=1 WHERE id=? AND (SELECT SUM(cents) FROM refunds WHERE receipt_id=?)>=charged_cents',receipt.id,receipt.id));
  } else if(!['subscription.canceling','subscription.canceled','subscription.uncanceled','subscription.past_due','refund.failed'].includes(event.eventType)) {
    throw new HttpError(400,'UNSUPPORTED_EVENT');
  }
  const eventTime=Date.parse(event.timestamp)||now;
  const nextStatus=paid?(plan.kind==='one-time'?'paid':order.status):periodEvent?data.orderStatus:data.orderStatus||order.status;
  statements.push(sql(db,'UPDATE orders SET provider_id=?,status=CASE WHEN ?>=event_time THEN ? ELSE status END,event_time=MAX(event_time,?) WHERE id=?',data.orderId,eventTime,nextStatus,eventTime,order.id));
  if(paid || periodEvent) statements.push(sql(db,grantSQL,now,plan.credits,plan.credits,plan.credits,order.id,now));
  statements.push(sql(db,'INSERT OR IGNORE INTO events(id,type,created_at) VALUES(?,?,?)',eventKey,event.eventType,now));
  await db.batch(statements);
  return {accepted:true};
}
export async function createJob(db,{userId,mode,key,draftId,cost,resolution,format},now=Date.now()) {
  const previous=await sql(db,'SELECT * FROM jobs WHERE user_id=? AND mode=? AND request_key=?',userId,mode,key).first();
  if(previous) {
    if(previous.draft_id!==draftId || previous.resolution!==resolution || previous.format!==format) throw new HttpError(409,'REQUEST_KEY_REUSED');
    return previous;
  }
  const id=crypto.randomUUID();
  try {
    await db.batch([
      sql(db,'INSERT INTO jobs(id,user_id,mode,request_key,draft_id,cost,resolution,format,status,created_at) VALUES(?,?,?,?,?,?,?,?,?,?)',id,userId,mode,key,draftId,cost,resolution,format,'pending',now),
      sql(db,`INSERT INTO allocations(job_id,lot_id,cost)
        SELECT ?,id,MIN(remaining,? - spent) FROM (
          SELECT id,remaining,COALESCE(SUM(remaining) OVER (ORDER BY expires_at,id ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING),0) AS spent
          FROM lots WHERE user_id=? AND mode=? AND expires_at>? AND starts_at<=? AND revoked=0 AND remaining>0
        ) WHERE spent<?`,id,cost,userId,mode,now,now,cost),
      sql(db,"UPDATE jobs SET status='running' WHERE id=?",id),
    ]);
  } catch(error) {
    const raced=await sql(db,'SELECT * FROM jobs WHERE user_id=? AND mode=? AND request_key=?',userId,mode,key).first();
    if(raced) {
      if(raced.draft_id!==draftId || raced.resolution!==resolution || raced.format!==format) throw new HttpError(409,'REQUEST_KEY_REUSED');
      return raced;
    }
    if(String(error).includes('INSUFFICIENT_CREDITS')) throw new HttpError(402,'INSUFFICIENT_CREDITS');
    throw error;
  }
  return await sql(db,'SELECT * FROM jobs WHERE id=?',id).first();
}
export async function failJob(db,id) {
  await db.batch([sql(db,"UPDATE jobs SET status='failed' WHERE id=? AND status IN ('pending','running')",id), sql(db,"UPDATE allocations SET refunded=1 WHERE job_id=? AND refunded=0 AND EXISTS(SELECT 1 FROM jobs WHERE id=? AND status='failed')",id,id)]);
}
