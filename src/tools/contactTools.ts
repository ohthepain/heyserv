import { z } from "zod";
import { contactsService } from "../services/contactsService.js";

// ==================== CONTACT TOOLS ====================

export const createContactTool = {
  name: "createContact",
  title: "Create Contact",
  description: "Create a new contact in the database",
  inputSchema: {
    email: z.string().email("Valid email address required"),
    name: z.string().optional(),
    avatar: z.string().optional(),
  },
  annotations: {
    readOnlyHint: false,
    idempotentHint: false,
    destructiveHint: false,
    openWorldHint: false,
  },
  handler: async ({ email, name, avatar }: { email: string; name?: string; avatar?: string }) => {
    try {
      const result = await contactsService.createContact(email, name, avatar);
      return {
        content: [
          {
            type: "text" as const,
            text: `✅ Contact created successfully!\n\n${JSON.stringify(result, null, 2)}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text" as const,
            text: `❌ Error creating contact: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
      };
    }
  },
};

export const getContactTool = {
  name: "getContact",
  title: "Get Contact",
  description: "Get contact details by email address",
  inputSchema: {
    email: z.string().email("Valid email address required"),
  },
  annotations: {
    readOnlyHint: true,
    idempotentHint: true,
    destructiveHint: false,
    openWorldHint: false,
  },
  handler: async ({ email }: { email: string }) => {
    try {
      const result = await contactsService.findContactByEmail(email);
      if (!result) {
        return {
          content: [
            {
              type: "text" as const,
              text: `❌ Contact not found: ${email}`,
            },
          ],
        };
      }
      return {
        content: [
          {
            type: "text" as const,
            text: `✅ Contact found!\n\n${JSON.stringify(result, null, 2)}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text" as const,
            text: `❌ Error getting contact: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
      };
    }
  },
};

export const listContactsTool = {
  name: "listContacts",
  title: "List Contacts",
  description: "Get a list of all contacts",
  inputSchema: {
    limit: z.number().min(1).max(1000).default(100).optional(),
  },
  annotations: {
    readOnlyHint: true,
    idempotentHint: true,
    destructiveHint: false,
    openWorldHint: false,
  },
  handler: async ({ limit = 100 }: { limit?: number }) => {
    try {
      const result = await contactsService.getAllContacts(limit);
      return {
        content: [
          {
            type: "text" as const,
            text: `✅ Found ${result.length} contacts:\n\n${JSON.stringify(result, null, 2)}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text" as const,
            text: `❌ Error listing contacts: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
      };
    }
  },
};

export const updateContactTool = {
  name: "updateContact",
  title: "Update Contact",
  description: "Update contact information",
  inputSchema: {
    email: z.string().email("Valid email address required"),
    name: z.string().optional(),
    avatar: z.string().optional(),
  },
  annotations: {
    readOnlyHint: false,
    idempotentHint: true,
    destructiveHint: false,
    openWorldHint: false,
  },
  handler: async ({ email, name, avatar }: { email: string; name?: string; avatar?: string }) => {
    try {
      const contact = await contactsService.findContactByEmail(email);
      if (!contact) {
        return {
          content: [
            {
              type: "text" as const,
              text: `❌ Contact not found: ${email}`,
            },
          ],
        };
      }
      const result = await contactsService.updateContact(contact.id, { name, avatar });
      return {
        content: [
          {
            type: "text" as const,
            text: `✅ Contact updated successfully!\n\n${JSON.stringify(result, null, 2)}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text" as const,
            text: `❌ Error updating contact: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
      };
    }
  },
};

export const deleteContactTool = {
  name: "deleteContact",
  title: "Delete Contact",
  description: "Delete a contact and all associated data",
  inputSchema: {
    email: z.string().email("Valid email address required"),
  },
  annotations: {
    readOnlyHint: false,
    idempotentHint: true,
    destructiveHint: true,
    openWorldHint: false,
  },
  handler: async ({ email }: { email: string }) => {
    try {
      const contact = await contactsService.findContactByEmail(email);
      if (!contact) {
        return {
          content: [
            {
              type: "text" as const,
              text: `❌ Contact not found: ${email}`,
            },
          ],
        };
      }
      await contactsService.deleteContact(contact.id);
      return {
        content: [
          {
            type: "text" as const,
            text: `✅ Contact deleted successfully: ${email}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text" as const,
            text: `❌ Error deleting contact: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
      };
    }
  },
};

// ==================== MEMORY TOOLS ====================

export const createMemoryTool = {
  name: "createMemory",
  title: "Create Memory",
  description: "Create a memory for a contact",
  inputSchema: {
    email: z.string().email("Valid email address required"),
    text: z.string().min(1, "Memory text required"),
    memoryType: z.string().optional(),
    priority: z.number().min(1).max(5).default(1).optional(),
    dueDate: z.string().optional(),
    emailId: z.string().optional(),
    threadId: z.string().optional(),
  },
  annotations: {
    readOnlyHint: false,
    idempotentHint: false,
    destructiveHint: false,
    openWorldHint: false,
  },
  handler: async ({
    email,
    text,
    memoryType,
    priority = 1,
    dueDate,
    emailId,
    threadId,
  }: {
    email: string;
    text: string;
    memoryType?: string;
    priority?: number;
    dueDate?: string;
    emailId?: string;
    threadId?: string;
  }) => {
    try {
      const contact = await contactsService.findContactByEmail(email);
      if (!contact) {
        return {
          content: [
            {
              type: "text" as const,
              text: `❌ Contact not found: ${email}`,
            },
          ],
        };
      }
      const result = await contactsService.createMemory({
        contactId: contact.id,
        text,
        memoryType,
        priority,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        emailId,
        threadId,
      });
      return {
        content: [
          {
            type: "text" as const,
            text: `✅ Memory created successfully!\n\n${JSON.stringify(result, null, 2)}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text" as const,
            text: `❌ Error creating memory: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
      };
    }
  },
};

export const getMemoriesTool = {
  name: "getMemories",
  title: "Get Memories",
  description: "Get memories for a contact",
  inputSchema: {
    email: z.string().email("Valid email address required"),
    memoryType: z.string().optional(),
    isCompleted: z.boolean().optional(),
    limit: z.number().min(1).max(100).default(50).optional(),
  },
  annotations: {
    readOnlyHint: true,
    idempotentHint: true,
    destructiveHint: false,
    openWorldHint: false,
  },
  handler: async ({
    email,
    memoryType,
    isCompleted,
    limit = 50,
  }: {
    email: string;
    memoryType?: string;
    isCompleted?: boolean;
    limit?: number;
  }) => {
    try {
      const contact = await contactsService.findContactByEmail(email);
      if (!contact) {
        return {
          content: [
            {
              type: "text" as const,
              text: `❌ Contact not found: ${email}`,
            },
          ],
        };
      }
      const result = await contactsService.getMemoriesByContact(contact.id, {
        memoryType,
        isCompleted,
      });
      const limitedResult = result.slice(0, limit);
      return {
        content: [
          {
            type: "text" as const,
            text: `✅ Found ${limitedResult.length} memories:\n\n${JSON.stringify(limitedResult, null, 2)}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text" as const,
            text: `❌ Error getting memories: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
      };
    }
  },
};

// ==================== ANALYTICS TOOLS ====================

export const getContactStatsTool = {
  name: "getContactStats",
  title: "Get Contact Stats",
  description: "Get statistics for a specific contact",
  inputSchema: {
    email: z.string().email("Valid email address required"),
  },
  annotations: {
    readOnlyHint: true,
    idempotentHint: true,
    destructiveHint: false,
    openWorldHint: false,
  },
  handler: async ({ email }: { email: string }) => {
    try {
      const contact = await contactsService.findContactByEmail(email);
      if (!contact) {
        return {
          content: [
            {
              type: "text" as const,
              text: `❌ Contact not found: ${email}`,
            },
          ],
        };
      }
      const result = await contactsService.getContactStats(contact.id);
      return {
        content: [
          {
            type: "text" as const,
            text: `✅ Contact stats for ${email}:\n\n${JSON.stringify(result, null, 2)}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text" as const,
            text: `❌ Error getting contact stats: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
      };
    }
  },
};

export const getGlobalStatsTool = {
  name: "getGlobalStats",
  title: "Get Global Stats",
  description: "Get global database statistics",
  inputSchema: {},
  annotations: {
    readOnlyHint: true,
    idempotentHint: true,
    destructiveHint: false,
    openWorldHint: false,
  },
  handler: async () => {
    try {
      const result = await contactsService.getGlobalStats();
      return {
        content: [
          {
            type: "text" as const,
            text: `✅ Global database stats:\n\n${JSON.stringify(result, null, 2)}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text" as const,
            text: `❌ Error getting global stats: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
      };
    }
  },
};
