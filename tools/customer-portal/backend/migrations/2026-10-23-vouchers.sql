CREATE TABLE IF NOT EXISTS gift_vouchers (
  id TEXT PRIMARY KEY,
  reference TEXT NOT NULL UNIQUE,
  access_hash TEXT NOT NULL,
  purchase_key TEXT NOT NULL,
  purchase_hash TEXT NOT NULL,
  amount_cents INTEGER NOT NULL CHECK(amount_cents BETWEEN 1000 AND 200000),
  balance_cents INTEGER NOT NULL CHECK(balance_cents>=0),
  reserved_cents INTEGER NOT NULL DEFAULT 0 CHECK(reserved_cents>=0 AND reserved_cents<=balance_cents),
  currency TEXT NOT NULL DEFAULT 'EUR' CHECK(currency='EUR'),
  buyer_name TEXT NOT NULL,
  buyer_email TEXT NOT NULL,
  buyer_address TEXT NOT NULL,
  gift_to TEXT NOT NULL DEFAULT '',
  gift_from TEXT NOT NULL DEFAULT '',
  gift_message TEXT NOT NULL DEFAULT '',
  language TEXT NOT NULL CHECK(language IN ('de','en','bs')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','active','withdrawal_requested','refunded')),
  code TEXT UNIQUE,
  terms_version TEXT NOT NULL,
  contract_text TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  paid_at INTEGER,
  withdrawal_at INTEGER,
  refunded_at INTEGER,
  confirmation_sent_at INTEGER,
  confirmation_lease_at INTEGER,
  gift_sent_at INTEGER,
  gift_lease_at INTEGER,
  UNIQUE(buyer_email,purchase_key)
);
CREATE INDEX IF NOT EXISTS gift_vouchers_status ON gift_vouchers(status,created_at);
CREATE TABLE IF NOT EXISTS voucher_reservations (
  id TEXT PRIMARY KEY,
  voucher_id TEXT NOT NULL REFERENCES gift_vouchers(id),
  amount_cents INTEGER NOT NULL CHECK(amount_cents>0),
  booking_reference TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('active','redeemed','released')),
  created_at INTEGER NOT NULL,
  finished_at INTEGER
);
CREATE INDEX IF NOT EXISTS voucher_reservations_voucher ON voucher_reservations(voucher_id,status);
CREATE TABLE IF NOT EXISTS voucher_operations (
  id TEXT PRIMARY KEY,
  voucher_id TEXT NOT NULL REFERENCES gift_vouchers(id),
  idempotency_key TEXT NOT NULL,
  payload_hash TEXT NOT NULL,
  kind TEXT NOT NULL CHECK(kind IN ('reserve','redeem','release','refund')),
  amount_cents INTEGER NOT NULL CHECK(amount_cents>=0),
  booking_reference TEXT NOT NULL DEFAULT '',
  reservation_id TEXT,
  actor_id TEXT NOT NULL REFERENCES users(id),
  applied INTEGER NOT NULL DEFAULT 0 CHECK(applied IN (0,1)),
  created_at INTEGER NOT NULL,
  UNIQUE(voucher_id,idempotency_key)
);
CREATE INDEX IF NOT EXISTS voucher_operations_voucher ON voucher_operations(voucher_id,created_at);
