import { db } from '../db/index';
import { submissions } from '../db/schema';

import { eq } from 'drizzle-orm';

export type AssessmentStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export class SubmissionRepository {
  async getSubmissionById(id: string) {
    return await db.query.submissions.findFirst({
      where: eq(submissions.id, id),
    });
  }

  async getSubmissionForProcessing(id: string) {
    return await db.query.submissions.findFirst({
      where: eq(submissions.id, id),
      columns: {
        id: true,
        githubRepoUrl: true,
      },
    });
  }

  async getSubmissionDocsText(submissionId: string) {
    const result = await db.query.submissions.findFirst({
      where: eq(submissions.id, submissionId),
      with: {
        template: {
          columns: {
            assessmentText: true,
          },
        },
      },
    });
    return result?.template?.assessmentText;
  }

  async updateSubmissionStatus(id: string, status: AssessmentStatus) {
    return await db
      .update(submissions)
      .set({ status, updatedAt: new Date() })
      .where(eq(submissions.id, id));
  }

  async createSubmission(data: any | any[]) {
    const result = await db.insert(submissions).values(data).returning();
    return Array.isArray(data) ? result : result[0];
  }

  async finalizeSubmission(id: string, data: any) {
    const { fullReport, ...submissionUpdate } = data;

    return await db
      .update(submissions)
      .set({
        ...submissionUpdate,
        fullReport,
        updatedAt: new Date(),
      })
      .where(eq(submissions.id, id));
  }
}
