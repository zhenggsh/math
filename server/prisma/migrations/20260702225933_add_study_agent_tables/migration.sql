-- CreateEnum
CREATE TYPE "StudyMessageRole" AS ENUM ('USER', 'AGENT');

-- CreateEnum
CREATE TYPE "StudyMessageFeedback" AS ENUM ('POSITIVE', 'NEGATIVE');

-- CreateTable
CREATE TABLE "study_sessions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "knowledge_point_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "study_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "study_messages" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "role" "StudyMessageRole" NOT NULL,
    "content" TEXT NOT NULL,
    "follow_ups" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "feedback" "StudyMessageFeedback",
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "study_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "idx_study_session_user_knowledge_point" ON "study_sessions"("user_id", "knowledge_point_id");

-- CreateIndex
CREATE INDEX "idx_study_message_session" ON "study_messages"("session_id");

-- CreateIndex
CREATE INDEX "idx_study_message_session_created_at" ON "study_messages"("session_id", "created_at");

-- AddForeignKey
ALTER TABLE "study_sessions" ADD CONSTRAINT "study_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "study_sessions" ADD CONSTRAINT "study_sessions_knowledge_point_id_fkey" FOREIGN KEY ("knowledge_point_id") REFERENCES "knowledge_points"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "study_messages" ADD CONSTRAINT "study_messages_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "study_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
