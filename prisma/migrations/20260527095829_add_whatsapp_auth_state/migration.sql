-- CreateTable
CREATE TABLE "WhatsAppAuthState" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "creds" JSONB NOT NULL,
    "keys" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsAppAuthState_pkey" PRIMARY KEY ("id")
);
