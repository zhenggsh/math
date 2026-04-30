-- CreateIndex
CREATE INDEX "idx_knowledge_point_importance" ON "knowledge_points"("importance_level");

-- CreateIndex
CREATE INDEX "idx_learning_record_user_proficiency" ON "learning_records"("user_id", "mastery_level");

-- CreateIndex
CREATE INDEX "idx_learning_record_user_date" ON "learning_records"("user_id", "start_time");
