ALTER TABLE orders ADD COLUMN deleted_at INTEGER;
ALTER TABLE packages ADD COLUMN position INTEGER NOT NULL DEFAULT 0;
UPDATE packages SET position=(SELECT COUNT(*) FROM packages prior WHERE prior.gallery_id=packages.gallery_id AND (prior.image_count<packages.image_count OR (prior.image_count=packages.image_count AND prior.price_cents<packages.price_cents) OR (prior.image_count=packages.image_count AND prior.price_cents=packages.price_cents AND prior.id<packages.id)));
DROP INDEX IF EXISTS orders_required_booking;
CREATE UNIQUE INDEX IF NOT EXISTS orders_required_booking ON orders(user_id,gallery_id,json_extract(pricing_json,'$.requiredPackageId')) WHERE deleted_at IS NULL AND status IN ('pending','paid') AND json_extract(pricing_json,'$.requiredPackageId') IS NOT NULL;
DROP INDEX IF EXISTS orders_pending_selection;
CREATE UNIQUE INDEX IF NOT EXISTS orders_pending_selection ON orders(pending_key) WHERE deleted_at IS NULL AND status='pending' AND pending_key IS NOT NULL;
