import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { SubmissionRepository } from '../repositories/submission.repository';
const submissionRepo = new SubmissionRepository();

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  console.log(`processing get submission`);

  if (event.httpMethod === 'OPTIONS') {
    return response(200, {});
  }

  const id = event.queryStringParameters?.id;

  if (!id) {
    return response(400, { error: 'Missing submission ID' });
  }

  try {
    console.time('db');
    const submission = await submissionRepo.getSubmissionById(id);
    console.timeEnd('db');

    if (!submission) {
      return response(404, { error: 'Submission not found' });
    }

    return response(200, {
      submissionId: submission.id,
      githubRepoUrl: submission.githubRepoUrl,
      status: submission.status,
      score: submission.score ?? 0,
      summary: submission.summary ?? '',
      requirementsEvaluation: (submission.fullReport as any)?.requirements || [],

      codeQuality: (submission.fullReport as any)?.codeQuality,
      runnability: (submission.fullReport as any)?.runnability,
      aiAnalysis: (submission.fullReport as any)?.aiAnalysis,
      commitAnalysis: (submission.fullReport as any)?.commitAnalysis,

      requirementScore: submission.requirementScore ?? 0,
      codeQualityScore: submission.codeQualityScore ?? 0,
      runnabilityScore: submission.runnabilityScore ?? 0,
      aiAnalysisScore: submission.aiAnalysisScore ?? 0,

      finalReport: (submission.fullReport as any)?.finalReport,
      interviewQuestions: (submission.fullReport as any)?.interviewQuestions || [],

      testDetection: (submission.fullReport as any)?.runnability?.testDetection || {
        hasTests: false,
      },

      testExecuted: submission.testExecuted,
      testResults: submission.testResults,

      inputTokens: submission.inputTokens,
      outputTokens: submission.outputTokens,
      totalTokens: submission.totalTokens,
      estimatedCost: submission.estimatedCost,
      
      createdAt: submission.createdAt,
      updatedAt: submission.updatedAt,
    });
  } catch (error: unknown) {
    console.error('Get Assessment Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal Server Error';
    return response(500, { error: errorMessage });
  }
};

function response(statusCode: number, body: any): APIGatewayProxyResult {
  return {
    statusCode,
    body: JSON.stringify(body),
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'application/json',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  };
}
