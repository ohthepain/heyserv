-- CreateTable
CREATE TABLE "public"."user_profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "emailPreferences" JSONB NOT NULL DEFAULT '{"signoffs":{"professional":"Best regards","casual":"Best","formal":"Sincerely","friendly":"Cheers","polite":"Thank you","urgent":"Best regards","apologetic":"Best regards","neutral":"Best regards"},"spacing":{"blankLineBeforeSignoff":true,"blankLineBeforeName":true,"blankLineAfterSalutation":false},"defaults":{"defaultTone":"professional","defaultSignoff":null,"includeSignature":true}}',

    CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_profiles_userId_key" ON "public"."user_profiles"("userId");

-- CreateIndex
CREATE INDEX "user_profiles_userId_idx" ON "public"."user_profiles"("userId");
