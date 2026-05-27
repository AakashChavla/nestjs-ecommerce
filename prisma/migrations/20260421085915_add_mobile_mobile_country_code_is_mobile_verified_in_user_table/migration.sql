/*
  Warnings:

  - A unique constraint covering the columns `[mobile]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "users" ADD COLUMN     "is_mobile_verified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "mobile" VARCHAR(20),
ADD COLUMN     "mobile_country_code" VARCHAR(10);

-- CreateIndex
CREATE UNIQUE INDEX "users_mobile_key" ON "users"("mobile");
