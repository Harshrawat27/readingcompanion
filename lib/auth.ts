import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { PrismaClient } from '@prisma/client';

// Create Prisma client
const prisma = new PrismaClient();

export const auth = betterAuth({
  // Database connection
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),

  // App configuration
  appName: 'Reading Companion',

  // Authentication methods
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false, // Set to true in production
  },

  // Social login providers
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    },
    github: {
      clientId: process.env.GITHUB_CLIENT_ID as string,
      clientSecret: process.env.GITHUB_CLIENT_SECRET as string,
    },
  },

  // Session configuration
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // Update session every day
  },

  // Advanced settings
  advanced: {
    crossSubDomainCookies: {
      enabled: false,
    },
  },
});

// We'll add types later when we need them
