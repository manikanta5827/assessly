import { db } from '../db';
import { channels } from '../db/schema';
import { eq } from 'drizzle-orm';

export class ChannelRepository {
  async getAssessmentDocsUrlByChannelId(id: string) {
    const channel = await db.query.channels.findFirst({
      where: eq(channels.id, id),
      columns: {
        assessmentDocsUrl: true,
      },
    });
    if (!channel) {
      throw new Error('Channel not found');
    }
    return channel.assessmentDocsUrl;
  }
}
