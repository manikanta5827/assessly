import { Prisma, AssessmentStatus } from '@prisma/client';
import { prisma } from '../db/prisma';

export class AssessmentRepository {
  async getAssessmentById(id: string) {
    return prisma.assessment.findUnique({
      where: { id },
    });
  }

  async updateAssessmentStatus(id: string, status: AssessmentStatus) {
    return prisma.assessment.update({
      where: { id },
      data: { status },
    });
  }

  async createAssessment(data: Prisma.AssessmentCreateInput | Prisma.AssessmentUncheckedCreateInput) {
    return prisma.assessment.create({
      data,
    });
  }

  async updateAssessment(id: string, data: Prisma.AssessmentUpdateInput | Prisma.AssessmentUncheckedUpdateInput) {
    return prisma.assessment.update({
      where: { id },
      data,
    });
  }
}
