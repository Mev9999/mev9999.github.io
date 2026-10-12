-- Run once, AFTER 2026-10-08-gallery-upgrades.sql. Keeps old orders and photos intact.
-- Watermark protection is enabled explicitly in administration after preview generation.
ALTER TABLE galleries ADD COLUMN watermark_mode TEXT NOT NULL DEFAULT 'inherit' CHECK(watermark_mode IN ('inherit','on','off'));
ALTER TABLE galleries ADD COLUMN typography TEXT NOT NULL DEFAULT 'serif' CHECK(typography IN ('serif','sans','editorial'));
ALTER TABLE galleries ADD COLUMN cover_decoration TEXT NOT NULL DEFAULT 'none' CHECK(cover_decoration IN ('none','frame','stripe'));
ALTER TABLE images ADD COLUMN protected_preview_key TEXT;
ALTER TABLE images ADD COLUMN protected_preview_type TEXT;
ALTER TABLE images ADD COLUMN watermark_fingerprint TEXT;
ALTER TABLE orders ADD COLUMN payment_reference TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS orders_payment_reference ON orders(payment_reference) WHERE payment_reference IS NOT NULL;
CREATE TABLE IF NOT EXISTS portal_settings (id INTEGER PRIMARY KEY CHECK(id=1),value_json TEXT NOT NULL CHECK(json_valid(value_json)),updated_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS customer_activity (id TEXT PRIMARY KEY,kind TEXT NOT NULL CHECK(kind IN ('favorite_added','favorite_removed','download')),user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,gallery_id TEXT NOT NULL REFERENCES galleries(id) ON DELETE CASCADE,image_id TEXT REFERENCES images(id) ON DELETE SET NULL,created_at INTEGER NOT NULL,read_at INTEGER,dedupe_key TEXT UNIQUE);
CREATE INDEX IF NOT EXISTS customer_activity_recent ON customer_activity(created_at);
