import { db } from '../db';
import { assessmentTemplates } from '../db/schema';
import { eq } from 'drizzle-orm';

export class AssessmentTemplateRepository {
  async getAssessmentDocsTextByTemplateId(id: string) {
    const template = await db.query.assessmentTemplates.findFirst({
      where: eq(assessmentTemplates.id, id),
      columns: {
        assessmentText: true,
      },
    });
    if (!template) {
      throw new Error('Assessment Template not found');
    }
    return template.assessmentText;
  }

  async createAssessmentTemplate(assessmentText: string, createdBy: string, title?: string) {
    const [template] = await db
      .insert(assessmentTemplates)
      .values({
        assessmentText,
        createdBy,
        title: title || 'Untitled Assessment',
      })
      .returning();

    if (!template) {
      throw new Error('Failed to create assessment template');
    }

    return template;
  }
}

