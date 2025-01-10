-- CreateEnum
CREATE TYPE "CredentialAlgorithm" AS ENUM ('ES256', 'RS256');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "phone" VARCHAR(50),
    "walletAddress" CHAR(42),
    "username" VARCHAR(15),
    "currentChallenge" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RegisteredPasskey" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(255),
    "credentialId" TEXT NOT NULL,
    "publicKey" TEXT NOT NULL,
    "counter" BIGINT NOT NULL DEFAULT 0,
    "transports" VARCHAR(255)[],
    "algorithm" "CredentialAlgorithm" NOT NULL DEFAULT 'ES256',
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RegisteredPasskey_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "User_walletAddress_key" ON "User"("walletAddress");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "RegisteredPasskey_credentialId_key" ON "RegisteredPasskey"("credentialId");

-- CreateIndex
CREATE INDEX "RegisteredPasskey_userId_idx" ON "RegisteredPasskey"("userId");

-- AddForeignKey
ALTER TABLE "RegisteredPasskey" ADD CONSTRAINT "RegisteredPasskey_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
