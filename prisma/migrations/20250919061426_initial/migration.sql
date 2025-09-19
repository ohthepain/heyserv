-- CreateTable
CREATE TABLE "public"."contacts" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "avatar" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."emails" (
    "id" TEXT NOT NULL,
    "gmailId" TEXT NOT NULL,
    "subject" TEXT,
    "senderEmail" TEXT NOT NULL,
    "recipientEmails" TEXT[],
    "ccEmails" TEXT[],
    "bccEmails" TEXT[],
    "body" TEXT,
    "bodyHtml" TEXT,
    "snippet" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "isImportant" BOOLEAN NOT NULL DEFAULT false,
    "isStarred" BOOLEAN NOT NULL DEFAULT false,
    "labels" TEXT[],
    "receivedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "contactId" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,

    CONSTRAINT "emails_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."threads" (
    "id" TEXT NOT NULL,
    "gmailThreadId" TEXT NOT NULL,
    "subject" TEXT,
    "lastMessageAt" TIMESTAMP(3) NOT NULL,
    "messageCount" INTEGER NOT NULL DEFAULT 1,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "isImportant" BOOLEAN NOT NULL DEFAULT false,
    "isStarred" BOOLEAN NOT NULL DEFAULT false,
    "labels" TEXT[],
    "participants" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "threads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."memories" (
    "id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "memoryType" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 1,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "dueDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "contactId" TEXT NOT NULL,
    "emailId" TEXT,
    "threadId" TEXT,

    CONSTRAINT "memories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "contacts_email_key" ON "public"."contacts"("email");

-- CreateIndex
CREATE INDEX "contacts_email_idx" ON "public"."contacts"("email");

-- CreateIndex
CREATE UNIQUE INDEX "emails_gmailId_key" ON "public"."emails"("gmailId");

-- CreateIndex
CREATE INDEX "emails_gmailId_idx" ON "public"."emails"("gmailId");

-- CreateIndex
CREATE INDEX "emails_senderEmail_idx" ON "public"."emails"("senderEmail");

-- CreateIndex
CREATE INDEX "emails_receivedAt_idx" ON "public"."emails"("receivedAt");

-- CreateIndex
CREATE INDEX "emails_threadId_idx" ON "public"."emails"("threadId");

-- CreateIndex
CREATE UNIQUE INDEX "threads_gmailThreadId_key" ON "public"."threads"("gmailThreadId");

-- CreateIndex
CREATE INDEX "threads_gmailThreadId_idx" ON "public"."threads"("gmailThreadId");

-- CreateIndex
CREATE INDEX "threads_lastMessageAt_idx" ON "public"."threads"("lastMessageAt");

-- CreateIndex
CREATE INDEX "threads_participants_idx" ON "public"."threads"("participants");

-- CreateIndex
CREATE INDEX "memories_contactId_idx" ON "public"."memories"("contactId");

-- CreateIndex
CREATE INDEX "memories_emailId_idx" ON "public"."memories"("emailId");

-- CreateIndex
CREATE INDEX "memories_threadId_idx" ON "public"."memories"("threadId");

-- CreateIndex
CREATE INDEX "memories_memoryType_idx" ON "public"."memories"("memoryType");

-- CreateIndex
CREATE INDEX "memories_isCompleted_idx" ON "public"."memories"("isCompleted");

-- CreateIndex
CREATE INDEX "memories_dueDate_idx" ON "public"."memories"("dueDate");

-- AddForeignKey
ALTER TABLE "public"."emails" ADD CONSTRAINT "emails_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "public"."contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."emails" ADD CONSTRAINT "emails_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "public"."threads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."memories" ADD CONSTRAINT "memories_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "public"."contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."memories" ADD CONSTRAINT "memories_emailId_fkey" FOREIGN KEY ("emailId") REFERENCES "public"."emails"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."memories" ADD CONSTRAINT "memories_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "public"."threads"("id") ON DELETE SET NULL ON UPDATE CASCADE;
