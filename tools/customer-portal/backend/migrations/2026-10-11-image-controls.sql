ALTER TABLE images ADD COLUMN watermark_override TEXT NOT NULL DEFAULT 'inherit' CHECK(watermark_override IN ('inherit','on','off'));
CREATE TABLE IF NOT EXISTS image_download_blocks (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  image_id TEXT NOT NULL REFERENCES images(id) ON DELETE CASCADE,
  blocked_at INTEGER NOT NULL,
  blocked_by TEXT NOT NULL REFERENCES users(id),
  PRIMARY KEY(user_id,image_id)
);
