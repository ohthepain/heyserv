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
            memories: true,
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
        thread: true,
        memories: true,
      },
    });
  }

  async getEmailsByContact(contactId: string, limit = 50) {
    return await prisma.email.findMany({
      where: { contactId },
      include: {
        thread: true,
        memories: true,
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
        thread: true,
        memories: true,
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

  async createThread(data: {
    gmailThreadId: string;
    subject?: string;
    participants: string[];
    lastMessageAt: Date;
    messageCount?: number;
    labels?: string[];
  }) {
    return await prisma.thread.create({
      data: {
        ...data,
        messageCount: data.messageCount || 1,
        labels: data.labels || [],
      },
    });
  }

  async findThreadByGmailId(gmailThreadId: string) {
    return await prisma.thread.findUnique({
      where: { gmailThreadId },
      include: {
        emails: {
          include: {
            contact: true,
            memories: true,
          },
          orderBy: { receivedAt: "asc" },
        },
        memories: true,
      },
    });
  }

  async getThreadsByContact(contactId: string, limit = 50) {
    return await prisma.thread.findMany({
      where: {
        emails: {
          some: { contactId },
        },
      },
      include: {
        emails: {
          where: { contactId },
          include: { contact: true },
        },
        memories: true,
      },
      orderBy: { lastMessageAt: "desc" },
      take: limit,
    });
  }

  async updateThreadLastMessage(threadId: string, lastMessageAt: Date) {
    return await prisma.thread.update({
      where: { id: threadId },
      data: { lastMessageAt },
    });
  }

  // ==================== MEMORY OPERATIONS ====================

  async createMemory(data: {
    contactId: string;
    text: string;
    memoryType?: string;
    priority?: number;
    dueDate?: Date;
    emailId?: string;
    threadId?: string;
  }) {
    return await prisma.memory.create({
      data: {
        ...data,
        priority: data.priority || 1,
      },
    });
  }

  async getMemoriesByContact(
    contactId: string,
    options?: {
      emailId?: string;
      threadId?: string;
      memoryType?: string;
      isCompleted?: boolean;
    }
  ) {
    const whereClause: any = { contactId };
    if (options?.emailId) whereClause.emailId = options.emailId;
    if (options?.threadId) whereClause.threadId = options.threadId;
    if (options?.memoryType) whereClause.memoryType = options.memoryType;
    if (options?.isCompleted !== undefined) whereClause.isCompleted = options.isCompleted;

    return await prisma.memory.findMany({
      where: whereClause,
      include: {
        email: true,
        thread: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async updateMemory(
    id: string,
    data: {
      text?: string;
      memoryType?: string;
      priority?: number;
      isCompleted?: boolean;
      dueDate?: Date;
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
      data: { isCompleted: true },
    });
  }

  async deleteMemory(id: string) {
    return await prisma.memory.delete({
      where: { id },
    });
  }

  // ==================== ANALYTICS ====================

  async getContactStats(contactId: string) {
    const [totalEmails, unreadEmails, starredEmails, totalMemories, completedMemories] = await Promise.all([
      prisma.email.count({ where: { contactId } }),
      prisma.email.count({ where: { contactId, isRead: false } }),
      prisma.email.count({ where: { contactId, isStarred: true } }),
      prisma.memory.count({ where: { contactId } }),
      prisma.memory.count({ where: { contactId, isCompleted: true } }),
    ]);

    return { totalEmails, unreadEmails, starredEmails, totalMemories, completedMemories };
  }

  async getGlobalStats() {
    const [totalContacts, totalEmails, totalThreads, totalMemories] = await Promise.all([
      prisma.contact.count(),
      prisma.email.count(),
      prisma.thread.count(),
      prisma.memory.count(),
    ]);

    return { totalContacts, totalEmails, totalThreads, totalMemories };
  }

  // ==================== SEARCH ====================

  async searchAll(query: string, contactId?: string) {
    const [emails, threads, memories] = await Promise.all([
      this.searchEmails(query, contactId),
      prisma.thread.findMany({
        where: {
          OR: [{ subject: { contains: query, mode: "insensitive" } }, { participants: { has: query } }],
          ...(contactId && {
            emails: { some: { contactId } },
          }),
        },
        include: {
          emails: {
            ...(contactId && { where: { contactId } }),
            include: { contact: true },
          },
        },
        orderBy: { lastMessageAt: "desc" },
      }),
      prisma.memory.findMany({
        where: {
          text: { contains: query, mode: "insensitive" },
          ...(contactId && { contactId }),
        },
        include: {
          contact: true,
          email: true,
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
