-- Run once after the gallery-upgrades and portal-studio migrations.
-- Adds expanded design settings without rebuilding tables or changing existing data.
ALTER TABLE galleries ADD COLUMN appearance_json TEXT CHECK(appearance_json IS NULL OR json_valid(appearance_json));
