import type { RequestHandler } from "express";
import { getAuth, clerkClient } from "@clerk/express";
import { eq, count } from "drizzle-orm";
import { db, woundenceUsers, type WoundenceUser } from "@workspace/db";
import { logger } from "./logger";

/**
 * Resolves the local `woundenceUsers` row for a Clerk-authenticated request,
 * creating it (or linking it to a pre-existing row by email) on first sight.
 *
 * This keeps the stable local UUID primary key intact across re-auths so
 * existing foreign keys (appointments, visits, treatment plans, files, audit
 * logs) never get orphaned when a provider switches from the old Replit OIDC
 * identity to Clerk.
 */
async function resolveLocalUser(clerkUserId: string): Promise<WoundenceUser> {
  const [existing] = await db
    .select()
    .from(woundenceUsers)
    .where(eq(woundenceUsers.clerkUserId, clerkUserId));
  if (existing) return existing;

  const clerkUser = await clerkClient.users.getUser(clerkUserId);
  const primaryEmail = clerkUser.emailAddresses.find(
    (e) => e.id === clerkUser.primaryEmailAddressId,
  );
  const email = primaryEmail?.emailAddress ?? clerkUser.emailAddresses[0]?.emailAddress ?? null;

  // The very first user ever is bootstrapped as an active "provider" so
  // there's always someone able to approve everyone after them (see
  // requireAuth below). Every subsequent sign-up starts "pending" and is
  // blocked until an existing provider promotes them via PATCH
  // /api/users/:id/role — otherwise anyone who creates a Clerk account gets
  // immediate access to all patient data.
  //
  // The conflict target is `clerkUserId` (not `email`) because that's the
  // column this function looks up by above; concurrent first-sign-in requests
  // (e.g. multiple components calling /api/auth/user right after login) can
  // race to insert the same clerkUserId, and only an ON CONFLICT (clerk_user_id)
  // clause makes that race idempotent instead of throwing a raw duplicate-key
  // error. The `set` clause deliberately omits `role` so this never resets an
  // existing user's approval status.
  const [{ existingUserCount }] = await db.select({ existingUserCount: count() }).from(woundenceUsers);
  const initialRole = Number(existingUserCount) === 0 ? "provider" : "pending";

  const [user] = await db
    .insert(woundenceUsers)
    .values({
      clerkUserId,
      email,
      firstName: clerkUser.firstName ?? null,
      lastName: clerkUser.lastName ?? null,
      profileImageUrl: clerkUser.imageUrl ?? null,
      role: initialRole,
    })
    .onConflictDoUpdate({
      target: woundenceUsers.clerkUserId,
      set: {
        email,
        firstName: clerkUser.firstName ?? null,
        lastName: clerkUser.lastName ?? null,
        profileImageUrl: clerkUser.imageUrl ?? null,
        updatedAt: new Date(),
      },
    })
    .returning();
  return user;
}

/**
 * Express middleware guarding EMR API routes. Requires a valid Clerk
 * session/token (cookie on web, bearer token on mobile) and attaches the
 * resolved local user (and its stable local id) to the request.
 */
export const requireAuth: RequestHandler = async (req, res, next) => {
  const auth = getAuth(req);
  const clerkUserId = auth?.userId;

  if (!clerkUserId) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const localUser = await resolveLocalUser(clerkUserId);
    if (localUser.role === "pending") {
      logger.warn({ userId: localUser.id, email: localUser.email }, "Blocked request from a pending (unapproved) user");
      res.status(403).json({ message: "Your account is awaiting approval from an existing provider." });
      return;
    }
    (req as any).userId = localUser.id;
    (req as any).localUser = localUser;
    next();
  } catch (err) {
    logger.error({ err }, "Failed to resolve local user for Clerk session");
    res.status(500).json({ message: "Failed to resolve user" });
  }
};
