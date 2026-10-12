PRAGMA foreign_keys = ON;
CREATE TABLE users (id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL, salt TEXT NOT NULL, recovery_hash TEXT NOT NULL UNIQUE, created_at INTEGER NOT NULL);
CREATE TABLE sessions (token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), expires_at INTEGER NOT NULL);
CREATE INDEX sessions_expiry ON sessions(expires_at);
CREATE TABLE rate_limits (key TEXT PRIMARY KEY, hits INTEGER NOT NULL, reset_at INTEGER NOT NULL);
CREATE TABLE orders (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), mode TEXT NOT NULL CHECK(mode IN ('test','prod')), plan_id TEXT NOT NULL, product_id TEXT NOT NULL, draft_id TEXT, status TEXT NOT NULL DEFAULT 'pending', provider_id TEXT UNIQUE, event_time INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL);
CREATE TABLE events (id TEXT PRIMARY KEY, type TEXT NOT NULL, created_at INTEGER NOT NULL);
CREATE TABLE receipts (id TEXT PRIMARY KEY, order_id TEXT NOT NULL REFERENCES orders(id), period INTEGER NOT NULL, payment_id TEXT NOT NULL UNIQUE, charged_cents INTEGER NOT NULL, revoked INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL);
CREATE TABLE refunds (id TEXT PRIMARY KEY, receipt_id TEXT NOT NULL REFERENCES receipts(id), cents INTEGER NOT NULL CHECK(cents>0));
CREATE TABLE periods (id TEXT PRIMARY KEY, order_id TEXT NOT NULL REFERENCES orders(id), period INTEGER NOT NULL, starts_at INTEGER NOT NULL, ends_at INTEGER NOT NULL, event_time INTEGER NOT NULL);
CREATE TABLE lots (id TEXT PRIMARY KEY, order_id TEXT NOT NULL REFERENCES orders(id), receipt_id TEXT NOT NULL UNIQUE REFERENCES receipts(id), user_id TEXT NOT NULL REFERENCES users(id), mode TEXT NOT NULL CHECK(mode IN ('test','prod')), amount INTEGER NOT NULL CHECK(amount>0), remaining INTEGER NOT NULL CHECK(remaining>=0), refund_credits INTEGER NOT NULL DEFAULT 0, starts_at INTEGER NOT NULL, expires_at INTEGER NOT NULL, revoked INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL);
CREATE INDEX lots_balance ON lots(user_id, mode, expires_at);
CREATE TABLE jobs (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), mode TEXT NOT NULL, request_key TEXT NOT NULL, draft_id TEXT NOT NULL, cost INTEGER NOT NULL, resolution TEXT NOT NULL, format TEXT NOT NULL, status TEXT NOT NULL CHECK(status IN ('pending','running','succeeded','failed')), mock INTEGER NOT NULL DEFAULT 1, created_at INTEGER NOT NULL, UNIQUE(user_id,mode,request_key));
CREATE TABLE allocations (job_id TEXT NOT NULL REFERENCES jobs(id), lot_id TEXT NOT NULL REFERENCES lots(id), cost INTEGER NOT NULL CHECK(cost>0), refunded INTEGER NOT NULL DEFAULT 0, PRIMARY KEY(job_id,lot_id));
CREATE TRIGGER immutable_provider BEFORE UPDATE OF provider_id ON orders WHEN OLD.provider_id IS NOT NULL AND NEW.provider_id<>OLD.provider_id BEGIN
  SELECT RAISE(ABORT,'PROVIDER_ORDER_MISMATCH');
END;
CREATE TRIGGER allocation_debit BEFORE INSERT ON allocations BEGIN
  SELECT RAISE(ABORT,'INVALID_ALLOCATION') WHERE NOT EXISTS (SELECT 1 FROM lots l JOIN jobs j ON j.id=NEW.job_id WHERE l.id=NEW.lot_id AND l.user_id=j.user_id AND l.mode=j.mode AND l.revoked=0 AND l.remaining>=NEW.cost AND l.starts_at<=j.created_at AND l.expires_at>j.created_at);
  UPDATE lots SET remaining=remaining-NEW.cost WHERE id=NEW.lot_id;
END;
CREATE TRIGGER job_funding BEFORE UPDATE OF status ON jobs WHEN NEW.status='running' AND OLD.status='pending' BEGIN
  SELECT RAISE(ABORT,'INSUFFICIENT_CREDITS') WHERE COALESCE((SELECT SUM(cost) FROM allocations WHERE job_id=NEW.id),0)<>NEW.cost;
END;
CREATE TRIGGER allocation_refund AFTER UPDATE OF refunded ON allocations WHEN OLD.refunded=0 AND NEW.refunded=1 BEGIN
  UPDATE lots SET remaining=MIN(amount-refund_credits,remaining+NEW.cost) WHERE id=NEW.lot_id;
END;
