import { SQSEvent } from 'aws-lambda';
import { Prisma } from '@prisma/client';
import { AssessmentRepository } from '../repositories/assessment.repository';
import { GitHubService } from '../services/github.service';
import { LLMService } from '../services/llm.service';
import { S3Service } from '../services/s3.service';

const assessmentRepo = new AssessmentRepository();
const s3Service = new S3Service();

export const handler = async (event: SQSEvent) => {
  console.log('Processing event: ', event);
  for (const record of event.Records) {
    const { assessmentId } = JSON.parse(record.body);

    try {
      // 1. Fetch record
      const assessment = await assessmentRepo.getAssessmentForProcessing(assessmentId);

      if (!assessment) {
        console.error(`Assessment with ID ${assessmentId} not found`);
        continue;
      }

      // 2. Update status to PROCESSING
      console.log('Updating status to PROCESSING for assessmentId: ', assessmentId);
      await assessmentRepo.updateAssessmentStatus(assessmentId, 'PROCESSING');

      // 3. Initialize Services
      const github = new GitHubService(process.env.GITHUB_TOKEN);
      const llm = new LLMService('openai', process.env.OPENAI_API_KEY!, 'gpt-4o-mini');

      // 4. Process Repo
      const { owner, repo } = github.parseUrl(assessment.repoUrl);
      console.log(`Building context for ${owner}/${repo}...`);
      const [{ context, fileNames }, commitMessages] = await Promise.all([
        github.buildContext(owner, repo),
        github.getCommits(owner, repo),
      ]);
      console.log(`Context built. Length: ${context.length} characters.`);
      console.log(`Fetched ${commitMessages.length} commit messages.`);

      // 5. AI Analysis - Multi-stage Pipeline
      console.log(`Starting Multi-stage AI Analysis for assessmentId: ${assessmentId}...`);

      // STAGE 1: Parallel Analysis Calls
      const [
        reqResult,
        repoMapResult,
        commitResult,
        codeQualityResult,
        runnabilityResult,
        aiPatternsResult,
      ] = await Promise.all([
        llm.extractRequirements(assessment.requirementsText),
        llm.generateRepoMap(fileNames, context),
        llm.analyzeCommits(commitMessages),
        llm.analyzeCodeQuality(context),
        llm.analyzeRunnability(context),
        llm.analyzeAIPatterns(context),
      ]);

      // STAGE 2: Requirement Evaluation (Sequential - depends on extracted requirements)
      const requirementsEvalResult = await llm.evaluateRequirements(
        context,
        reqResult.requirements
      );

      // STAGE 3: Backend Scoring (Deterministic)
      const requirementsEval = requirementsEvalResult.evaluation;
      const totalRequirements = requirementsEval.length;
      const metRequirements = requirementsEval.filter((r: any) => r.status === 'MET').length;

      const requirementScore =
        totalRequirements > 0 ? (metRequirements / totalRequirements) * 100 : 0;

      const codeQualityScore = codeQualityResult.analysis.score || 0;
      const runnabilityScore = runnabilityResult.analysis.score || 0;

      const finalScore = requirementScore * 0.6 + codeQualityScore * 0.25 + runnabilityScore * 0.15;

      // STAGE 4: Final LLM Report
      const finalReportResult = await llm.generateFinalReport({
        requirementsEvaluation: requirementsEval,
        codeQuality: codeQualityResult.analysis,
        runnability: runnabilityResult.analysis,
        commitAnalysis: commitResult.analysis,
        aiAnalysis: aiPatternsResult.analysis,
        score: Math.round(finalScore),
      });

      // Aggregate Usage
      const results = [
        reqResult,
        repoMapResult,
        commitResult,
        codeQualityResult,
        runnabilityResult,
        aiPatternsResult,
        requirementsEvalResult,
        finalReportResult,
      ];

      const totalUsage = results.reduce(
        (acc, res) => ({
          inputTokens: acc.inputTokens + (res.usage?.inputTokens || 0),
          outputTokens: acc.outputTokens + (res.usage?.outputTokens || 0),
          totalTokens: acc.totalTokens + (res.usage?.totalTokens || 0),
          estimatedCost: acc.estimatedCost + (res.usage?.estimatedCost || 0),
        }),
        { inputTokens: 0, outputTokens: 0, totalTokens: 0, estimatedCost: 0 }
      );

      console.log('Analysis Done for assessmentId: ', assessmentId);

      // 6. Store Large Contexts in S3
      await Promise.all([
        s3Service.putObject(assessmentId, 'snapshot.txt', context, 'text/plain'),
        s3Service.putObject(assessmentId, 'repo-map.json', repoMapResult.repoMap || null, 'application/json'),
      ]);

      await assessmentRepo.updateAssessment(assessmentId, {
        status: 'COMPLETED',
        score: Math.round(finalScore),

        // Usage tracking (aggregated)
        inputTokens: totalUsage.inputTokens,
        outputTokens: totalUsage.outputTokens,
        totalTokens: totalUsage.totalTokens,
        estimatedCost: new Prisma.Decimal(totalUsage.estimatedCost),

        summary: finalReportResult.report.summary || '',
        requirementScore,
        codeQualityScore,
        runnabilityScore,
        aiAnalysisScore: aiPatternsResult.analysis.score,

        // Relational Nested Creates
        requirements: {
          create: reqResult.requirements.map((req: any) => {
            const evalMatch = requirementsEval.find((e: any) => e.id === req.id);
            return {
              requirementId: req.id || 'UNKNOWN',
              text: req.text || '',
              category: req.category || null,
              suggestedFiles: req.suggestedFiles || [],
              status: evalMatch ? evalMatch.status : 'PENDING',
              confidence: evalMatch ? evalMatch.confidence : 0,
              evidenceFile: evalMatch?.evidence?.file || null,
              evidenceSnippet: evalMatch?.evidence?.snippet || null,
              reasoning: evalMatch ? evalMatch.reasoning : null,
            };
          }),
        },
        codeQuality: {
          create: {
            score: codeQualityResult.analysis.score || 0,
            readability: codeQualityResult.analysis.breakdown?.readability || 0,
            structure: codeQualityResult.analysis.breakdown?.structure || 0,
            naming: codeQualityResult.analysis.breakdown?.naming || 0,
            bestPractices: codeQualityResult.analysis.breakdown?.bestPractices || 0,
            summary: codeQualityResult.analysis.summary || '',
            issues: codeQualityResult.analysis.issues || [],
          },
        },
        runnability: {
          create: {
            score: runnabilityResult.analysis.score || 0,
            hasDocker: runnabilityResult.analysis.hasDocker || false,
            hasEnvExample: runnabilityResult.analysis.hasEnvExample || false,
            hasScripts: runnabilityResult.analysis.hasScripts || false,
            ciDetected: runnabilityResult.analysis.ciDetected || false,
            summary: runnabilityResult.analysis.summary || '',
            issues: runnabilityResult.analysis.issues || [],
            hasTests: runnabilityResult.analysis.testDetection?.hasTests || false,
            testLanguage: runnabilityResult.analysis.testDetection?.language || null,
            testFramework: runnabilityResult.analysis.testDetection?.framework || null,
            testCommand: runnabilityResult.analysis.testDetection?.command || null,
            testPath: runnabilityResult.analysis.testDetection?.path || null,
            testReason: runnabilityResult.analysis.testDetection?.reason || null,
          },
        },
        aiAnalysis: {
          create: {
            score: aiPatternsResult.analysis.score || 0,
            confidence: aiPatternsResult.analysis.confidence || 0,
            uniformStyle: aiPatternsResult.analysis.signals?.uniformStyle || false,
            lowIterationEvidence: aiPatternsResult.analysis.signals?.lowIterationEvidence || false,
            genericPatterns: aiPatternsResult.analysis.signals?.genericPatterns || false,
            summary: aiPatternsResult.analysis.summary || '',
            reasoning: aiPatternsResult.analysis.reasoning || '',
          },
        },
        commitAnalysis: {
          create: {
            qualityScore: commitResult.analysis.qualityScore || 0,
            pattern: commitResult.analysis.pattern || 'UNKNOWN',
            summary: commitResult.analysis.summary || '',
            reasoning: commitResult.analysis.reasoning || '',
          },
        },
        finalReport: {
          create: {
            score: Math.round(finalScore) || 0,
            summary: finalReportResult.report.summary || '',
            strengths: finalReportResult.report.strengths || [],
            weaknesses: finalReportResult.report.weaknesses || [],
            hiringRecommendation: finalReportResult.report.hiringRecommendation || 'UNKNOWN',
          },
        },
        interviewQuestions: {
          create: (finalReportResult.report.interviewQuestions || []).map((iq: any) => ({
            question: iq.question || '',
            focusArea: iq.focusArea || '',
          })),
        },
      });

      console.log(`Assessment ${assessmentId} COMPLETED`);
    } catch (error: unknown) {
      console.error(`Processing Error for Assessment ${assessmentId}:`, error);

      // Update status to FAILED
      await assessmentRepo
        .updateAssessmentStatus(assessmentId, 'FAILED')
        .catch((e: unknown) => console.error('Could not set status to FAILED', e));
    }
  }
};
