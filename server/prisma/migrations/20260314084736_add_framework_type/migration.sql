/*
  Warnings:

  - Added the required column `framework_type` to the `textbooks` table without a default value. This is not possible if the table is not empty.
  - Made the column `framework_path` on table `textbooks` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "textbooks" ADD COLUMN     "framework_type" TEXT NOT NULL,
ALTER COLUMN "framework_path" SET NOT NULL,
ALTER COLUMN "last_modified_at" DROP DEFAULT;
