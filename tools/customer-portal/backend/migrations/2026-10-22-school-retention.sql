-- No existing gallery is opted in and no existing deadline changes.
ALTER TABLE galleries ADD COLUMN retention_policy TEXT CHECK(retention_policy IS NULL OR retention_policy='school-v1');
ALTER TABLE galleries ADD COLUMN retention_started_at INTEGER;
ALTER TABLE images ADD COLUMN retention_purge_started_at INTEGER;
ALTER TABLE images ADD COLUMN retention_purged_at INTEGER;
ALTER TABLE images ADD COLUMN retention_checked_at INTEGER;
ALTER TABLE orders ADD COLUMN delivery_ready_at INTEGER;
ALTER TABLE orders ADD COLUMN delivery_delete_at INTEGER;
CREATE INDEX IF NOT EXISTS galleries_retention ON galleries(retention_policy,expires_at);
CREATE INDEX IF NOT EXISTS images_retention_purge ON images(retention_purge_started_at,retention_purged_at,retention_checked_at);
CREATE TABLE IF NOT EXISTS manual_delivery_retention (
  user_id TEXT NOT NULL REFERENCES users(id),
  image_id TEXT NOT NULL REFERENCES images(id),
  ready_at INTEGER NOT NULL,
  delete_at INTEGER NOT NULL,
  PRIMARY KEY(user_id,image_id)
);

-- Tracks attempted school-photo uploads, including failed uploads with no image row.
CREATE TABLE IF NOT EXISTS school_retention_uploads (
  image_id TEXT PRIMARY KEY,
  gallery_id TEXT NOT NULL REFERENCES galleries(id),
  created_at INTEGER NOT NULL,
  checked_at INTEGER
);
