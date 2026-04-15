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
      const [{ context, fileNames }, commitMessages] = await Promise.all([
        github.buildContext(owner, repo),
        github.getCommits(owner, repo),
      ]);
      console.log(`Context built. Length: ${context.length} characters.`);
      console.log(`Fetched ${commitMessages.length} commit messages.`);

      // 5. AI Analysis - Multi-stage
      console.log(`Starting Multi-stage AI Analysis for assessmentId: ${assessmentId}...`);
      
      // Stage 1: Parallel calls for requirements, repo map, and commit analysis
      const [reqResult, repoMapResult, commitResult] = await Promise.all([
        llm.extractRequirements(assessment.requirementsText),
        llm.generateRepoMap(fileNames, context),
        llm.analyzeCommits(commitMessages),
      ]);

      // Stage 2: Main assessment call
      const { analysis, usage: mainUsage } = await llm.analyzeAssessment(
        context,
        assessment.requirementsText,
        reqResult.requirements
      );

      // Aggregate Usage
      const totalUsage = {
        inputTokens:
          (reqResult.usage?.inputTokens || 0) +
          (repoMapResult.usage?.inputTokens || 0) +
          (commitResult.usage?.inputTokens || 0) +
          (mainUsage?.inputTokens || 0),
        outputTokens:
          (reqResult.usage?.outputTokens || 0) +
          (repoMapResult.usage?.outputTokens || 0) +
          (commitResult.usage?.outputTokens || 0) +
          (mainUsage?.outputTokens || 0),
        totalTokens:
          (reqResult.usage?.totalTokens || 0) +
          (repoMapResult.usage?.totalTokens || 0) +
          (commitResult.usage?.totalTokens || 0) +
          (mainUsage?.totalTokens || 0),
        estimatedCost:
          (reqResult.usage?.estimatedCost || 0) +
          (repoMapResult.usage?.estimatedCost || 0) +
          (commitResult.usage?.estimatedCost || 0) +
          (mainUsage?.estimatedCost || 0),
      };

      console.log('Analysis Done for assessmentId: ', assessmentId);
      await prisma.assessment.update({
        where: { id: assessmentId },
        data: {
          status: 'COMPLETED',
          score: analysis.score,

          // Usage tracking (aggregated)
          inputTokens: totalUsage.inputTokens,
          outputTokens: totalUsage.outputTokens,
          totalTokens: totalUsage.totalTokens,
          estimatedCost: new Prisma.Decimal(totalUsage.estimatedCost),

          // New improved fields
          aiUsageDetection: analysis.aiUsageDetection,
          summary: analysis.summary || '',
          requirements: reqResult.requirements || [],
          requirementsEvaluation: analysis.requirementsEvaluation || [],
          repoSnapshot: context, 
          
          interviewQuestions: analysis.interviewQuestions || [],

          testDetection: {
            hasTests: analysis.testDetection?.hasTests || false,
            language: analysis.testDetection?.language || null,
            framework: analysis.testDetection?.framework || 'unknown',
            command: analysis.testDetection?.command || null,
            path: analysis.testDetection?.path || null,
            reason: analysis.testDetection?.reason || '',
          },

          repoMap: repoMapResult.repoMap || null,
          commitAnalysis: commitResult.analysis || null,
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
