-- Analytics module indexes for performance optimization

-- Index for knowledge point heat statistics
CREATE INDEX IF NOT EXISTS "idx_learning_records_kp"
ON "learning_records"("knowledge_point_id");

-- Additional index for user + created_at queries (if not exists)
CREATE INDEX IF NOT EXISTS "idx_learning_records_user_created"
ON "learning_records"("user_id", "created_at");
