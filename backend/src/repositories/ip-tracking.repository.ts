import { prisma } from '../db/prisma';

export class IpTrackingRepository {
  async getIpTrackingByHash(ipHash: string) {
    return prisma.ipTracking.findUnique({
      where: { ipHash },
    });
  }

  async incrementIpAssessmentCount(ipHash: string) {
    return prisma.ipTracking.upsert({
      where: { ipHash },
      update: { assessmentCount: { increment: 1 }, lastSeenAt: new Date() },
      create: { ipHash, assessmentCount: 1 },
    });
  }
}
