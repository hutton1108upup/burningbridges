CREATE TABLE IF NOT EXISTS provider_jobs (
  id TEXT PRIMARY KEY,
  job_id TEXT UNIQUE,
  user_id TEXT NOT NULL REFERENCES users(id),
  mode TEXT NOT NULL CHECK(mode IN ('test','prod')),
  request_key TEXT NOT NULL,
  provider TEXT NOT NULL,
  estimated_credits REAL NOT NULL CHECK(estimated_credits>=0 AND estimated_credits<=50),
  photo_key TEXT NOT NULL,
  scene_asset_id TEXT,
  reference_key TEXT NOT NULL,
  image_task_id TEXT,
  video_task_id TEXT,
  result_key TEXT,
  audio_status TEXT NOT NULL DEFAULT 'pending',
  status TEXT NOT NULL CHECK(status IN ('reserved','submitting','processing','succeeded','failed','unknown')),
  stage TEXT NOT NULL DEFAULT 'image_submit' CHECK(stage IN ('image_submit','image_poll','video_submit','video_poll','postprocess')),
  lease_token TEXT,
  lease_until INTEGER,
  enqueue_token TEXT,
  enqueue_until INTEGER,
  enqueued_at INTEGER,
  error_code TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL DEFAULT 0,
  UNIQUE(user_id,mode,request_key)
);
CREATE INDEX IF NOT EXISTS provider_jobs_owner ON provider_jobs(user_id,mode,created_at);
CREATE TABLE IF NOT EXISTS generation_assets (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  mode TEXT NOT NULL CHECK(mode IN ('test','prod')),
  object_key TEXT NOT NULL UNIQUE,
  mime TEXT NOT NULL,
  size INTEGER NOT NULL CHECK(size>0 AND size<=8388608),
  sha256 TEXT NOT NULL,
  width INTEGER NOT NULL,
  height INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS generation_assets_owner ON generation_assets(user_id,mode,created_at);
