-- Additive only. Apply once to the existing production database before deploying.
-- Never run schema.sql to reset or replace production customer records.
ALTER TABLE galleries ADD COLUMN cover_layout TEXT NOT NULL DEFAULT 'overlay' CHECK(cover_layout IN ('overlay','split','editorial'));
ALTER TABLE galleries ADD COLUMN cover_height TEXT NOT NULL DEFAULT 'standard' CHECK(cover_height IN ('compact','standard','large'));
ALTER TABLE galleries ADD COLUMN grid_density TEXT NOT NULL DEFAULT 'comfortable' CHECK(grid_density IN ('comfortable','compact','spacious'));
ALTER TABLE galleries ADD COLUMN grid_gap INTEGER NOT NULL DEFAULT 16 CHECK(grid_gap>=8 AND grid_gap<=40);
ALTER TABLE galleries ADD COLUMN show_filenames INTEGER NOT NULL DEFAULT 0 CHECK(show_filenames IN (0,1));
ALTER TABLE auth_tokens ADD COLUMN gallery_id TEXT REFERENCES galleries(id) ON DELETE SET NULL;
ALTER TABLE orders ADD COLUMN receipt_email_json TEXT;
CREATE TABLE IF NOT EXISTS gallery_invoices (id TEXT NOT NULL UNIQUE,gallery_id TEXT NOT NULL REFERENCES galleries(id) ON DELETE CASCADE,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,r2_key TEXT NOT NULL UNIQUE,filename TEXT NOT NULL,size INTEGER NOT NULL CHECK(size>0 AND size<=5242880),uploaded_at INTEGER NOT NULL,uploaded_by TEXT NOT NULL REFERENCES users(id),PRIMARY KEY(gallery_id,user_id));
CREATE TABLE IF NOT EXISTS download_notifications (id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),gallery_id TEXT NOT NULL REFERENCES galleries(id),order_id TEXT REFERENCES orders(id),image_ids_json TEXT NOT NULL CHECK(json_valid(image_ids_json)),email_json TEXT,created_at INTEGER NOT NULL,sent_at INTEGER,cancelled_at INTEGER,attempts INTEGER NOT NULL DEFAULT 0,next_attempt_at INTEGER NOT NULL DEFAULT 0,lease_at INTEGER,error_code TEXT);
CREATE UNIQUE INDEX IF NOT EXISTS download_notifications_order ON download_notifications(order_id) WHERE order_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS download_notifications_pending ON download_notifications(next_attempt_at,created_at) WHERE sent_at IS NULL AND cancelled_at IS NULL;
