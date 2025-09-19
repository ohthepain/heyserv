import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Create sample contacts
  const contact1 = await prisma.contact.upsert({
    where: { email: "jane@company.com" },
    update: {},
    create: {
      email: "jane@company.com",
      name: "Jane Smith",
    },
  });

  const contact2 = await prisma.contact.upsert({
    where: { email: "bob@client.com" },
    update: {},
    create: {
      email: "bob@client.com",
      name: "Bob Johnson",
    },
  });

  console.log("✅ Created contacts:", contact1.name, contact2.name);

  // Create sample threads
  const thread1 = await prisma.thread.create({
    data: {
      gmailThreadId: "thread_12345",
      subject: "Project Discussion",
      participants: ["user@example.com", "jane@company.com"],
      lastMessageAt: new Date("2024-01-15T10:30:00Z"),
      messageCount: 3,
    },
  });

  const thread2 = await prisma.thread.create({
    data: {
      gmailThreadId: "thread_67890",
      subject: "Meeting Request",
      participants: ["user@example.com", "bob@client.com"],
      lastMessageAt: new Date("2024-01-16T14:20:00Z"),
      messageCount: 2,
    },
  });

  console.log("✅ Created threads:", thread1.gmailThreadId, thread2.gmailThreadId);

  // Create sample emails
  const email1 = await prisma.email.create({
    data: {
      gmailId: "email_001",
      subject: "Project Discussion",
      senderEmail: "jane@company.com",
      recipientEmails: ["user@example.com"],
      body: "Hi John, I wanted to discuss the project timeline. Can we schedule a meeting for next week?",
      snippet: "Hi John, I wanted to discuss the project timeline...",
      labels: ["INBOX", "WORK"],
      receivedAt: new Date("2024-01-15T10:30:00Z"),
      contactId: contact1.id,
      threadId: thread1.id,
    },
  });

  const email2 = await prisma.email.create({
    data: {
      gmailId: "email_002",
      subject: "Meeting Request",
      senderEmail: "bob@client.com",
      recipientEmails: ["user@example.com"],
      body: "Hello, I would like to schedule a meeting to discuss the new requirements. Are you available tomorrow at 2 PM?",
      snippet: "Hello, I would like to schedule a meeting...",
      labels: ["INBOX", "IMPORTANT"],
      receivedAt: new Date("2024-01-16T14:20:00Z"),
      contactId: contact2.id,
      threadId: thread2.id,
    },
  });

  console.log("✅ Created emails:", email1.gmailId, email2.gmailId);

  // Create sample memories
  const memory1 = await prisma.memory.create({
    data: {
      text: "Need to schedule project timeline meeting with Jane",
      memoryType: "action_item",
      priority: 3,
      dueDate: new Date("2024-01-20T00:00:00Z"),
      contactId: contact1.id,
      emailId: email1.id,
      threadId: thread1.id,
    },
  });

  const memory2 = await prisma.memory.create({
    data: {
      text: "Bob wants to discuss new requirements - high priority client",
      memoryType: "important_info",
      priority: 4,
      contactId: contact2.id,
      emailId: email2.id,
      threadId: thread2.id,
    },
  });

  const memory3 = await prisma.memory.create({
    data: {
      text: "Follow up on project status with Jane after meeting",
      memoryType: "follow_up",
      priority: 2,
      contactId: contact1.id,
      emailId: email1.id,
      threadId: thread1.id,
    },
  });

  console.log("✅ Created memories:", memory1.text, memory2.text, memory3.text);

  console.log("🎉 Database seeding completed!");
}

main()
  .catch((e) => {
    console.error("❌ Error seeding database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
