import { prisma } from "@/lib/db";

/**
 * Resolves the user's organization ID.
 * Falls back to the user's first org membership if the provided ID is invalid.
 */
export async function resolveOrganizationId(
  userId: string,
  providedOrgId: string | null
): Promise<string | null> {
  // If an org ID is provided, verify the user is a member
  if (providedOrgId) {
    const member = await prisma.orgMember.findUnique({
      where: {
        userId_organizationId: { userId, organizationId: providedOrgId },
      },
      select: { organizationId: true },
    });
    if (member) return member.organizationId;
  }

  // Fall back to the user's first org membership
  const membership = await prisma.orgMember.findFirst({
    where: { userId },
    select: { organizationId: true },
  });

  return membership?.organizationId ?? null;
}
