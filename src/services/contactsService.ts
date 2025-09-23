import { prisma } from "../database.js";

export class ContactsService {
  // ==================== CONTACT OPERATIONS ====================

  async createContact(email: string, name?: string, avatar?: string) {
    return await prisma.contact.create({
      data: { email, name, avatar },
    });
  }

  async findContactByEmail(email: string) {
    return await prisma.contact.findUnique({
      where: { email },
      include: {
        emails: {
          orderBy: { receivedAt: "desc" },
          take: 10,
        },
        memories: {
          orderBy: { createdAt: "desc" },
          take: 10,
        },
      },
    });
  }

  async findContactById(id: string) {
    return await prisma.contact.findUnique({
      where: { id },
      include: {
        emails: {
          orderBy: { receivedAt: "desc" },
        },
        memories: {
          orderBy: { createdAt: "desc" },
        },
      },
    });
  }

  async getAllContacts(limit = 100) {
    return await prisma.contact.findMany({
      orderBy: { name: "asc" },
      take: limit,
      include: {
        _count: {
          select: {
            emails: true,
          },
        },
      },
    });
  }

  async updateContact(id: string, data: { name?: string; avatar?: string }) {
    return await prisma.contact.update({
      where: { id },
      data,
    });
  }

  async deleteContact(id: string) {
    return await prisma.contact.delete({
      where: { id },
    });
  }

  // ==================== EMAIL OPERATIONS ====================

  async createEmail(data: {
    gmailId: string;
    subject?: string;
    senderEmail: string;
    recipientEmails?: string[];
    ccEmails?: string[];
    bccEmails?: string[];
    body?: string;
    bodyHtml?: string;
    snippet?: string;
    labels?: string[];
    receivedAt: Date;
    contactId: string;
    threadId: string;
  }) {
    return await prisma.email.create({
      data: {
        ...data,
        recipientEmails: data.recipientEmails || [],
        ccEmails: data.ccEmails || [],
        bccEmails: data.bccEmails || [],
        labels: data.labels || [],
      },
    });
  }

  async findEmailByGmailId(gmailId: string) {
    return await prisma.email.findUnique({
      where: { gmailId },
      include: {
        contact: true,
        threads: true,
      },
    });
  }

  async getEmailsByContact(contactId: string, limit = 50) {
    return await prisma.email.findMany({
      where: { contactId },
      include: {
        threads: true,
      },
      orderBy: { receivedAt: "desc" },
      take: limit,
    });
  }

  async searchEmails(query: string, contactId?: string) {
    const whereClause: any = {
      OR: [
        { subject: { contains: query, mode: "insensitive" } },
        { body: { contains: query, mode: "insensitive" } },
        { senderEmail: { contains: query, mode: "insensitive" } },
        { snippet: { contains: query, mode: "insensitive" } },
      ],
    };

    if (contactId) {
      whereClause.contactId = contactId;
    }

    return await prisma.email.findMany({
      where: whereClause,
      include: {
        contact: true,
        threads: true,
      },
      orderBy: { receivedAt: "desc" },
    });
  }

  async markEmailAsRead(id: string) {
    return await prisma.email.update({
      where: { id },
      data: { isRead: true },
    });
  }

  async markEmailAsStarred(id: string, starred: boolean) {
    return await prisma.email.update({
      where: { id },
      data: { isStarred: starred },
    });
  }

  // ==================== THREAD OPERATIONS ====================

  async createThread(data: { threadId: string; subject?: string; emailId: string }) {
    return await prisma.emailThread.create({
      data: {
        threadId: data.threadId,
        subject: data.subject,
        emailId: data.emailId,
      },
    });
  }

  async findThreadByGmailId(threadId: string) {
    return await prisma.emailThread.findUnique({
      where: { threadId },
      include: {
        email: {
          include: {
            contact: true,
          },
        },
      },
    });
  }

  async getThreadsByContact(contactId: string, limit = 50) {
    return await prisma.emailThread.findMany({
      where: {
        email: {
          contactId,
        },
      },
      include: {
        email: {
          include: { contact: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  }

  async updateThreadLastMessage(threadId: string, lastMessageAt: Date) {
    return await prisma.emailThread.update({
      where: { id: threadId },
      data: { updatedAt: lastMessageAt },
    });
  }

  // ==================== MEMORY OPERATIONS ====================

  async createMemory(data: { contactId: string; content: string; type?: string; metadata?: any; threadId?: string }) {
    return await prisma.memory.create({
      data: {
        contactId: data.contactId,
        content: data.content,
        type: data.type || "note",
        metadata: data.metadata,
        threadId: data.threadId,
      },
    });
  }

  async getMemoriesByContact(
    contactId: string,
    options?: {
      threadId?: string;
      type?: string;
    }
  ) {
    const whereClause: any = { contactId };
    if (options?.threadId) whereClause.threadId = options.threadId;
    if (options?.type) whereClause.type = options.type;

    return await prisma.memory.findMany({
      where: whereClause,
      include: {
        thread: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async updateMemory(
    id: string,
    data: {
      content?: string;
      type?: string;
      metadata?: any;
    }
  ) {
    return await prisma.memory.update({
      where: { id },
      data,
    });
  }

  async markMemoryAsCompleted(id: string) {
    return await prisma.memory.update({
      where: { id },
      data: { metadata: { isCompleted: true } },
    });
  }

  async deleteMemory(id: string) {
    return await prisma.memory.delete({
      where: { id },
    });
  }

  // ==================== ANALYTICS ====================

  async getContactStats(contactId: string) {
    const [totalEmails, unreadEmails, starredEmails, totalMemories] = await Promise.all([
      prisma.email.count({ where: { contactId } }),
      prisma.email.count({ where: { contactId, isRead: false } }),
      prisma.email.count({ where: { contactId, isStarred: true } }),
      prisma.memory.count({ where: { contactId } }),
    ]);

    return { totalEmails, unreadEmails, starredEmails, totalMemories };
  }

  async getGlobalStats() {
    const [totalContacts, totalEmails, totalThreads, totalMemories] = await Promise.all([
      prisma.contact.count(),
      prisma.email.count(),
      prisma.emailThread.count(),
      prisma.memory.count(),
    ]);

    return { totalContacts, totalEmails, totalThreads, totalMemories };
  }

  // ==================== SEARCH ====================

  async searchAll(query: string, contactId?: string) {
    const [emails, threads, memories] = await Promise.all([
      this.searchEmails(query, contactId),
      prisma.emailThread.findMany({
        where: {
          subject: { contains: query, mode: "insensitive" },
          ...(contactId && {
            email: { contactId },
          }),
        },
        include: {
          email: {
            include: { contact: true },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.memory.findMany({
        where: {
          content: { contains: query, mode: "insensitive" },
          ...(contactId && { contactId }),
        },
        include: {
          contact: true,
          thread: true,
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    return { emails, threads, memories };
  }

  // ==================== UTILITY ====================

  async healthCheck() {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      console.error("Database health check failed:", error);
      return false;
    }
  }

  async disconnect() {
    await prisma.$disconnect();
  }
}

// Export singleton instance
export const contactsService = new ContactsService();
