ALTER TABLE galleries ADD COLUMN require_final_delivery INTEGER NOT NULL DEFAULT 0 CHECK(require_final_delivery IN (0,1));
ALTER TABLE images ADD COLUMN final_ready INTEGER NOT NULL DEFAULT 0 CHECK(final_ready IN (0,1));
ALTER TABLE images ADD COLUMN source_filename TEXT;
