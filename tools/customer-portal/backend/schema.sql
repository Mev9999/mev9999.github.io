-- Private customer portal. Run once with D1 migrations; never publish a database export.
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  name TEXT NOT NULL,
  password_hash TEXT,
  role TEXT NOT NULL DEFAULT 'customer' CHECK(role IN ('customer','admin')),
  disabled INTEGER NOT NULL DEFAULT 0 CHECK(disabled IN (0,1)),
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  csrf TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_user ON sessions(user_id);
CREATE TABLE IF NOT EXISTS auth_tokens (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  purpose TEXT NOT NULL CHECK(purpose IN ('setup','reset')),
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS auth_tokens_user ON auth_tokens(user_id);
CREATE TABLE IF NOT EXISTS rate_limits (
  key TEXT PRIMARY KEY,
  count INTEGER NOT NULL,
  reset_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS galleries (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  shooting_date TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  shooting_type TEXT NOT NULL DEFAULT 'other' CHECK(shooting_type IN ('school','maternity','newborn','family','portrait','wedding','combo','other')),
  pricing_mode TEXT NOT NULL DEFAULT 'gallery' CHECK(pricing_mode IN ('images','gallery')),
  theme TEXT NOT NULL DEFAULT 'warm' CHECK(theme IN ('warm','light','dark')),
  grid_layout TEXT NOT NULL DEFAULT 'masonry' CHECK(grid_layout IN ('masonry','grid')),
  cover_position REAL NOT NULL DEFAULT 50 CHECK(cover_position>=0 AND cover_position<=100),
  published INTEGER NOT NULL DEFAULT 0 CHECK(published IN (0,1)),
  expires_at INTEGER,
  cover_image_id TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS gallery_members (
  gallery_id TEXT NOT NULL REFERENCES galleries(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY(gallery_id,user_id)
);
CREATE TABLE IF NOT EXISTS images (
  id TEXT PRIMARY KEY,
  gallery_id TEXT NOT NULL REFERENCES galleries(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  preview_key TEXT NOT NULL UNIQUE,
  original_key TEXT NOT NULL UNIQUE,
  preview_type TEXT NOT NULL,
  original_type TEXT NOT NULL,
  width INTEGER NOT NULL,
  height INTEGER NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS images_gallery ON images(gallery_id,position);
CREATE TABLE IF NOT EXISTS favorites (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  image_id TEXT NOT NULL REFERENCES images(id) ON DELETE CASCADE,
  PRIMARY KEY(user_id,image_id)
);
CREATE TABLE IF NOT EXISTS packages (
  id TEXT PRIMARY KEY,
  gallery_id TEXT NOT NULL REFERENCES galleries(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  image_count INTEGER NOT NULL CHECK(image_count>=0),
  price_cents INTEGER NOT NULL CHECK(price_cents>0),
  currency TEXT NOT NULL DEFAULT 'EUR' CHECK(currency='EUR'),
  active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1))
);
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  gallery_id TEXT NOT NULL REFERENCES galleries(id),
  package_id TEXT NOT NULL REFERENCES packages(id),
  package_name TEXT NOT NULL,
  package_quantity INTEGER NOT NULL DEFAULT 1 CHECK(package_quantity>0),
  amount_cents INTEGER NOT NULL CHECK(amount_cents>0),
  currency TEXT NOT NULL CHECK(currency='EUR'),
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','paid','failed','cancelled','refunded')),
  payment_method TEXT NOT NULL CHECK(payment_method IN ('transfer','stripe','paypal')),
  provider_reference TEXT,
  checkout_url TEXT,
  pending_key TEXT,
  terms_version TEXT NOT NULL,
  consent_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  paid_at INTEGER,
  receipt_sent_at INTEGER,
  receipt_text TEXT,
  withdrawal_requested_at INTEGER,
  withdrawal_acknowledged_at INTEGER
);
CREATE INDEX IF NOT EXISTS orders_user ON orders(user_id,created_at);
CREATE UNIQUE INDEX IF NOT EXISTS orders_provider ON orders(payment_method,provider_reference) WHERE provider_reference IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS orders_pending_selection ON orders(pending_key) WHERE status='pending' AND pending_key IS NOT NULL;
CREATE TABLE IF NOT EXISTS order_images (
  order_id TEXT NOT NULL REFERENCES orders(id),
  image_id TEXT NOT NULL REFERENCES images(id),
  PRIMARY KEY(order_id,image_id)
);
CREATE TABLE IF NOT EXISTS manual_releases (
  user_id TEXT NOT NULL REFERENCES users(id),
  image_id TEXT NOT NULL REFERENCES images(id),
  released_at INTEGER NOT NULL,
  released_by TEXT NOT NULL REFERENCES users(id),
  PRIMARY KEY(user_id,image_id)
);
CREATE TABLE IF NOT EXISTS payment_events (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  order_id TEXT NOT NULL REFERENCES orders(id),
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS audit_events (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id),
  action TEXT NOT NULL,
  target_id TEXT,
  created_at INTEGER NOT NULL
);
