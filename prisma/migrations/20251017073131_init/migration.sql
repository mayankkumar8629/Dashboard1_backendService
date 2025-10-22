-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "accountType" TEXT NOT NULL,
    "profileImage" TEXT,
    "bio" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InfluencerDetails" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "category" TEXT,
    "nicheTags" TEXT[],
    "totalFollowers" BIGINT NOT NULL DEFAULT 0,
    "averageEngagement" DOUBLE PRECISION,
    "location" TEXT,
    "website" TEXT,
    "managerName" TEXT,
    "managerEmail" TEXT,

    CONSTRAINT "InfluencerDetails_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BrandDetails" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "companyName" TEXT,
    "industry" TEXT,
    "website" TEXT,
    "contactPerson" TEXT,
    "contactEmail" TEXT,
    "budgetRange" TEXT,

    CONSTRAINT "BrandDetails_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "InfluencerDetails_userId_key" ON "InfluencerDetails"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "BrandDetails_userId_key" ON "BrandDetails"("userId");

-- AddForeignKey
ALTER TABLE "InfluencerDetails" ADD CONSTRAINT "InfluencerDetails_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrandDetails" ADD CONSTRAINT "BrandDetails_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
