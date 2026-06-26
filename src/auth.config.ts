import type { NextAuthConfig } from "next-auth";

// Edge-safe config — no Prisma, no Node.js built-ins.
// Used by proxy.ts (middleware) and spread into the full auth.ts config.
export const authConfig = {
  pages: { signIn: "/login" },
  session: { strategy: "jwt" as const },
  providers: [],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role: string }).role;
        token.instituteId = (user as { instituteId: string }).instituteId;
        token.batchId = (user as { batchId: string | null }).batchId;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.instituteId = token.instituteId as string;
        session.user.batchId = token.batchId as string | null;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
