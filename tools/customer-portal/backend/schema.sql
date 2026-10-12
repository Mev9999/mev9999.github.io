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
  gallery_id TEXT REFERENCES galleries(id) ON DELETE SET NULL,
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
  cover_layout TEXT NOT NULL DEFAULT 'overlay' CHECK(cover_layout IN ('overlay','split','editorial')),
  cover_height TEXT NOT NULL DEFAULT 'standard' CHECK(cover_height IN ('compact','standard','large')),
  grid_density TEXT NOT NULL DEFAULT 'comfortable' CHECK(grid_density IN ('comfortable','compact','spacious')),
  grid_gap INTEGER NOT NULL DEFAULT 16 CHECK(grid_gap>=8 AND grid_gap<=40),
  show_filenames INTEGER NOT NULL DEFAULT 0 CHECK(show_filenames IN (0,1)),
  require_final_delivery INTEGER NOT NULL DEFAULT 0 CHECK(require_final_delivery IN (0,1)),
  watermark_mode TEXT NOT NULL DEFAULT 'inherit' CHECK(watermark_mode IN ('inherit','on','off')),
  typography TEXT NOT NULL DEFAULT 'serif' CHECK(typography IN ('serif','sans','editorial')),
  cover_decoration TEXT NOT NULL DEFAULT 'none' CHECK(cover_decoration IN ('none','frame','stripe')),
  appearance_json TEXT CHECK(appearance_json IS NULL OR json_valid(appearance_json)),
  deleted_at INTEGER,
  media_deleted_at INTEGER,
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
  final_ready INTEGER NOT NULL DEFAULT 0 CHECK(final_ready IN (0,1)),
  source_filename TEXT,
  original_key TEXT NOT NULL UNIQUE,
  preview_type TEXT NOT NULL,
  watermark_override TEXT NOT NULL DEFAULT 'inherit' CHECK(watermark_override IN ('inherit','on','off')),
  protected_preview_key TEXT,
  protected_preview_type TEXT,
  watermark_fingerprint TEXT,
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
  position INTEGER NOT NULL DEFAULT 0,
  is_required INTEGER NOT NULL DEFAULT 0 CHECK(is_required IN (0,1)),
  active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1))
);
CREATE UNIQUE INDEX IF NOT EXISTS packages_one_active_required ON packages(gallery_id) WHERE active=1 AND is_required=1;
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  gallery_id TEXT NOT NULL REFERENCES galleries(id),
  package_id TEXT NOT NULL REFERENCES packages(id),
  package_name TEXT NOT NULL,
  package_quantity INTEGER NOT NULL DEFAULT 1 CHECK(package_quantity>0),
  pricing_json TEXT CHECK(pricing_json IS NULL OR json_valid(pricing_json)),
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
  receipt_email_json TEXT,
  payment_reference TEXT,
  withdrawal_requested_at INTEGER,
  deleted_at INTEGER,
  withdrawal_acknowledged_at INTEGER
);
CREATE INDEX IF NOT EXISTS orders_user ON orders(user_id,created_at);
CREATE UNIQUE INDEX IF NOT EXISTS orders_provider ON orders(payment_method,provider_reference) WHERE provider_reference IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS orders_pending_selection ON orders(pending_key) WHERE deleted_at IS NULL AND status='pending' AND pending_key IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS orders_payment_reference ON orders(payment_reference) WHERE payment_reference IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS orders_required_booking ON orders(user_id,gallery_id,json_extract(pricing_json,'$.requiredPackageId')) WHERE deleted_at IS NULL AND status IN ('pending','paid') AND json_extract(pricing_json,'$.requiredPackageId') IS NOT NULL;
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
CREATE TABLE IF NOT EXISTS gallery_invoices (
  id TEXT NOT NULL UNIQUE,
  gallery_id TEXT NOT NULL REFERENCES galleries(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  r2_key TEXT NOT NULL UNIQUE,
  filename TEXT NOT NULL,
  size INTEGER NOT NULL CHECK(size>0 AND size<=5242880),
  uploaded_at INTEGER NOT NULL,
  uploaded_by TEXT NOT NULL REFERENCES users(id),
  PRIMARY KEY(gallery_id,user_id)
);
CREATE TABLE IF NOT EXISTS download_notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  gallery_id TEXT NOT NULL REFERENCES galleries(id),
  order_id TEXT REFERENCES orders(id),
  image_ids_json TEXT NOT NULL CHECK(json_valid(image_ids_json)),
  email_json TEXT,
  created_at INTEGER NOT NULL,
  sent_at INTEGER,
  cancelled_at INTEGER,
  attempts INTEGER NOT NULL DEFAULT 0,
  next_attempt_at INTEGER NOT NULL DEFAULT 0,
  lease_at INTEGER,
  error_code TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS download_notifications_order ON download_notifications(order_id) WHERE order_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS download_notifications_pending ON download_notifications(next_attempt_at,created_at) WHERE sent_at IS NULL AND cancelled_at IS NULL;
CREATE TABLE IF NOT EXISTS portal_settings (
  id INTEGER PRIMARY KEY CHECK(id=1),
  value_json TEXT NOT NULL CHECK(json_valid(value_json)),
  updated_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS customer_activity (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL CHECK(kind IN ('favorite_added','favorite_removed','download')),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  gallery_id TEXT NOT NULL REFERENCES galleries(id) ON DELETE CASCADE,
  image_id TEXT REFERENCES images(id) ON DELETE SET NULL,
  created_at INTEGER NOT NULL,
  read_at INTEGER,
  dedupe_key TEXT UNIQUE
);
CREATE INDEX IF NOT EXISTS customer_activity_recent ON customer_activity(created_at);

CREATE TABLE IF NOT EXISTS image_download_blocks (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  image_id TEXT NOT NULL REFERENCES images(id) ON DELETE CASCADE,
  blocked_at INTEGER NOT NULL,
  blocked_by TEXT NOT NULL REFERENCES users(id),
  PRIMARY KEY(user_id,image_id)
);
