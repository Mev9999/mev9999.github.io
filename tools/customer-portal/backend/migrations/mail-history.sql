CREATE TABLE IF NOT EXISTS mail_history (id TEXT PRIMARY KEY, recipient TEXT NOT NULL, message_json TEXT NOT NULL CHECK(json_valid(message_json)), provider_id TEXT, status TEXT NOT NULL CHECK(status IN ('sent','failed')), created_at INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS mail_history_recipient ON mail_history(recipient,created_at);
