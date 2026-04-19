import { SQSEvent } from 'aws-lambda';
import { SubmissionRepository } from '../repositories/submission.repository';
import { GitHubService } from '../services/github.service';
import { LLMService } from '../services/llm.service';
import { S3Service } from '../services/s3.service';

const submissionRepo = new SubmissionRepository();
const s3Service = new S3Service();

export const handler = async (event: SQSEvent) => {
  console.log('Processing event: ', event);
  for (const record of event.Records) {
    const { submissionId } = JSON.parse(record.body); // Updated from assessmentId in SQS if possible, or mapped below

    try {
      // 1. Fetch record
      const submission = await submissionRepo.getSubmissionForProcessing(submissionId);

      if (!submission) {
        console.error(`Submission with ID ${submissionId} not found`);
        continue;
      }

      // 2. Update status to PROCESSING
      console.log('Updating status to PROCESSING for submissionId: ', submissionId);
      await submissionRepo.updateSubmissionStatus(submissionId, 'PROCESSING');

      // 3. Initialize Services
      const github = new GitHubService(process.env.GITHUB_TOKEN);
      const llm = new LLMService('openai', process.env.OPENAI_API_KEY!, 'gpt-4o-mini');

      // 4. Process Repo
      const { owner, repo } = github.parseUrl(submission.githubRepoUrl);
      console.log(`Building context for ${owner}/${repo}...`);

      const [{ context, fileNames }, commitMessages] = await Promise.all([
        github.buildContext(owner, repo),
        github.getCommits(owner, repo),
      ]);
      
      console.log(`Context built. Length: ${context.length} characters.`);
      console.log(`Fetched ${commitMessages.length} commit messages.`);

      // 5. AI Analysis - Multi-stage Pipeline
      console.log(`Starting Multi-stage AI Analysis for submissionId: ${submissionId}...`);

      // get requirements text from db
      const requirementDocsText = await submissionRepo.getSubmissionDocsText(submissionId);

      if (!requirementDocsText) {
        throw new Error(`No requirement text found for submission ${submissionId}`);
      }

      // STAGE 1: Parallel Analysis Calls
      const [
        reqResult,
        repoMapResult,
        commitResult,
        codeQualityResult,
        runnabilityResult,
        aiPatternsResult,
      ] = await Promise.all([
        llm.extractRequirements(requirementDocsText),
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

      console.log('Analysis Done for submissionId: ', submissionId);

      // 6. Store Large Contexts in S3
      const snapshotKey = `assessmentSnapshots/${submissionId}/snapshot.txt`;
      const repoMapKey = `assessmentRepoMaps/${submissionId}/repo-map.json`;
      await Promise.all([
        s3Service.putObject(snapshotKey, context, 'text/plain'),
        s3Service.putObject(repoMapKey, repoMapResult.repoMap || null, 'application/json'),
      ]);

      await submissionRepo.finalizeSubmission(submissionId, {
        status: 'COMPLETED',
        score: Math.round(finalScore),

        // Usage tracking (aggregated)
        inputTokens: totalUsage.inputTokens,
        outputTokens: totalUsage.outputTokens,
        totalTokens: totalUsage.totalTokens,
        estimatedCost: totalUsage.estimatedCost.toFixed(6),

        summary: finalReportResult.report.summary || '',
        requirementScore,
        codeQualityScore,
        runnabilityScore,
        aiAnalysisScore: aiPatternsResult.analysis.score,

        fullReport: {
          requirements: reqResult.requirements.map((req: any) => {
            const evalMatch = requirementsEval.find((e: any) => e.id === req.id);
            return {
              text: req.text || '',
              category: req.category || null,
              status: evalMatch ? evalMatch.status : 'PENDING',
              evidence: evalMatch?.evidence || null,
              reasoning: evalMatch ? evalMatch.reasoning : null,
            };
          }),
          codeQuality: {
            score: codeQualityResult.analysis.score || 0,
            breakdown: codeQualityResult.analysis.breakdown || {},
            summary: codeQualityResult.analysis.summary || '',
            issues: codeQualityResult.analysis.issues || [],
          },
          runnability: {
            score: runnabilityResult.analysis.score || 0,
            hasDocker: runnabilityResult.analysis.hasDocker || false,
            hasEnvExample: runnabilityResult.analysis.hasEnvExample || false,
            hasScripts: runnabilityResult.analysis.hasScripts || false,
            ciDetected: runnabilityResult.analysis.ciDetected || false,
            summary: runnabilityResult.analysis.summary || '',
            issues: runnabilityResult.analysis.issues || [],
            testDetection: runnabilityResult.analysis.testDetection || {},
          },
          aiAnalysis: {
            score: aiPatternsResult.analysis.score || 0,
            confidence: aiPatternsResult.analysis.confidence || 0,
            summary: aiPatternsResult.analysis.summary || '',
          },
          commitAnalysis: {
            qualityScore: commitResult.analysis.qualityScore || 0,
            pattern: commitResult.analysis.pattern || 'UNKNOWN',
            summary: commitResult.analysis.summary || '',
          },
          finalReport: {
            score: Math.round(finalScore) || 0,
            summary: finalReportResult.report.summary || '',
            strengths: finalReportResult.report.strengths || [],
            weaknesses: finalReportResult.report.weaknesses || [],
            hiringRecommendation: finalReportResult.report.hiringRecommendation || 'UNKNOWN',
          },
          interviewQuestions: (finalReportResult.report.interviewQuestions || []).map(
            (iq: any) => ({
              question: iq.question || '',
              focusArea: iq.focusArea || '',
            })
          ),
        },
      });

      await submissionRepo.updateSubmissionStatus(submissionId, 'COMPLETED');
      console.log(`Submission ${submissionId} COMPLETED`);
    } catch (error: unknown) {
      console.error(`Processing Error for Submission ${submissionId}:`, error);

      // Update status to FAILED
      await submissionRepo
        .updateSubmissionStatus(submissionId, 'FAILED')
        .catch((e: unknown) => console.error('Could not set status to FAILED', e));
    }
  }
};
