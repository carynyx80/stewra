import type { MemberRole } from "@prisma/client";
import { prisma } from "./db.js";
import { forbidden, notFound } from "./errors.js";

const rank: Record<MemberRole, number> = { MEMBER: 1, ADMIN: 2, OWNER: 3 };

/** Server-side organization access check. Every org-scoped route goes through this. */
export async function requireOrgRole(orgId: string, userId: string, minRole: MemberRole = "MEMBER") {
  const membership = await prisma.organizationMember.findUnique({ where: { orgId_userId: { orgId, userId } } });
  if (!membership) {
    const exists = await prisma.organization.count({ where: { id: orgId } });
    throw exists ? forbidden() : notFound("Organization");
  }
  if (rank[membership.role] < rank[minRole]) throw forbidden(`This action requires the ${minRole} role`);
  return membership;
}
