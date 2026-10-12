ALTER TABLE packages ADD COLUMN is_required INTEGER NOT NULL DEFAULT 0 CHECK(is_required IN (0,1));
ALTER TABLE orders ADD COLUMN pricing_json TEXT CHECK(pricing_json IS NULL OR json_valid(pricing_json));
CREATE UNIQUE INDEX IF NOT EXISTS packages_one_active_required ON packages(gallery_id) WHERE active=1 AND is_required=1;
CREATE UNIQUE INDEX IF NOT EXISTS orders_required_booking ON orders(user_id,gallery_id,json_extract(pricing_json,'$.requiredPackageId')) WHERE status IN ('pending','paid') AND json_extract(pricing_json,'$.requiredPackageId') IS NOT NULL;
