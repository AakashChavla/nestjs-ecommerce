ALTER TABLE "users" ADD COLUMN "name" VARCHAR(100);

UPDATE "users"
SET "name" = NULLIF(CONCAT_WS(' ', "first_name", "last_name"), '');

ALTER TABLE "users"
DROP COLUMN "first_name",
DROP COLUMN "last_name";
