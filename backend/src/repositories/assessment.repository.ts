import { db } from '../db/index';
import {
  assessments,
  projectRequirements,
  codeQuality,
  runnability,
  aiAnalysis,
  commitAnalysis,
  finalReport,
  interviewQuestions,
} from '../db/schema';
import { eq } from 'drizzle-orm';

export type AssessmentStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export class AssessmentRepository {
  async getAssessmentByRepoUrl(repoUrl: string) {
    return await db.query.assessments.findFirst({
      where: eq(assessments.repoUrl, repoUrl),
    });
  }

  async getAssessmentById(id: string) {
    return await db.query.assessments.findFirst({
      where: eq(assessments.id, id),
      with: {
        requirements: true,
        codeQuality: true,
        runnability: true,
        aiAnalysis: true,
        commitAnalysis: true,
        finalReport: true,
        interviewQuestions: true,
      },
    });
  }

  async getAssessmentForProcessing(id: string) {
    return await db.query.assessments.findFirst({
      where: eq(assessments.id, id),
      columns: {
        id: true,
        repoUrl: true,
      },
    });
  }

  async getAssessmentDocsUrl(assessmentId: string) {
    const result = await db.query.assessments.findFirst({
      where: eq(assessments.id, assessmentId),
      with: {
        channel: {
          columns: {
            assessmentDocsUrl: true,
          },
        },
      },
    });
    return result?.channel?.assessmentDocsUrl;
  }


  async updateAssessmentStatus(id: string, status: AssessmentStatus) {
    return await db
      .update(assessments)
      .set({ status, updatedAt: new Date() })
      .where(eq(assessments.id, id));
  }

  async createAssessment(data: any | any[]) {
    const result = await db.insert(assessments).values(data).returning();
    return Array.isArray(data) ? result : result[0];
  }


  async updateAssessment(id: string, data: any) {
    const result = await db
      .update(assessments)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(assessments.id, id))
      .returning();
    return result[0];
  }

  async finalizeAssessment(id: string, data: any) {
    return await db.transaction(async (tx) => {
      const {
        requirements,
        codeQuality: codeQualityData,
        runnability: runnabilityData,
        aiAnalysis: aiAnalysisData,
        commitAnalysis: commitAnalysisData,
        finalReport: finalReportData,
        interviewQuestions: interviewQuestionsData,
        ...assessmentUpdate
      } = data;

      // 1. Update Assessment
      await tx
        .update(assessments)
        .set({ ...assessmentUpdate, updatedAt: new Date() })
        .where(eq(assessments.id, id));

      // 2. Insert Requirements
      if (requirements?.create) {
        await tx.insert(projectRequirements).values(
          requirements.create.map((req: any) => ({
            ...req,
            assessmentId: id,
          }))
        );
      }

      // 3. Insert Code Quality
      if (codeQualityData?.create) {
        await tx.insert(codeQuality).values({
          ...codeQualityData.create,
          assessmentId: id,
        });
      }

      // 4. Insert Runnability
      if (runnabilityData?.create) {
        await tx.insert(runnability).values({
          ...runnabilityData.create,
          assessmentId: id,
        });
      }

      // 5. Insert AI Analysis
      if (aiAnalysisData?.create) {
        await tx.insert(aiAnalysis).values({
          ...aiAnalysisData.create,
          assessmentId: id,
        });
      }

      // 6. Insert Commit Analysis
      if (commitAnalysisData?.create) {
        await tx.insert(commitAnalysis).values({
          ...commitAnalysisData.create,
          assessmentId: id,
        });
      }

      // 7. Insert Final Report
      if (finalReportData?.create) {
        await tx.insert(finalReport).values({
          ...finalReportData.create,
          assessmentId: id,
        });
      }

      // 8. Insert Interview Questions
      if (interviewQuestionsData?.create) {
        await tx.insert(interviewQuestions).values(
          interviewQuestionsData.create.map((iq: any) => ({
            ...iq,
            assessmentId: id,
          }))
        );
      }
    });
  }
}
