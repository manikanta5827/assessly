import { db } from '../db/index';
import { guestUsage } from '../db/schema';
import { eq, sql } from 'drizzle-orm';

export class GuestUsageRepository {
  async getUsage(id: string) {
    const usage = await db.query.guestUsage.findFirst({
      where: eq(guestUsage.id, id),
    });

    if (!usage) {
      return null;
    }

    // Reset if it's a new day
    const lastReset = new Date(usage.lastResetAt);
    const now = new Date();
    if (lastReset.toDateString() !== now.toDateString()) {
      await db
        .update(guestUsage)
        .set({
          count: 0,
          lastResetAt: now,
        })
        .where(eq(guestUsage.id, id));
      
      return { ...usage, count: 0, lastResetAt: now };
    }

    return usage;
  }

  async incrementUsage(id: string) {
    await db
      .update(guestUsage)
      .set({
        count: sql`${guestUsage.count} + 1`,
      })
      .where(eq(guestUsage.id, id));
  }

  async getOrCreateUser(ipAddress: string) {
    // get user
    const user = await db.query.guestUsage.findFirst({
      where: eq(guestUsage.ipAddress, ipAddress),
    });

    // if user not exists create 
    if (!user) {
      const [newUser] = await db
        .insert(guestUsage)
        .values({
          ipAddress,
          count: 0,
          lastResetAt: new Date(),
        })
        .returning();
      return newUser.id;
    }

    // return userid
    return user.id;
  }
}
