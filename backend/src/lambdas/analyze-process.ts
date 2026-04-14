import { SQSEvent } from 'aws-lambda';
import { Prisma } from '@prisma/client';
import { prisma } from '../db/prisma';
import { GitHubService } from '../services/github.service';
import { LLMService } from '../services/llm.service';

export const handler = async (event: SQSEvent) => {
  console.log('Processing event: ', event);
  for (const record of event.Records) {
    const { assessmentId } = JSON.parse(record.body);

    try {
      // 1. Fetch record
      const assessment = await prisma.assessment.findUnique({
        where: { id: assessmentId },
      });

      if (!assessment) {
        console.error(`Assessment with ID ${assessmentId} not found`);
        continue;
      }

      // 2. Update status to PROCESSING
      console.log('Updating status to PROCESSING for assessmentId: ', assessmentId);
      await prisma.assessment.update({
        where: { id: assessmentId },
        data: { status: 'PROCESSING' },
      });

      // 3. Initialize Services
      const github = new GitHubService(process.env.GITHUB_TOKEN);
      const llm = new LLMService('openai', process.env.OPENAI_API_KEY!, "gpt-4o-mini");

      // 4. Process Repo
      const { owner, repo } = github.parseUrl(assessment.repoUrl);
      console.log(`Building context for ${owner}/${repo}...`);
      const context = await github.buildContext(owner, repo);
      console.log(`Context built. Length: ${context.length} characters.`);

      // 5. AI Analysis
      console.log(`Starting AI Analysis for assessmentId: ${assessmentId}...`);
      const { analysis, usage } = await llm.analyzeAssessment(context, assessment.requirementsText);

      console.log('Analysis Done for assessmentId: ', assessmentId);
      await prisma.assessment.update({
        where: { id: assessmentId },
        data: {
          status: 'COMPLETED',
          score: analysis.score,

          // Usage tracking
          inputTokens: usage?.inputTokens,
          outputTokens: usage?.outputTokens,
          totalTokens: usage?.totalTokens,
          estimatedCost: usage?.estimatedCost ? new Prisma.Decimal(usage.estimatedCost) : null,

          // New improved fields
          aiUsageDetection: analysis.aiUsageDetection,

          summary: {
            goods: analysis.goods || [],
            bads: analysis.bads || [],
          },

          interviewQuestions: analysis.interviewQuestions || [],

          testDetection: {
            hasTests: analysis.testDetection?.hasTests || false,
            language: analysis.testDetection?.language || null,
            framework: analysis.testDetection?.framework || 'unknown',
            command: analysis.testDetection?.command || null,
            path: analysis.testDetection?.path || null,
            reason: analysis.testDetection?.reason || '',
          },

          repoMap: analysis.repoMap || null,
        },
      });

      console.log(`Assessment ${assessmentId} COMPLETED`);
    } catch (error: unknown) {
      console.error(`Processing Error for Assessment ${assessmentId}:`, error);

      // Update status to FAILED
      await prisma.assessment
        .update({
          where: { id: assessmentId },
          data: { status: 'FAILED' },
        })
        .catch((e: unknown) => console.error('Could not set status to FAILED', e));
    }
  }
};
