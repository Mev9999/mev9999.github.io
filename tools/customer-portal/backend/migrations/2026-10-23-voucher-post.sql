-- Additive and safe to run repeatedly. Existing vouchers remain email-only.
CREATE TABLE IF NOT EXISTS voucher_shipping (
  voucher_id TEXT PRIMARY KEY REFERENCES gift_vouchers(id) ON DELETE CASCADE,
  shipping_cents INTEGER NOT NULL CHECK(shipping_cents=480),
  name TEXT NOT NULL,
  street TEXT NOT NULL,
  postal_code TEXT NOT NULL CHECK(postal_code GLOB '[1-9][0-9][0-9][0-9]'),
  city TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT 'AT' CHECK(country='AT'),
  shipped_at INTEGER,
  shipped_by TEXT REFERENCES users(id),
  CHECK((shipped_at IS NULL AND shipped_by IS NULL) OR (shipped_at IS NOT NULL AND shipped_by IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS voucher_shipping_dispatch ON voucher_shipping(shipped_at,voucher_id);
