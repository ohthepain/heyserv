-- CreateTable
CREATE TABLE "user_signoffs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tone" TEXT NOT NULL,
    "signoff" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_signoffs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_spacing" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "blankLineBeforeSignoff" BOOLEAN NOT NULL DEFAULT true,
    "blankLineBeforeName" BOOLEAN NOT NULL DEFAULT true,
    "blankLineAfterSalutation" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_spacing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_defaults" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "defaultTone" TEXT NOT NULL DEFAULT 'professional',
    "defaultSignoff" TEXT,
    "includeSignature" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_defaults_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_signatures" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "text" TEXT NOT NULL DEFAULT '',
    "html" TEXT NOT NULL DEFAULT '',
    "includeInEmails" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_signatures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_names" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "formal" TEXT NOT NULL DEFAULT '',
    "casual" TEXT NOT NULL DEFAULT '',
    "professional" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_names_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_signoffs_userId_tone_key" ON "user_signoffs"("userId", "tone");

-- CreateIndex
CREATE INDEX "user_signoffs_userId_idx" ON "user_signoffs"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "user_spacing_userId_key" ON "user_spacing"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "user_defaults_userId_key" ON "user_defaults"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "user_signatures_userId_key" ON "user_signatures"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "user_names_userId_key" ON "user_names"("userId");

-- AddForeignKey
ALTER TABLE "user_signoffs" ADD CONSTRAINT "user_signoffs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user_profiles"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_spacing" ADD CONSTRAINT "user_spacing_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user_profiles"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_defaults" ADD CONSTRAINT "user_defaults_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user_profiles"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_signatures" ADD CONSTRAINT "user_signatures_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user_profiles"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_names" ADD CONSTRAINT "user_names_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user_profiles"("userId") ON DELETE CASCADE ON UPDATE CASCADE;
