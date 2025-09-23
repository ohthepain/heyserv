import { prisma } from "../database.js";

// Type definitions for normalized schema
export interface SignoffPreferences {
  professional: string;
  casual: string;
  formal: string;
  friendly: string;
  polite: string;
  urgent: string;
  apologetic: string;
  neutral: string;
}

export interface SpacingPreferences {
  blankLineBeforeSignoff: boolean;
  blankLineBeforeName: boolean;
  blankLineAfterSalutation: boolean;
}

export interface DefaultPreferences {
  defaultTone: string;
  defaultSignoff: string | null;
  includeSignature: boolean;
}

export interface SignaturePreferences {
  text: string;
  html: string;
  includeInEmails: boolean;
}

export interface NamePreferences {
  formal: string; // Full formal name (e.g., "Dr. John Smith")
  casual: string; // Casual/friendly name (e.g., "John")
  professional: string; // Professional name (e.g., "John Smith")
}

export interface EmailPreferences {
  signoffs: SignoffPreferences;
  spacing: SpacingPreferences;
  defaults: DefaultPreferences;
  signature: SignaturePreferences;
  names: NamePreferences;
}

export interface UserProfile {
  id: string;
  userId: string;
  emailPreferences: EmailPreferences;
  createdAt: Date;
  updatedAt: Date;
}

// Default email preferences
export const DEFAULT_EMAIL_PREFERENCES: EmailPreferences = {
  signoffs: {
    professional: "Best regards",
    casual: "Best",
    formal: "Sincerely",
    friendly: "Cheers",
    polite: "Thank you",
    urgent: "Best regards",
    apologetic: "Best regards",
    neutral: "Best regards",
  },
  spacing: {
    blankLineBeforeSignoff: true,
    blankLineBeforeName: true,
    blankLineAfterSalutation: false,
  },
  defaults: {
    defaultTone: "professional",
    defaultSignoff: null,
    includeSignature: true,
  },
  signature: {
    text: "",
    html: "",
    includeInEmails: true,
  },
  names: {
    formal: "",
    casual: "",
    professional: "",
  },
};

export class ProfileService {
  /**
   * Get user profile by userId, creating one with defaults if it doesn't exist
   */
  async getOrCreateProfile(userId: string): Promise<UserProfile> {
    let profile = await prisma.userProfile.findUnique({
      where: { userId },
      include: {
        signoffs: true,
        spacing: true,
        defaults: true,
        signature: true,
        names: true,
      },
    });

    if (!profile) {
      // Create profile with default preferences
      profile = await this.createProfileWithDefaults(userId);
    }

    return this.normalizeProfile(profile);
  }

  /**
   * Create a new profile with default preferences
   */
  private async createProfileWithDefaults(userId: string): Promise<any> {
    return await prisma.userProfile.create({
      data: {
        userId,
        signoffs: {
          create: [
            { tone: "professional", signoff: "Best regards" },
            { tone: "casual", signoff: "Best" },
            { tone: "formal", signoff: "Sincerely" },
            { tone: "friendly", signoff: "Cheers" },
            { tone: "polite", signoff: "Thank you" },
            { tone: "urgent", signoff: "Best regards" },
            { tone: "apologetic", signoff: "Best regards" },
            { tone: "neutral", signoff: "Best regards" },
          ],
        },
        spacing: {
          create: {
            blankLineBeforeSignoff: true,
            blankLineBeforeName: true,
            blankLineAfterSalutation: false,
          },
        },
        defaults: {
          create: {
            defaultTone: "professional",
            defaultSignoff: null,
            includeSignature: true,
          },
        },
        signature: {
          create: {
            text: "",
            html: "",
            includeInEmails: true,
          },
        },
        names: {
          create: {
            formal: "",
            casual: "",
            professional: "",
          },
        },
      },
      include: {
        signoffs: true,
        spacing: true,
        defaults: true,
        signature: true,
        names: true,
      },
    });
  }

  /**
   * Normalize profile data from database to EmailPreferences format
   */
  private normalizeProfile(profile: any): UserProfile {
    const signoffs: SignoffPreferences = {
      professional: "",
      casual: "",
      formal: "",
      friendly: "",
      polite: "",
      urgent: "",
      apologetic: "",
      neutral: "",
    };

    // Map signoffs from array to object
    profile.signoffs.forEach((signoff: any) => {
      if (signoff.tone in signoffs) {
        signoffs[signoff.tone as keyof SignoffPreferences] = signoff.signoff;
      }
    });

    const emailPreferences: EmailPreferences = {
      signoffs,
      spacing: profile.spacing || DEFAULT_EMAIL_PREFERENCES.spacing,
      defaults: profile.defaults || DEFAULT_EMAIL_PREFERENCES.defaults,
      signature: profile.signature || DEFAULT_EMAIL_PREFERENCES.signature,
      names: profile.names || DEFAULT_EMAIL_PREFERENCES.names,
    };

    return {
      id: profile.id,
      userId: profile.userId,
      emailPreferences,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
    };
  }

  /**
   * Update user profile preferences
   */
  async updateProfile(userId: string, preferences: Partial<EmailPreferences>): Promise<UserProfile> {
    await this.getOrCreateProfile(userId); // Ensure profile exists

    // Update signoffs if provided
    if (preferences.signoffs) {
      for (const [tone, signoff] of Object.entries(preferences.signoffs)) {
        await prisma.userSignoff.upsert({
          where: {
            userId_tone: {
              userId,
              tone,
            },
          },
          update: { signoff },
          create: {
            userId,
            tone,
            signoff,
          },
        });
      }
    }

    // Update spacing if provided
    if (preferences.spacing) {
      await prisma.userSpacing.upsert({
        where: { userId },
        update: preferences.spacing,
        create: {
          userId,
          ...preferences.spacing,
        },
      });
    }

    // Update defaults if provided
    if (preferences.defaults) {
      await prisma.userDefaults.upsert({
        where: { userId },
        update: preferences.defaults,
        create: {
          userId,
          ...preferences.defaults,
        },
      });
    }

    // Update signature if provided
    if (preferences.signature) {
      await prisma.userSignature.upsert({
        where: { userId },
        update: preferences.signature,
        create: {
          userId,
          ...preferences.signature,
        },
      });
    }

    // Update names if provided
    if (preferences.names) {
      await prisma.userNames.upsert({
        where: { userId },
        update: preferences.names,
        create: {
          userId,
          ...preferences.names,
        },
      });
    }

    return this.getOrCreateProfile(userId);
  }

  /**
   * Update signoff for specific tone
   */
  async updateSignoff(userId: string, tone: keyof SignoffPreferences, signoff: string): Promise<UserProfile> {
    await this.getOrCreateProfile(userId); // Ensure profile exists

    await prisma.userSignoff.upsert({
      where: {
        userId_tone: {
          userId,
          tone,
        },
      },
      update: { signoff },
      create: {
        userId,
        tone,
        signoff,
      },
    });

    return this.getOrCreateProfile(userId);
  }

  /**
   * Update spacing preferences
   */
  async updateSpacing(userId: string, spacing: Partial<SpacingPreferences>): Promise<UserProfile> {
    await this.getOrCreateProfile(userId); // Ensure profile exists

    await prisma.userSpacing.upsert({
      where: { userId },
      update: spacing,
      create: {
        userId,
        blankLineBeforeSignoff: true,
        blankLineBeforeName: true,
        blankLineAfterSalutation: false,
        ...spacing,
      },
    });

    return this.getOrCreateProfile(userId);
  }

  /**
   * Update default preferences
   */
  async updateDefaults(userId: string, defaults: Partial<DefaultPreferences>): Promise<UserProfile> {
    await this.getOrCreateProfile(userId); // Ensure profile exists

    await prisma.userDefaults.upsert({
      where: { userId },
      update: defaults,
      create: {
        userId,
        defaultTone: "professional",
        defaultSignoff: null,
        includeSignature: true,
        ...defaults,
      },
    });

    return this.getOrCreateProfile(userId);
  }

  /**
   * Update signature preferences
   */
  async updateSignature(userId: string, signature: Partial<SignaturePreferences>): Promise<UserProfile> {
    await this.getOrCreateProfile(userId); // Ensure profile exists

    await prisma.userSignature.upsert({
      where: { userId },
      update: signature,
      create: {
        userId,
        text: "",
        html: "",
        includeInEmails: true,
        ...signature,
      },
    });

    return this.getOrCreateProfile(userId);
  }

  /**
   * Update name preferences
   */
  async updateNames(userId: string, names: Partial<NamePreferences>): Promise<UserProfile> {
    await this.getOrCreateProfile(userId); // Ensure profile exists

    await prisma.userNames.upsert({
      where: { userId },
      update: names,
      create: {
        userId,
        formal: "",
        casual: "",
        professional: "",
        ...names,
      },
    });

    return this.getOrCreateProfile(userId);
  }

  /**
   * Get signoff for a specific tone
   */
  async getSignoff(userId: string, tone: keyof SignoffPreferences): Promise<string> {
    const profile = await this.getOrCreateProfile(userId);
    return profile.emailPreferences.signoffs[tone];
  }

  /**
   * Get spacing preferences
   */
  async getSpacing(userId: string): Promise<SpacingPreferences> {
    const profile = await this.getOrCreateProfile(userId);
    return profile.emailPreferences.spacing;
  }

  /**
   * Get default preferences
   */
  async getDefaults(userId: string): Promise<DefaultPreferences> {
    const profile = await this.getOrCreateProfile(userId);
    return profile.emailPreferences.defaults;
  }

  /**
   * Format email body with user preferences
   */
  async formatEmailBody(
    userId: string,
    body: string,
    tone: keyof SignoffPreferences = "professional",
    customSignoff?: string
  ): Promise<string> {
    const profile = await this.getOrCreateProfile(userId);
    const preferences = profile.emailPreferences;

    // Get the signoff to use
    const signoff = customSignoff || preferences.signoffs[tone];

    // Build the formatted body
    let formattedBody = body;

    // Add spacing after salutation if enabled
    if (preferences.spacing.blankLineAfterSalutation) {
      // This would need to be implemented based on how you detect salutations
      // For now, we'll just ensure proper spacing at the end
    }

    // Add signoff with proper spacing
    if (signoff) {
      if (preferences.spacing.blankLineBeforeSignoff) {
        formattedBody += "\n";
      }
      formattedBody += signoff;

      // Add user name based on tone
      const userName = this.getUserNameForTone(preferences.names, tone);
      if (userName) {
        if (preferences.spacing.blankLineBeforeName) {
          formattedBody += "\n";
        }
        formattedBody += userName;
      }

      // Add signature if enabled
      if (preferences.signature.includeInEmails && preferences.signature.text) {
        formattedBody += "\n\n";
        formattedBody += preferences.signature.text;
      }
    }

    return formattedBody;
  }

  /**
   * Get appropriate user name based on tone
   */
  private getUserNameForTone(names: NamePreferences, tone: keyof SignoffPreferences): string {
    switch (tone) {
      case "formal":
        return names.formal || names.professional;
      case "casual":
      case "friendly":
        return names.casual || names.professional;
      case "professional":
      case "polite":
      case "urgent":
      case "apologetic":
      case "neutral":
      default:
        return names.professional || names.formal || names.casual;
    }
  }

  /**
   * Delete user profile
   */
  async deleteProfile(userId: string): Promise<void> {
    await prisma.userProfile.delete({
      where: { userId },
    });
  }

  /**
   * Reset profile to default preferences
   */
  async resetProfile(userId: string): Promise<UserProfile> {
    // Delete all existing preferences
    await prisma.userSignoff.deleteMany({ where: { userId } });
    await prisma.userSpacing.deleteMany({ where: { userId } });
    await prisma.userDefaults.deleteMany({ where: { userId } });
    await prisma.userSignature.deleteMany({ where: { userId } });
    await prisma.userNames.deleteMany({ where: { userId } });

    // Recreate with defaults
    await this.createProfileWithDefaults(userId);

    return this.getOrCreateProfile(userId);
  }

  /**
   * Get all user profiles (for admin purposes)
   */
  async getAllProfiles(): Promise<UserProfile[]> {
    const profiles = await prisma.userProfile.findMany({
      include: {
        signoffs: true,
        spacing: true,
        defaults: true,
        signature: true,
        names: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return profiles.map((profile) => this.normalizeProfile(profile));
  }
}

export default ProfileService;
