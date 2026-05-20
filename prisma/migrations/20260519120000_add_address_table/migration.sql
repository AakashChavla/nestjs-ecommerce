-- CreateEnum
CREATE TYPE "AddressOwnerType" AS ENUM ('USER', 'SELLER', 'WAREHOUSE', 'HUB', 'PICKUP_POINT', 'RETURN_CENTER');

-- CreateEnum
CREATE TYPE "AddressType" AS ENUM ('HOME', 'OFFICE', 'BILLING', 'SHIPPING', 'OTHER');

-- CreateTable
CREATE TABLE "addresses" (
    "id" UUID NOT NULL,
    "owner_type" "AddressOwnerType" NOT NULL,
    "owner_id" UUID NOT NULL,
    "address_type" "AddressType" NOT NULL DEFAULT 'HOME',
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "label" VARCHAR(50),
    "address_line1" VARCHAR(255) NOT NULL,
    "address_line2" VARCHAR(255),
    "landmark" VARCHAR(255),
    "pincode" VARCHAR(20) NOT NULL,
    "city_id" UUID NOT NULL,
    "latitude" DECIMAL(10,8),
    "longitude" DECIMAL(11,8),
    "contact_name" VARCHAR(100),
    "contact_phone" VARCHAR(20),
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "addresses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "addresses_owner_id_owner_type_idx" ON "addresses"("owner_id", "owner_type");

-- CreateIndex
CREATE INDEX "addresses_owner_id_owner_type_is_default_idx" ON "addresses"("owner_id", "owner_type", "is_default");

-- CreateIndex
CREATE INDEX "addresses_owner_type_idx" ON "addresses"("owner_type");

-- CreateIndex
CREATE INDEX "addresses_address_type_idx" ON "addresses"("address_type");

-- CreateIndex
CREATE INDEX "addresses_pincode_idx" ON "addresses"("pincode");

-- CreateIndex
CREATE INDEX "addresses_city_id_idx" ON "addresses"("city_id");

-- AddForeignKey
ALTER TABLE "addresses" ADD CONSTRAINT "addresses_city_id_fkey" FOREIGN KEY ("city_id") REFERENCES "cities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- PartialIndex for isDefault
CREATE UNIQUE INDEX "addresses_one_default_per_owner_idx"
    ON "addresses"("owner_id", "owner_type")
    WHERE is_default = true AND deleted_at IS NULL;
