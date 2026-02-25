import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { prisma } from "@/lib/db";

export const { handlers, signIn, signOut, auth } = NextAuth({
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        try {
          if (!credentials?.email || !credentials?.password) return null;

          const user = await prisma.user.findUnique({
            where: { email: credentials.email as string },
            include: {
              orgMemberships: {
                include: {
                  organization: { select: { id: true, name: true } },
                  customRole: { select: { permissions: true } },
                },
                take: 1,
              },
            },
          });

          if (!user || !user.isActive) return null;

          const isValid = await compare(
            credentials.password as string,
            user.passwordHash
          );

          if (!isValid) return null;

          // Get primary org membership if exists
          const membership = user.orgMemberships[0];

          return {
            id: user.id,
            email: user.email,
            name: `${user.firstName} ${user.lastName}`,
            role: user.role,
            organizationId: membership?.organization?.id || null,
            organizationName: membership?.organization?.name || null,
            orgRole: membership?.role || null,
            departmentId: membership?.departmentId || null,
            customPermissions: (membership?.customRole?.permissions as Record<string, string[]>) || null,
          };
        } catch (error) {
          console.error("[AUTH] Login error:", error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const u = user as typeof user & {
          role: string;
          organizationId?: string | null;
          organizationName?: string | null;
          orgRole?: string | null;
          departmentId?: string | null;
          customPermissions?: Record<string, string[]> | null;
        };
        token.id = u.id!;
        token.role = u.role;
        token.organizationId = u.organizationId ?? null;
        token.organizationName = u.organizationName ?? null;
        token.orgRole = u.orgRole ?? null;
        token.departmentId = u.departmentId ?? null;
        token.customPermissions = u.customPermissions ?? null;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role;
        session.user.organizationId = token.organizationId;
        session.user.organizationName = token.organizationName;
        session.user.orgRole = token.orgRole;
        session.user.departmentId = token.departmentId;
        session.user.customPermissions = token.customPermissions;
      }
      return session;
    },
  },
});
