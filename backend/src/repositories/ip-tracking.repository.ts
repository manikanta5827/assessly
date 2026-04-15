import { db } from '../db/index';
import { ipTracking } from '../db/schema';
import { eq, sql } from 'drizzle-orm';

export class IpTrackingRepository {
  async getIpTrackingByHash(ipHash: string) {
    return await db.query.ipTracking.findFirst({
      where: eq(ipTracking.ipHash, ipHash),
    });
  }

  async incrementIpAssessmentCount(ipHash: string) {
    return await db
      .insert(ipTracking)
      .values({
        ipHash,
        assessmentCount: 1,
        lastSeenAt: new Date(),
      })
      .onConflictDoUpdate({
        target: ipTracking.ipHash,
        set: {
          assessmentCount: sql`${ipTracking.assessmentCount} + 1`,
          lastSeenAt: new Date(),
        },
      });
  }
}
